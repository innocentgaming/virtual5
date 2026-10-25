# Security Policy — EventWise AI (India Edition)

## Responsible Disclosure & Vulnerability Reporting

The EventWise AI development team takes application security, user privacy, and data isolation seriously. If you identify a potential security vulnerability in this application or its serverless proxy examples, please report it privately.

- **Primary Contact**: `security@eventwise.ai` (or via GitHub Private Vulnerability Reporting)
- **Response SLA**: Acknowledgment within 24 hours; status triage update within 72 hours.
- **Please DO NOT open public GitHub issues for sensitive security vulnerabilities.**

When reporting a vulnerability, please include:
1. Steps to reproduce or Proof of Concept (PoC).
2. The specific browser, runtime environment, or endpoint affected.
3. Impact assessment and potential remediation suggestions.

---

## Security Architecture & Threat Model

EventWise AI is engineered with an **offline-first, zero-trust client architecture**:

1. **No Public Bundle Key Inlining**:
   - In production builds (`import.meta.env.PROD`), ambient build-time variables like `VITE_GEMINI_API_KEY` are strictly ignored and not exposed to client JavaScript.
   - Users provide ephemeral session keys held exclusively in browser memory, or the app uses an optional serverless proxy (`api/gemini.ts`).

2. **Header-Based Authentication**:
   - API keys are transmitted to Google Gemini exclusively via the `x-goog-api-key` HTTP header, never in URL query strings (`?key=...`).

3. **Strict Deep Validation & Bounds**:
   - All external data (from Google Gemini, localStorage, and JSON imports) is deeply validated and sanitized in `src/utils/validators.ts`.
   - String length caps, control character stripping, numeric finiteness checks, economic upper bounds, enum allowlists, array caps, and unique ID regeneration are systematically enforced.

4. **Prompt Injection Boundary Isolation**:
   - User inputs are bounded and wrapped in strict `=== USER_DATA_BOUNDARY_START ===` delimiters with explicit system instructions commanding the model to treat all user text as passive data.

5. **Data Privacy & PII Guardrails**:
   - Attendee guest names, phone numbers, and email addresses are never sent to external AI endpoints.
   - Users can toggle a persistent "Offline Mode" to disable all cloud calls.

6. **Defense-in-Depth Browser Controls**:
   - Content-Security-Policy (CSP) restricts script execution strictly to `'self'`, blocking untrusted script execution.
   - `frame-ancestors 'none'` and `X-Frame-Options: DENY` eliminate clickjacking risks.
   - `Permissions-Policy` denies camera, microphone, and geolocation access.
   - `X-Content-Type-Options: nosniff` and `Referrer-Policy: strict-origin-when-cross-origin` prevent MIME sniffing and referrer leakage.

---

## Key Management & Rotation Checklist

If an API key was ever committed to version control, pasted in public chat, or deployed in a client environment:
1. **Rotate Immediately**: In Google Cloud Console or Google AI Studio, generate a replacement key and revoke the previous key.
2. **Apply Scope Restrictions**: Restrict the key specifically to `Generative Language API` only.
3. **Apply Referrer Restrictions**: Restrict client keys by HTTP Referrer matching your production domain.
4. **Prefer Server-Side Proxy**: Deploy `api/gemini.ts` on Vercel/Netlify so the API key remains securely stored server-side.
