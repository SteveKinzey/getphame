# Form-Builder Webhook Research

Checked on **2026-07-22** for the Get Phame Developer Integrations guide.

| Builder | Verified capability | Official source |
|---|---|---|
| Gravity Forms | The Webhooks Add-On uses per-form feeds, supports a request URL, JSON POST requests, selected-field mappings, merge tags, and request headers. For JSON with POST or PUT, the add-on sets `Content-Type: application/json` automatically. | [Triggering Webhooks on Form Submissions](https://docs.gravityforms.com/triggering-webhooks-form-submissions/) |
| WS Form | The Webhook action supports POST and JSON, field mappings, custom key/value mappings, header mappings, response-code handling, SSL verification, and request debugging. | [Webhook Action](https://wsform.com/knowledgebase/webhook/) |
| Fluent Forms | The Pro Webhooks module supports POST, JSON or form request formats, request headers, mapped request bodies, and conditional logic. | [How to Integrate Webhook with Fluent Forms](https://fluentforms.com/docs/how-to-integrate-webhook-with-fluent-forms/) |
| Elementor Forms | Elementor Pro includes a Webhook action and a Forms API for custom server-side actions. Its official custom-action example uses `elementor_pro/forms/new_record` and `wp_remote_post`, which provides a server-side route when protected headers are required. | [Elementor Form Actions](https://developers.elementor.com/docs/form-actions/) and [Elementor Forms Hooks](https://developers.elementor.com/docs/hooks/forms/) |

## Get Phame Documentation Decisions

The in-app guide documents only the canonical `POST https://getphame.app/api/v1/contacts` endpoint. It does not instruct users to place API keys in query strings, request bodies, page HTML, or browser JavaScript. Every copyable example uses `gp_live_YOUR_API_KEY`, never an account’s raw key.

The canonical payload uses a nested `consent` object. For form builders limited to flat mappings, the endpoint also accepts `consentConfirmed`, `consentBasis`, `consentCapturedAt`, and `consentSource`; these aliases are normalized and then pass through the same strict affirmative-consent schema.

Elementor guidance recommends a server-side custom action or trusted bridge when protected headers are unavailable in the native configuration. It explicitly rejects exposing the key in a URL or public page source as a workaround.
