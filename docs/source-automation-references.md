# Sources automation references

## Zapier

Official documentation: https://help.zapier.com/hc/en-us/articles/8496288690317-Send-webhooks-in-Zaps

The guided Get Phame recipe uses **Webhooks by Zapier → Custom Request**, an HTTP `POST`, JSON request data, and custom headers. Zapier documents that webhook actions can send JSON and custom headers. Secrets must be stored in protected automation fields rather than URLs, form fields, or browser code.

## Make

Official HTTP app documentation: https://apps.make.com/http

The guided Get Phame recipe uses **HTTP → Make a request**, method `POST`, a raw `application/json` body, and custom headers. Make documents request method, headers, body type, content type, and response parsing in its HTTP app.

## Get Phame request contract

The implementation uses `/api/v1/contacts`, `Authorization: Bearer …`, `Content-Type: application/json`, `X-Get-Phame-Source: src_…`, and `Idempotency-Key: <stable-provider-event-id>`. The stable provider event ID is reused for retries and is also mapped to `externalId`. Consent fields remain required for the versioned endpoint.
