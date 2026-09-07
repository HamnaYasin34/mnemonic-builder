// ─────────────────────────────────────────────────────────────────────────────
// app/lib/groq-utils.ts
// Shared Groq API utilities: retry logic, JSON sanitization, and repair.
// Used by /api/generate, /api/guide, and /api/quiz routes.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calls Groq's chat completions endpoint and, if it comes back with a 429
 * (rate limit), automatically retries. Groq's 429 body includes a message
 * like "...Please try again in 7.425s..." — we parse that exact delay when
 * present so we wait just long enough, rather than guessing. Falls back to
 * exponential backoff if the delay can't be parsed.
 */
export async function fetchGroqWithRetry(
  url: string,
  options: RequestInit,
  maxRetries = 3
): Promise<Response> {
  let lastResponse: Response | null = null

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const response = await fetch(url, options)

    // Groq may return 429 (RPM) or 413/400 (TPM rate-limit) — retry both
    if (response.status !== 429 && response.status !== 413 && response.status !== 400) {
      return response
    }
    if (attempt === maxRetries) return response

    lastResponse = response
    const bodyText = await response.clone().text().catch(() => '')
    const tpmMatch = bodyText.match(/try again in ([\d.]+)s/i)
    const rpmMatch = bodyText.match(/Please retry in ([\d.]+)s/i)
    const delaySeconds = tpmMatch ? parseFloat(tpmMatch[1]) : rpmMatch ? parseFloat(rpmMatch[1]) : 2 * (attempt + 1)

    console.warn(`[MnemonicFlow API] Groq throttled (${response.status}, attempt ${attempt + 1}/${maxRetries}); retrying in ${delaySeconds}s.`)
    await new Promise(resolve => setTimeout(resolve, Math.min(delaySeconds, 20) * 1000 + 200))
  }

  // Unreachable in practice, but keeps TypeScript happy.
  return lastResponse!
}

/**
 * LLMs sometimes emit raw, un-escaped control characters (literal newlines, tabs,
 * carriage returns) inside JSON string values — e.g. a multi-line "story" field
 * written with real line breaks instead of "\n". That's invalid JSON and makes
 * JSON.parse throw "Unterminated string". This walks the text char-by-char,
 * tracks whether we're inside a quoted string (respecting escape sequences),
 * and escapes any stray control characters it finds there. It never touches
 * characters outside of string literals, so the JSON structure itself is untouched.
 */
export function sanitizeJsonControlChars(text: string): string {
  let result = ''
  let inString = false
  let escapeNext = false

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]

    if (escapeNext) {
      result += ch
      escapeNext = false
      continue
    }

    if (ch === '\\') {
      result += ch
      escapeNext = true
      continue
    }

    if (ch === '"') {
      inString = !inString
      result += ch
      continue
    }

    if (inString) {
      if (ch === '\n') { result += '\\n'; continue }
      if (ch === '\r') { result += '\\r'; continue }
      if (ch === '\t') { result += '\\t'; continue }
    }

    result += ch
  }

  return result
}

/**
 * Handles genuine truncation: the response got cut off (max_tokens hit,
 * or the stream ended early) partway through a string or before all
 * brackets closed. This walks the text once, tracks whether we're still
 * inside an open string and which brackets/braces are still open, then
 * appends whatever's needed to make it syntactically valid JSON so we can
 * at least recover the fields the model finished writing.
 */
export function repairTruncatedJson(text: string): string {
  let inString = false
  let escapeNext = false
  const stack: string[] = []

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]

    if (escapeNext) { escapeNext = false; continue }
    if (ch === '\\') { escapeNext = true; continue }
    if (ch === '"') { inString = !inString; continue }

    if (!inString) {
      if (ch === '{' || ch === '[') stack.push(ch)
      else if (ch === '}' || ch === ']') stack.pop()
    }
  }

  let result = text
  // If we ended mid-string, close it before closing any brackets.
  if (inString) result += '"'
  // Close whatever braces/brackets never got closed, innermost first.
  while (stack.length) {
    const open = stack.pop()
    result += open === '{' ? '}' : ']'
  }

  return result
}

/**
 * Extracts the outermost COMPLETE JSON object from text that may be wrapped
 * in prose ("Here is your mnemonic:") or other noise. Returns the extracted
 * substring, or null when no balanced object can be located (which is the
 * signature of a genuinely truncated response — the caller should repair
 * the full text instead).
 */
export function extractJsonObject(text: string): string | null {
  const start = text.indexOf('{')
  if (start === -1) return null

  let depth = 0
  let inString = false
  let escapeNext = false

  for (let i = start; i < text.length; i++) {
    const ch = text[i]

    if (escapeNext) { escapeNext = false; continue }
    if (inString) {
      if (ch === '\\') { escapeNext = true; continue }
      if (ch === '"') inString = false
      continue
    }
    if (ch === '"') { inString = true; continue }
    if (ch === '{') depth++
    else if (ch === '}') {
      depth--
      if (depth === 0) return text.slice(start, i + 1)
    }
  }

  return null
}

