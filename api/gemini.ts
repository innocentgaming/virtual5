/**
 * Serverless Proxy Endpoint for Google Gemini API
 * Compatible with Vercel Serverless Functions and Netlify Functions.
 *
 * Security properties:
 * 1. The GEMINI_API_KEY stays server-side and is never returned to clients.
 * 2. Same-origin only: browsers must send a matching Origin (or ALLOWED_ORIGIN allow-list entry);
 *    requests with no browser provenance at all are refused, so the endpoint is not a free public relay.
 * 3. Shared rate limiting through the account store (works across serverless instances), with an
 *    in-memory fallback when no store is configured.
 * 4. Strict input validation: size caps, model allow-list, clamped temperature, MIME allow-list.
 * 5. Upstream error details are logged server-side and never echoed to the caller.
 */

import type { IncomingMessage, ServerResponse } from 'node:http';
import { HttpError, getClientIp, rateLimit, readJson, sendJson, type ApiRequest } from './_lib/http.js';
import { StorageNotConfiguredError, getStore } from './_lib/store.js';

const RATE_LIMIT_WINDOW_SECONDS = 60;
const MAX_REQUESTS_PER_WINDOW = 20;
const MAX_REQUEST_PAYLOAD_BYTES = 100 * 1024;
const MAX_PROMPT_CHARS = 20_000;
const MAX_SYSTEM_CHARS = 8_000;
const DEFAULT_MODEL = 'gemini-flash-latest';
const BUILT_IN_MODELS = ['gemini-flash-latest', 'gemini-3.8-flash', 'gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-1.5-flash'];
const ALLOWED_MIME_TYPES = ['application/json', 'text/plain'];

// Fallback limiter, only used when no shared store is available (e.g. a bare Netlify deploy).
const fallbackLimits = new Map<string, { count: number; resetTime: number }>();

function fallbackRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = fallbackLimits.get(ip);
  if (!record || now > record.resetTime) {
    fallbackLimits.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_SECONDS * 1000 });
    return true;
  }
  record.count += 1;
  return record.count <= MAX_REQUESTS_PER_WINDOW;
}

export function allowedModels(): string[] {
  const extra = (process.env.GEMINI_ALLOWED_MODELS ?? '')
    .split(',')
    .map((m) => m.trim())
    .filter(Boolean);
  return [...new Set([...BUILT_IN_MODELS, ...extra])];
}

