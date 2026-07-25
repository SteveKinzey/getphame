import fs from "node:fs";
import path from "node:path";

const localeRoot = path.resolve("client/public/locales");
const sourceLocale = "en";
const targetLocales = ["es", "fr", "it", "th", "zh-CN", "zh-TW"];

const english = JSON.parse(fs.readFileSync(path.join(localeRoot, sourceLocale, "translation.json"), "utf8"));
const audit = JSON.parse(fs.readFileSync("targeted-locale-audit.json", "utf8"));

function getNestedValue(obj, path) {
  return path.split('.').reduce((acc, part) => acc && acc[part], obj);
}

function setNestedValue(obj, path, value) {
  const parts = path.split('.');
  const last = parts.pop();
  let current = obj;
  for (const part of parts) {
    if (!current[part]) current[part] = {};
    current = current[part];
  }
  current[last] = value;
}

async function translate() {
  for (const locale of targetLocales) {
    const missingKeys = audit[locale].missing;
    if (missingKeys.length === 0) continue;

    console.log(`Translating ${missingKeys.length} keys for ${locale}...`);
    
    const sourceTexts = {};
    for (const key of missingKeys) {
      sourceTexts[key] = getNestedValue(english, key);
    }

    const prompt = `Translate the following JSON object into ${locale}. Keep the exact same JSON structure and keys. Only translate the values. Ensure the translation is natural and professional for a SaaS application.

${JSON.stringify(sourceTexts, null, 2)}`;

    const response = await fetch(process.env.OPENAI_API_BASE + "/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-5-mini",
        messages: [
          { role: "system", content: "You are a professional translator for a SaaS application. Output ONLY valid JSON." },
          { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" }
      })
    });

    const data = await response.json();
    const translatedTexts = JSON.parse(data.choices[0].message.content);

    const targetPath = path.join(localeRoot, locale, "translation.json");
    const targetObj = JSON.parse(fs.readFileSync(targetPath, "utf8"));

    for (const key of missingKeys) {
      if (translatedTexts[key]) {
        setNestedValue(targetObj, key, translatedTexts[key]);
      }
    }

    fs.writeFileSync(targetPath, JSON.stringify(targetObj, null, 2));
    console.log(`Updated ${locale}`);
  }
}

translate().catch(console.error);
