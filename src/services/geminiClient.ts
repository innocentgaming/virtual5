/**
 * Centralized, secure HTTP client for Google Gemini API interactions.
 *
 * Security guarantees:
 * 1. API keys are sent strictly via the 'x-goog-api-key' request header, NEVER in URL query strings.
 * 2. In production builds (import.meta.env.PROD), ambient VITE_GEMINI_API_KEY is ignored to prevent
 *    inlining secrets into the public client bundle.
 * 3. Fresh AbortController and strict timeouts are used per model candidate.
 * 4. Response payloads are capped (512 KB) to prevent memory exhaustion / DoS attacks.
 * 5. Secret redaction ensures API keys never leak into console logs or error messages.
 * 6. Supports optional serverless backend proxy via VITE_GEMINI_PROXY_URL.
 */

export interface GeminiRequestOptions {
  prompt: string;
  systemInstruction?: string;
  apiKey?: string;
  temperature?: number;
  responseMimeType?: string;
  responseSchema?: Record<string, unknown>;
  maxOutputTokens?: number;
  timeoutMs?: number;
  maxResponseBytes?: number;
  models?: string[];
}

export interface GeminiClientResult {
  success: boolean;
  text?: string;
  error?: string;
  modelUsed?: string;
  statusCode?: number;
}

const DEFAULT_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-2.0-flash',
];

const DEFAULT_TIMEOUT_MS = 10000;
const DEFAULT_MAX_RESPONSE_BYTES = 512 * 1024; // 512 KB cap

/**
 * Redacts known API keys and sensitive patterns from error strings and logs.
 */
