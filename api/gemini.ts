/**
 * Serverless Proxy Endpoint for Google Gemini API
 * Compatible with Vercel Serverless Functions and Netlify Functions.
 *
 * Security Benefits:
 * 1. Holds GEMINI_API_KEY server-side so keys are never leaked to client browsers.
 * 2. Origin validation: rejects unauthorized cross-origin requests.
 * 3. Request size capping: rejects payloads > 100 KB to mitigate DoS.
 * 4. In-memory IP rate limiting (e.g., 20 requests per minute per IP).
 * 5. Masks and redacts internal error traces from client responses.
 */

import type { IncomingMessage, ServerResponse } from 'http';

interface ExtendedRequest extends IncomingMessage {
  body?: unknown;
  query?: Record<string, string>;
}

// In-memory rate limiting map: IP -> { count: number, resetTime: number }
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 20;
const MAX_REQUEST_PAYLOAD_BYTES = 100 * 1024; // 100 KB

function getClientIp(req: IncomingMessage): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.socket.remoteAddress || 'unknown-client';
}

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (record.count >= MAX_REQUESTS_PER_WINDOW) {
    return false;
  }

  record.count += 1;
  return true;
}

export default async function handler(req: ExtendedRequest, res: ServerResponse): Promise<void> {
  // 1. Enforce POST only
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Method Not Allowed. Only POST is supported.' }));
    return;
  }

  // 2. Validate Origin / Referer (prevent unauthorized third-party embedding)
  const origin = req.headers['origin'] || req.headers['referer'];
  const allowedOrigin = process.env.ALLOWED_ORIGIN;
  if (allowedOrigin && origin && !origin.includes(allowedOrigin)) {
    res.statusCode = 403;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Forbidden. Cross-origin request not allowed.' }));
    return;
  }

  // 3. Rate limiting per IP
  const clientIp = getClientIp(req);
  if (!checkRateLimit(clientIp)) {
    res.statusCode = 429;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Retry-After', '60');
    res.end(JSON.stringify({ error: 'Rate limit exceeded. Please wait 1 minute before retrying.' }));
    return;
  }

  // 4. Check payload size guard
  const contentLength = req.headers['content-length'];
  if (contentLength && parseInt(contentLength, 10) > MAX_REQUEST_PAYLOAD_BYTES) {
    res.statusCode = 413;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Payload Too Large. Max allowed size is 100 KB.' }));
    return;
  }

  // 5. Read body if not parsed
  let bodyData: {
    prompt?: string;
    systemInstruction?: string;
    temperature?: number;
    responseMimeType?: string;
    model?: string;
  } = {};

  try {
    if (typeof req.body === 'object' && req.body !== null) {
      bodyData = req.body as typeof bodyData;
    } else {
      const chunks: Buffer[] = [];
      let totalBytes = 0;
      for await (const chunk of req) {
        totalBytes += (chunk as Buffer).length;
        if (totalBytes > MAX_REQUEST_PAYLOAD_BYTES) {
          res.statusCode = 413;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Payload Too Large.' }));
          return;
        }
        chunks.push(chunk as Buffer);
      }
      const rawBody = Buffer.concat(chunks).toString('utf-8');
      if (rawBody.trim()) {
        bodyData = JSON.parse(rawBody);
      }
    }
  } catch {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Malformed JSON payload.' }));
    return;
  }

  const { prompt, systemInstruction, temperature = 0.3, responseMimeType, model = 'gemini-flash-latest' } = bodyData;

  if (!prompt || typeof prompt !== 'string' || prompt.length > 20000) {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Invalid or oversized prompt parameter.' }));
    return;
  }

  // 6. Resolve server-side key
  const serverApiKey = process.env.GEMINI_API_KEY || (req.headers['x-goog-api-key'] as string | undefined);
  if (!serverApiKey) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Server misconfiguration: GEMINI_API_KEY is not configured.' }));
    return;
  }

  // 7. Call Google Gemini via secure header
  try {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
    const geminiRes = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': serverApiKey,
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        ...(systemInstruction ? { systemInstruction: { parts: [{ text: systemInstruction }] } } : {}),
        generationConfig: {
          temperature,
          ...(responseMimeType ? { responseMimeType } : {}),
        },
      }),
    });

    const geminiJson = await geminiRes.json();

    if (!geminiRes.ok) {
      res.statusCode = geminiRes.status;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Upstream Gemini API error', details: geminiJson.error?.message || 'Unknown error' }));
      return;
    }

    const outputText = geminiJson.candidates?.[0]?.content?.parts?.[0]?.text;
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ text: outputText || '' }));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    res.statusCode = 502;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Failed to contact Gemini upstream.', message }));
  }
}