/** Which recovery strategy produced a parseable object. */
export type JsonRecoveryStrategy = 'direct' | 'sanitized' | 'extracted' | 'repaired'

export interface ParsedWithRecovery {
  parsed: any
  strategy: JsonRecoveryStrategy
}

/**
 * Full JSON recovery chain for raw LLM output, ordered cheapest → most
 * aggressive:
 *   1. direct      — model returned clean JSON
 *   2. sanitized   — JSON with raw control chars (newlines/tabs) inside strings
 *   3. extracted   — a complete JSON object wrapped in prose/markdown
 *   4. repaired    — genuinely truncated output (max_tokens cut): close the
 *                    open string/brackets and salvage whatever fields finished
 * Throws only when even repair cannot produce valid JSON (unrecoverable).
 */
export function parseWithRecovery(raw: string, finishReason?: string): ParsedWithRecovery {
  const cleaned = raw.replace(/```json/gi, '').replace(/```/g, '').trim()

  try {
    return { parsed: JSON.parse(cleaned), strategy: 'direct' }
  } catch { /* try next strategy */ }

  const sanitized = sanitizeJsonControlChars(cleaned)
  try {
    return { parsed: JSON.parse(sanitized), strategy: 'sanitized' }
  } catch { /* try next strategy */ }

  const extracted = extractJsonObject(sanitized)
  if (extracted !== null) {
    try {
      return { parsed: JSON.parse(extracted), strategy: 'extracted' }
    } catch { /* fall through to repair */ }
  }

  if (finishReason === 'length') {
    console.warn('[MnemonicFlow API] Response appears truncated (finish_reason=length); attempting repair.')
  }
  return { parsed: JSON.parse(repairTruncatedJson(extracted ?? sanitized)), strategy: 'repaired' }
}

/** Why a required field failed validation. */
export interface FieldValidationFailure {
  field: string
  reason: 'missing' | 'too_short'
  actualLength?: number
  requiredLength?: number
}

/**
 * Validates that every required field exists as a non-empty string of at
 * least `minLen` characters. Returns the FIRST failure, or null when the
 * object is complete. Used to make the backend refuse to ship incomplete
 * generations instead of silently returning success with empty fields.
 */
export function validateRequiredFields(
  parsed: any,
  required: Array<[field: string, minLen: number]>,
): FieldValidationFailure | null {
  for (const [field, minLen] of required) {
    const value = parsed?.[field]
    const trimmed = typeof value === 'string' ? value.trim() : ''
    if (!trimmed) {
      return { field, reason: 'missing' }
    }
    if (trimmed.length < minLen) {
      return { field, reason: 'too_short', actualLength: trimmed.length, requiredLength: minLen }
    }
  }
  return null
}

/**
 * Builds the messages for the ONE controlled compact retry. The first attempt
 * asked for the full MemoryRepresentation; when that response is truncated,
 * this retry asks ONLY for the fields the app cannot live without, with tight
 * length caps so the answer reliably fits the remaining provider budget.
 */
export function buildCompactRetryMessages(
  topic: string,
  subject: string,
  mnemonicType: string,
  storyStyle: string,
): Array<{ role: 'system' | 'user'; content: string }> {
  const typeRule =
    mnemonicType === 'acronym'
      ? 'a strict first-letter acronym of the key facts, one line'
      : mnemonicType === 'spatial'
        ? 'a spatial-layout mnemonic naming where each key fact lives'
        : mnemonicType === 'hook'
          ? 'ONE short vivid hook sentence encoding the key facts'
          : 'a one-line memorable hook sentence encoding the key facts'

  return [
    {
      role: 'system',
      content:
        'You are a medical memory architect for MBBS students. You MUST output one complete compact JSON object — no extra text, no markdown. A complete short answer beats an elaborate cut-off one: keep every field under its length cap.',
    },
    {
      role: 'user',
      content: `Topic: "${topic}" (subject: ${subject}).
This is a compact retry — the previous elaborate response was cut off. Return ONLY these fields, each concise:
- mnemonic: ${typeRule}, instantly recallable
- explanation: core concept + mechanism chain in 2-3 sentences, then 1-2 high-yield facts (max 80 words)
- visualMemoryAnchor: 2 short sentences starting with "Follow the scene:" mapping the story's key visual elements to the medical facts
- story: EXACTLY 4 short lines, written in the ${storyStyle} style, where characters/objects physically act out the mechanism
- visualScene: ONE coherent literal scene description of that exact story (max 90 words)
- ankiFront: one exam-style question
- ankiBack: 1-2 line answer + mechanism
- quizQuestion: one short self-test question
- quizAnswer: one-line answer
Return only the JSON object.`,
    },
  ]
}

/**
 * Parses a raw Groq JSON response, applying sanitization and repair as needed.
 * Returns the parsed object or throws if unrecoverable.
 */
export function parseGroqJson(raw: string, finishReason?: string): any {
  return parseWithRecovery(raw, finishReason).parsed
}
