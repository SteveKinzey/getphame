/**
 * IntegrationGuide
 *
 * Shows the two Phame API endpoints and step-by-step instructions
 * for each supported WordPress form builder:
 *   - Elementor Forms
 *   - Gravity Forms
 *   - WS Form
 *   - Fluent Forms
 *
 * Also shows a generic HTML/JS snippet for any custom form.
 */

import { useState } from "react";
import { Copy, ChevronDown, ChevronUp, Zap, Users } from "lucide-react";
import { toast } from "sonner";

const BASE_URL = "https://getphame.app";

type FormBuilder = "elementor" | "gravity" | "wsform" | "fluent" | "custom";

interface Props {
  /** Pass the user's first active key if available so snippets are pre-filled */
  apiKeyRaw?: string;
  showSnippet: boolean;
  setShowSnippet: (v: boolean) => void;
}

function CodeBlock({ code, label }: { code: string; label?: string }) {
  return (
    <div className="relative mt-2">
      {label && (
        <p className="text-xs font-bold mb-1" style={{ color: "oklch(0.35 0.04 260)", fontWeight: "bold" }}>
          {label}
        </p>
      )}
      <pre
        className="text-xs rounded-xl p-3 overflow-x-auto"
        style={{
          background: "oklch(0.18 0.06 260)",
          color: "oklch(0.95 0.02 260)",
          fontSize: "13px",
          whiteSpace: "pre-wrap",
          wordBreak: "break-all",
          fontFamily: "monospace",
        }}
      >
        {code}
      </pre>
      <button
        onClick={() => {
          navigator.clipboard.writeText(code);
          toast.success("Copied!");
        }}
        className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold"
        style={{ background: "oklch(0.30 0.08 260)", color: "oklch(0.80 0.18 80)" }}
      >
        <Copy size={11} /> Copy
      </button>
    </div>
  );
}

const FORM_BUILDERS: { id: FormBuilder; label: string; icon: string }[] = [
  { id: "elementor", label: "Elementor", icon: "⚡" },
  { id: "gravity", label: "Gravity Forms", icon: "🪐" },
  { id: "wsform", label: "WS Form", icon: "🔷" },
  { id: "fluent", label: "Fluent Forms", icon: "🌊" },
  { id: "custom", label: "Custom / HTML", icon: "💻" },
];