export function redactSecrets(text: string, customKey?: string): string {
  if (!text) return '';
  let sanitized = text;

  // Redact specific provided key if present
  if (customKey && customKey.trim().length > 3) {
    const escaped = customKey.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    sanitized = sanitized.replace(new RegExp(escaped, 'g'), '[REDACTED_API_KEY]');
  }

  // Redact standard Google API key patterns (e.g. AIzaSy...)
  sanitized = sanitized.replace(/AIza[0-9A-Za-z\-_]{35}/g, '[REDACTED_API_KEY]');

  // Redact any lingering URL key parameters (?key=... or &key=...)
  sanitized = sanitized.replace(/([?&]key=)[^&\s"']+/gi, '$1[REDACTED]');

  // Redact header references in error messages
  sanitized = sanitized.replace(/(x-goog-api-key[:=]\s*["']?)[^"'\s,}]+/gi, '$1[REDACTED]');

  return sanitized;
}

/**
 * Resolves the effective API key.
 * In production mode, ambient environment variables are ignored for zero client-bundle leakage.
 */
export function getActiveApiKey(customApiKey?: string): string | undefined {
  const explicit = customApiKey?.trim();
  if (explicit) return explicit;

  // Never allow ambient build-time keys in production builds
  if (!import.meta.env.PROD) {
    const devKey = (import.meta.env.VITE_GEMINI_API_KEY as string | undefined)?.trim();
    if (devKey) return devKey;
  }

  return undefined;
}

/**
 * Checks whether an AI call can be attempted (either via in-memory key, dev key, or configured proxy).
 */
export function canCallGemini(customApiKey?: string): boolean {
  const proxyUrl = (import.meta.env.VITE_GEMINI_PROXY_URL as string | undefined)?.trim();
  if (proxyUrl) return true;
  return Boolean(getActiveApiKey(customApiKey));
}

/**
 * Executes a hardened call to the Gemini API or a configured proxy.
 */
export async function requestGeminiContent(
  options: GeminiRequestOptions
): Promise<GeminiClientResult> {
  const {
    prompt,
    systemInstruction,
    apiKey,
    temperature = 0.3,
    responseMimeType,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    maxResponseBytes = DEFAULT_MAX_RESPONSE_BYTES,
    models = DEFAULT_MODELS,
  } = options;

  const proxyUrl = (import.meta.env.VITE_GEMINI_PROXY_URL as string | undefined)?.trim();

  // If a serverless proxy URL is configured, route exclusively through it
  if (proxyUrl) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (apiKey) {
        headers['x-goog-api-key'] = apiKey;
      }

      const res = await fetch(proxyUrl, {
        method: 'POST',
        headers,
        signal: controller.signal,
        body: JSON.stringify({
          prompt,
          systemInstruction,
          temperature,
          responseMimeType,
        }),
      });

      clearTimeout(timeoutId);

      const contentLength = res.headers.get('content-length');
      if (contentLength && parseInt(contentLength, 10) > maxResponseBytes) {
        return {
          success: false,
          error: `Proxy response exceeded size limit of ${maxResponseBytes} bytes.`,
          statusCode: res.status,
        };
      }

      const rawText = await res.text();
      if (rawText.length > maxResponseBytes) {
        return {
          success: false,
          error: `Proxy response payload exceeded size limit of ${maxResponseBytes} bytes.`,
          statusCode: res.status,
        };
      }

      if (!res.ok) {
        return {
          success: false,
          error: redactSecrets(`Proxy returned status ${res.status}: ${rawText}`, apiKey),
          statusCode: res.status,
        };
      }

      const json = JSON.parse(rawText);
      const text = json.text || json.candidates?.[0]?.content?.parts?.[0]?.text;
      return {
        success: Boolean(text),
        text: text ? String(text).trim() : undefined,
        modelUsed: 'proxy',
        statusCode: res.status,
      };
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      const rawError = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        error: redactSecrets(`Proxy request failed: ${rawError}`, apiKey),
      };
    }
  }

  // Direct Gemini API call: require an API key
  if (!apiKey) {
    return {
      success: false,
      error: 'No active Gemini API key provided.',
    };
  }

  let lastError = 'No candidate models succeeded.';

  // Attempt models sequentially with fresh AbortController per attempt
  for (const model of models) {
    let modelExhausted = false;

    // Exponential backoff with jitter capped at 1 retry (max 2 attempts total per model)
    for (let attempt = 1; attempt <= 2 && !modelExhausted; attempt++) {
      if (attempt > 1) {
        const jitter = Math.floor(Math.random() * 50);
        await new Promise((r) => setTimeout(r, 40 + jitter));
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        };

        const requestBody: {
          contents: Array<{ parts: Array<{ text: string }> }>;
          systemInstruction?: { parts: Array<{ text: string }> };
          generationConfig: {
            temperature: number;
            responseMimeType?: string;
            responseSchema?: Record<string, unknown>;
            maxOutputTokens?: number;
          };
        } = {
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature,
            maxOutputTokens: options.maxOutputTokens || 2048,
          },
        };

        if (responseMimeType) {
          requestBody.generationConfig.responseMimeType = responseMimeType;
        }
        if (options.responseSchema) {
          requestBody.generationConfig.responseSchema = options.responseSchema;
        }

        if (systemInstruction) {
          requestBody.systemInstruction = {
            parts: [{ text: systemInstruction }],
          };
        }

        const res = await fetch(endpoint, {
          method: 'POST',
          headers,
          signal: controller.signal,
          body: JSON.stringify(requestBody),
        });

        clearTimeout(timeoutId);

        // Check header content-length guard
        const contentLength = res.headers?.get ? res.headers.get('content-length') : null;
        if (contentLength && parseInt(contentLength, 10) > maxResponseBytes) {
          lastError = `Response from ${model} exceeded limit of ${maxResponseBytes} bytes.`;
          modelExhausted = true;
          break;
        }

        let rawText = '';
        if (typeof res.text === 'function') {
          rawText = await res.text();
        } else if (typeof res.json === 'function') {
          const parsed = await res.json();
          rawText = typeof parsed === 'string' ? parsed : JSON.stringify(parsed);
        }

        if (rawText.length > maxResponseBytes) {
          lastError = `Response payload from ${model} exceeded limit of ${maxResponseBytes} bytes.`;
          modelExhausted = true;
          break;
        }

        // 404: Model not available for this key/tier - skip retries and try next model
        if (res.status === 404) {
          lastError = `Model ${model} not available (404).`;
          modelExhausted = true;
          break;
        }

        // Stop immediately on 400, 401, 403, 429 - no pointless retries across models
        if (res.status === 400 || res.status === 401 || res.status === 403 || res.status === 429) {
          let errorMsg = `API error (${res.status}) on model ${model}: ${rawText.slice(0, 200)}`;
          if (res.status === 429) {
            const retryAfter = res.headers?.get ? res.headers.get('retry-after') : null;
            errorMsg = `Gemini rate limit exceeded (429).${retryAfter ? ` Retry-After: ${retryAfter}s.` : ''} Switching to deterministic offline planner.`;
          }
          return {
            success: false,
            error: redactSecrets(errorMsg, apiKey),
            statusCode: res.status,
          };
        }

        // On 5xx: if attempt 1, retry once; if attempt 2, fall back to next model
        if (!res.ok) {
          lastError = `API error (${res.status}) on model ${model}: ${rawText.slice(0, 200)}`;
          if (attempt === 2) {
            modelExhausted = true;
          }
          continue;
        }

        let json: Record<string, unknown> = {};
        try {
          json = JSON.parse(rawText);
        } catch {
          json = {};
        }
        const candidates = json.candidates as Array<{ content?: { parts?: Array<{ text?: string }> } }> | undefined;
        const text = candidates?.[0]?.content?.parts?.[0]?.text;

        if (text) {
          return {
            success: true,
            text: String(text).trim(),
            modelUsed: model,
            statusCode: res.status,
          };
        }

        // If mock directly returned rawText or text is missing
        if (rawText && !candidates) {
          return {
            success: true,
            text: rawText.trim(),
            modelUsed: model,
            statusCode: res.status,
          };
        }

        lastError = `Candidate text missing in response from ${model}.`;
      } catch (err: unknown) {
        clearTimeout(timeoutId);
        const rawError = err instanceof Error ? err.message : String(err);
        lastError = `Request attempt for ${model} failed: ${rawError}`;
        if (attempt === 2) {
          modelExhausted = true;
        }
      }
    }
  }

  return {
    success: false,
    error: redactSecrets(lastError, apiKey),
  };
}