/** Exact host comparison (never a substring match, which `evil.com/?x=yoursite.com` would defeat). */
export function isOriginAllowed(req: IncomingMessage): boolean {
  const origin = req.headers.origin;
  const allowList = (process.env.ALLOWED_ORIGIN ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  if (origin) {
    let originHost: string;
    try {
      originHost = new URL(String(origin)).host;
    } catch {
      return false;
    }
    const hostOf = (value: string): string => {
      try {
        return new URL(value.includes('://') ? value : `https://${value}`).host;
      } catch {
        return value;
      }
    };
    if (allowList.length > 0 && allowList.some((entry) => hostOf(entry) === originHost)) return true;
    const ownHost = String(req.headers['x-forwarded-host'] ?? req.headers.host ?? '');
    return originHost === ownHost;
  }
  // No Origin header: accept only requests the browser itself marks as same-origin / user-initiated.
  const site = req.headers['sec-fetch-site'];
  return site === 'same-origin' || site === 'none';
}

async function checkRateLimit(ip: string): Promise<boolean> {
  try {
    await rateLimit(getStore(), `gemini:${ip}`, MAX_REQUESTS_PER_WINDOW, RATE_LIMIT_WINDOW_SECONDS);
    return true;
  } catch (err) {
    if (err instanceof HttpError && err.status === 429) return false;
    if (err instanceof StorageNotConfiguredError) return fallbackRateLimit(ip);
    console.error('[gemini] Rate-limit store error, using fallback limiter', err);
    return fallbackRateLimit(ip);
  }
}

export default async function handler(req: ApiRequest, res: ServerResponse): Promise<void> {
  try {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      throw new HttpError(405, 'Method Not Allowed. Only POST is supported.', 'method_not_allowed');
    }
    if (!isOriginAllowed(req)) {
      throw new HttpError(403, 'Forbidden. Cross-origin request not allowed.', 'forbidden_origin');
    }
    if (!(await checkRateLimit(getClientIp(req)))) {
      res.setHeader('Retry-After', String(RATE_LIMIT_WINDOW_SECONDS));
      throw new HttpError(429, 'Rate limit exceeded. Please wait 1 minute before retrying.', 'rate_limited');
    }

    const declared = Number.parseInt(String(req.headers['content-length'] ?? ''), 10);
    if (Number.isFinite(declared) && declared > MAX_REQUEST_PAYLOAD_BYTES) {
      throw new HttpError(413, 'Payload Too Large. Max allowed size is 100 KB.', 'payload_too_large');
    }

    const body = await readJson(req, MAX_REQUEST_PAYLOAD_BYTES);
    // Platforms that pre-parse the body bypass the stream cap, so measure it here too.
    if (JSON.stringify(body).length > MAX_REQUEST_PAYLOAD_BYTES) {
      throw new HttpError(413, 'Payload Too Large. Max allowed size is 100 KB.', 'payload_too_large');
    }

    const { prompt, systemInstruction, temperature, responseMimeType, model } = body;

    if (typeof prompt !== 'string' || !prompt.trim() || prompt.length > MAX_PROMPT_CHARS) {
      throw new HttpError(400, 'Invalid or oversized prompt parameter.', 'invalid_prompt');
    }
    if (systemInstruction !== undefined && (typeof systemInstruction !== 'string' || systemInstruction.length > MAX_SYSTEM_CHARS)) {
      throw new HttpError(400, 'Invalid or oversized systemInstruction parameter.', 'invalid_system_instruction');
    }
    if (temperature !== undefined && (typeof temperature !== 'number' || !Number.isFinite(temperature) || temperature < 0 || temperature > 2)) {
      throw new HttpError(400, 'temperature must be a number between 0 and 2.', 'invalid_temperature');
    }
    if (responseMimeType !== undefined && (typeof responseMimeType !== 'string' || !ALLOWED_MIME_TYPES.includes(responseMimeType))) {
      throw new HttpError(400, 'Unsupported responseMimeType.', 'invalid_mime_type');
    }
    const chosenModel = model === undefined ? DEFAULT_MODEL : model;
    if (typeof chosenModel !== 'string' || !allowedModels().includes(chosenModel)) {
      throw new HttpError(400, 'Unsupported model.', 'invalid_model');
    }

    const serverApiKey = process.env.GEMINI_API_KEY || (req.headers['x-goog-api-key'] as string | undefined);
    if (!serverApiKey) {
      console.error('[gemini] GEMINI_API_KEY is not configured.');
      throw new HttpError(500, 'The AI service is not configured on this server.', 'not_configured');
    }

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(chosenModel)}:generateContent`;
    let geminiRes: Response;
    try {
      geminiRes = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': serverApiKey },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          ...(systemInstruction ? { systemInstruction: { parts: [{ text: systemInstruction }] } } : {}),
          generationConfig: {
            temperature: temperature ?? 0.3,
            ...(responseMimeType ? { responseMimeType } : {}),
          },
        }),
      });
    } catch (err) {
      console.error('[gemini] Upstream request failed', err);
      throw new HttpError(502, 'Failed to contact the AI service.', 'upstream_unreachable');
    }

    const geminiJson = (await geminiRes.json().catch(() => ({}))) as {
      error?: { message?: string };
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };

    if (!geminiRes.ok) {
      console.error('[gemini] Upstream error', geminiRes.status, geminiJson.error?.message);
      throw new HttpError(geminiRes.status === 429 ? 429 : 502, 'The AI service returned an error. Please try again.', 'upstream_error');
    }

    sendJson(res, 200, { text: geminiJson.candidates?.[0]?.content?.parts?.[0]?.text ?? '' });
  } catch (err) {
    if (err instanceof HttpError) {
      sendJson(res, err.status, { error: err.message, code: err.code });
    } else {
      console.error('[gemini] Unhandled error', err);
      sendJson(res, 500, { error: 'Something went wrong. Please try again.', code: 'server_error' });
    }
  }
}