export function IntegrationGuide({ apiKeyRaw, showSnippet, setShowSnippet }: Props) {
  const [activeBuilder, setActiveBuilder] = useState<FormBuilder>("elementor");
  const key = apiKeyRaw ?? "rl_YOUR_API_KEY_HERE";

  // ── Snippets ────────────────────────────────────────────────────────────────

  const contactsEndpoint = `${BASE_URL}/api/public/contacts`;
  const sendEndpoint = `${BASE_URL}/api/public/send`;

  const elementorSteps = `ELEMENTOR FORMS — Step-by-step

1. Edit your page in Elementor.
2. Add a "Form" widget. Include fields:
   - Name  (ID: name)
   - Email (ID: email)
3. In the Form widget → Actions After Submit → Add Action → "Webhook"
4. Set Webhook URL to:
   ${sendEndpoint}
5. Under "Advanced" → Custom Headers, add:
   Authorization: Bearer ${key}
   Content-Type: application/json
6. Map fields:
   customerName  → {field_id="name"}
   customerEmail → {field_id="email"}
7. Save & publish. Test with a real submission.

Note: Elementor Pro 3.5+ is required for the Webhook action.`;

  const gravitySteps = `GRAVITY FORMS — Step-by-step

1. Create or edit a form. Add fields:
   - Name  (Admin Label: name)
   - Email (Admin Label: email)
2. Go to Form Settings → Notifications → Add New.
3. Set "Send To" → "Select a Field" → Email field.
4. Instead of email notification, use the "Webhooks" add-on:
   - Install: Gravity Forms Webhooks add-on (free).
   - Go to Form Settings → Webhooks → Add New.
5. Set:
   Request URL:    ${sendEndpoint}
   Request Method: POST
   Request Format: JSON
6. Add Request Headers:
   Authorization   Bearer ${key}
7. Add Body Fields:
   customerName  → Name field
   customerEmail → Email field
8. Save. Test with a form submission.`;

  const wsformSteps = `WS FORM — Step-by-step

1. Edit your WS Form form. Add fields:
   - Text field  (Variable: name)
   - Email field (Variable: email)
2. Go to the form's Action tab → Add Action → "API".
3. Set:
   URL:    ${sendEndpoint}
   Method: POST
4. Under Headers, add:
   Authorization: Bearer ${key}
   Content-Type: application/json
5. Under Body (JSON), map:
   {
     "customerName":  "#wsf-field-name",
     "customerEmail": "#wsf-field-email"
   }
6. Save and test.`;

  const fluentSteps = `FLUENT FORMS — Step-by-step

1. Edit your Fluent Form. Add fields:
   - Name  (Field Name: name)
   - Email (Field Name: email)
2. Go to Settings → Integrations → Add New Integration → "Webhook".
3. Set:
   Webhook URL:    ${sendEndpoint}
   Request Method: POST
   Request Format: JSON
4. Under Request Headers, add:
   Authorization: Bearer ${key}
5. Under Body Fields, map:
   customerName  → {inputs.name}
   customerEmail → {inputs.email}
6. Save and test with a form submission.`;

  const customSnippet = `<!-- Custom HTML Form — paste into any page or post -->
<form id="rl-review-form">
  <input name="customerName"  placeholder="Customer name"  required />
  <input name="customerEmail" type="email" placeholder="Email" required />
  <button type="submit">Submit</button>
</form>

<script>
document.getElementById('rl-review-form').addEventListener('submit', async function(e) {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.target));
  const res = await fetch('${sendEndpoint}', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ${key}'
    },
    body: JSON.stringify(data)
  });
  const json = await res.json();
  if (json.success) {
    alert('Review request sent!');
    e.target.reset();
  } else {
    alert('Error: ' + json.error);
  }
});
</script>`;

  const snippetMap: Record<FormBuilder, string> = {
    elementor: elementorSteps,
    gravity: gravitySteps,
    wsform: wsformSteps,
    fluent: fluentSteps,
    custom: customSnippet,
  };

  return (
    <div
      className="mt-4 rounded-xl p-3 space-y-3"
      style={{ border: "1px solid oklch(0.90 0.02 260)", background: "oklch(0.97 0.01 260)" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold rr-text-navy">WordPress Form Integration</p>
        <button
          onClick={() => setShowSnippet(!showSnippet)}
          className="text-sm px-2 py-1 rounded-lg font-bold flex items-center gap-1"
          style={{ background: "oklch(0.92 0.02 260)", color: "oklch(0.40 0.06 260)" }}
        >
          {showSnippet ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
          {showSnippet ? "Hide guide" : "Show guide"}
        </button>
      </div>

      {/* Two endpoint pills */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2 rounded-lg px-2.5 py-1.5" style={{ background: "oklch(0.93 0.03 145)" }}>
          <Zap size={12} style={{ color: "oklch(0.25 0.10 145)" }} />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold" style={{ color: "oklch(0.20 0.08 145)" }}>Send immediately</p>
            <code className="text-xs break-all" style={{ color: "oklch(0.35 0.10 145)", fontFamily: "monospace" }}>
              POST /api/public/send
            </code>
          </div>
          <button
            onClick={() => { navigator.clipboard.writeText(sendEndpoint); toast.success("Copied!"); }}
            className="shrink-0 p-1 rounded"
            style={{ background: "oklch(0.80 0.10 145)" }}
          >
            <Copy size={11} style={{ color: "oklch(0.20 0.08 145)" }} />
          </button>
        </div>
        <div className="flex items-center gap-2 rounded-lg px-2.5 py-1.5" style={{ background: "oklch(0.93 0.03 260)" }}>
          <Users size={12} style={{ color: "oklch(0.25 0.06 260)" }} />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold" style={{ color: "oklch(0.20 0.06 260)" }}>Import contact only</p>
            <code className="text-xs break-all" style={{ color: "oklch(0.25 0.06 260)", fontFamily: "monospace" }}>
              POST /api/public/contacts
            </code>
          </div>
          <button
            onClick={() => { navigator.clipboard.writeText(contactsEndpoint); toast.success("Copied!"); }}
            className="shrink-0 p-1 rounded"
            style={{ background: "oklch(0.80 0.06 260)" }}
          >
            <Copy size={11} style={{ color: "oklch(0.20 0.06 260)" }} />
          </button>
        </div>
      </div>

      <p className="text-sm font-semibold rr-text-navy-mid leading-relaxed">
        Use <strong>/send</strong> to trigger the review email immediately when a form is submitted.
        Use <strong>/contacts</strong> to import the customer first and send manually later.
        Both require <code style={{ fontFamily: "monospace" }}>Authorization: Bearer rl_...</code> header.
      </p>

      {/* Form builder guide */}
      {showSnippet && (
        <div className="space-y-3">
          {/* Tab selector */}
          <div className="flex flex-wrap gap-1.5">
            {FORM_BUILDERS.map((fb) => (
              <button
                key={fb.id}
                onClick={() => setActiveBuilder(fb.id)}
                className="text-xs px-2.5 py-1 rounded-lg font-bold transition-colors"
                style={{
                  background: activeBuilder === fb.id ? "oklch(0.22 0.09 260)" : "oklch(0.90 0.02 260)",
                  color: activeBuilder === fb.id ? "oklch(0.15 0.05 260)" : "oklch(0.85 0.02 260)",
                }}
              >
                {fb.icon} {fb.label}
              </button>
            ))}
          </div>

          {/* Active builder snippet */}
          <CodeBlock code={snippetMap[activeBuilder]} />

          {/* Required fields reference */}
          <div className="rounded-xl p-3 space-y-1" style={{ background: "oklch(0.22 0.09 260)" }}>
            <p className="text-xs font-bold" style={{ color: "oklch(0.80 0.18 80)" }}>Required body fields</p>
            <table className="w-full text-xs" style={{ color: "oklch(0.95 0.02 260)", fontFamily: "monospace" }}>
              <tbody>
                <tr>
                  <td className="pr-3 py-0.5 font-bold">customerName</td>
                  <td>string — customer's full name</td>
                </tr>
                <tr>
                  <td className="pr-3 py-0.5 font-bold">customerEmail</td>
                  <td>string — valid email address</td>
                </tr>
                <tr>
                  <td className="pr-3 py-0.5" style={{ color: "oklch(0.35 0.04 260)", fontWeight: "bold" }}>templateId</td>
                  <td style={{ color: "oklch(0.35 0.04 260)", fontWeight: "bold" }}>number (optional) — defaults to your default template</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Success / error response reference */}
          <div className="rounded-xl p-3 space-y-1" style={{ background: "oklch(0.22 0.09 260)" }}>
            <p className="text-xs font-bold" style={{ color: "oklch(0.80 0.18 80)" }}>Response format</p>
            <CodeBlock
              code={`// Success (200)
{ "success": true, "requestId": 42 }

// Error (400 / 401 / 429 / 500)
{ "error": "reason..." }`}
            />
          </div>
        </div>
      )}
    </div>
  );
}
