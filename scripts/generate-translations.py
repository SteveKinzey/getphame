#!/usr/bin/env python3
"""Generate landing page translations for all non-English locales using the built-in LLM."""
import json, os, sys
from openai import OpenAI

client = OpenAI()

LOCALES = {
    "th": "Thai",
    "zh-CN": "Simplified Chinese",
    "fr": "French",
    "es": "Spanish",
    "it": "Italian",
}

# Keys that need translation (new keys added to English)
SECTIONS_TO_TRANSLATE = [
    "hero", "features", "howItWorks", "testimonials", "faq", "bottomCta", "trust"
]

def translate_section(section_key: str, en_data: dict, lang_code: str, lang_name: str, existing: dict) -> dict:
    """Translate a section's new/missing keys into the target language."""
    # Find keys missing from existing translation
    missing = {}
    for k, v in en_data.items():
        if k not in existing:
            missing[k] = v
        elif isinstance(v, dict):
            sub_missing = {sk: sv for sk, sv in v.items() if sk not in existing.get(k, {})}
            if sub_missing:
                missing[k] = sub_missing

    if not missing:
        return existing

    prompt = f"""Translate the following JSON values from English to {lang_name}.
Keep all JSON keys exactly as-is. Only translate the string values.
Preserve any special characters, em-dashes, and punctuation style appropriate for {lang_name}.
For brand names like "Get Phame", "Gmail", "Outlook", "WooCommerce", "Google", "Yelp", "TripAdvisor", "SMTP", "AES-256" — keep them in English.
Return ONLY valid JSON, no explanation.

Input JSON:
{json.dumps(missing, ensure_ascii=False, indent=2)}"""

    resp = client.chat.completions.create(
        model="gpt-5-mini",
        messages=[{"role": "user", "content": prompt}],
        response_format={"type": "json_object"},
        temperature=0.3,
    )
    translated = json.loads(resp.choices[0].message.content)

    # Merge translated keys into existing
    result = dict(existing)
    for k, v in translated.items():
        if isinstance(v, dict) and k in result and isinstance(result[k], dict):
            result[k] = {**result[k], **v}
        else:
            result[k] = v
    return result


def main():
    en_path = '/home/ubuntu/getphame/client/public/locales/en/translation.json'
    en_data = json.load(open(en_path))

    for lang_code, lang_name in LOCALES.items():
        print(f"\n=== Translating to {lang_name} ({lang_code}) ===")
        locale_path = f'/home/ubuntu/getphame/client/public/locales/{lang_code}/translation.json'
        locale_data = json.load(open(locale_path))

        for section in SECTIONS_TO_TRANSLATE:
            if section not in en_data:
                continue
            existing_section = locale_data.get(section, {})
            print(f"  {section}...", end=" ", flush=True)
            updated_section = translate_section(
                section,
                en_data[section],
                lang_code,
                lang_name,
                existing_section
            )
            locale_data[section] = updated_section
            print("done")

        with open(locale_path, 'w', encoding='utf-8') as f:
            json.dump(locale_data, f, ensure_ascii=False, indent=2)
        print(f"  Saved {locale_path}")

    print("\nAll translations complete!")

if __name__ == "__main__":
    main()
