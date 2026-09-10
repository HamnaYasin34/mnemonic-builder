// ─────────────────────────────────────────────────────────────────────────────
// app/lib/image-provider.ts
// Image generation provider abstraction.
//
// The narrative image prompt (compiled by compileNarrativeImagePrompt in the
// generate route) is the primary prompt. This module appends model-specific
// execution requirements and style-specific instructions, then dispatches to
// the configured provider.
//
// Provider priority (first configured wins):
//   1. Cloudflare Workers AI  (free 100K neurons/day, FLUX.1-schnell/FLUX.2)
//   2. Pollinations           (always available, free, no auth)
//
// Environment variables:
//   CLOUDFLARE_ACCOUNT_ID + CLOUDFLARE_API_TOKEN → Cloudflare Workers AI
//   (none)                                       → Pollinations fallback
// ─────────────────────────────────────────────────────────────────────────────

// ── Types ────────────────────────────────────────────────────────────────────

export interface ImageGenerationResult {
  /** Base64-encoded image data (no data URI prefix) */
  imageData: string
  /** MIME type, e.g. "image/png" or "image/jpeg" */
  mimeType: string
  /** Model identifier that produced the image */
  model: string
}

export interface ImageGenerationInput {
  /** The full image prompt (narrative + model-specific + style-specific) */
  prompt: string
  /** Aspect ratio, e.g. "4:3", "3:4", "16:9". Gemini default: "4:3" */
  aspectRatio?: string
}

export interface ImageGenerationProvider {
  generateImage(input: ImageGenerationInput): Promise<ImageGenerationResult>
  readonly providerName: string
}

// ── Prompt assembly (pure, testable) ────────────────────────────────────────

/**
 * §2/§3/§5/§6/§8/§9 execution requirements appended to every image prompt.
 * These tell the model that this is a narrative scene, not a generic
 * illustration — mnemonic clarity outranks cinematic beauty.
 */
export const MODEL_EXECUTION_REQUIREMENTS = `\n\nMODEL EXECUTION REQUIREMENTS:

This is a visual memory narrative, not a generic illustration.

Show the story actively happening.

The protagonist must visibly perform the actions described in the story.

Preserve the exact mnemonic objects and their visual identities.

Preserve the order of the story beats.

Create ONE coherent visual world rather than unrelated panels or disconnected objects.

The viewer should be able to reconstruct the narrative from the image alone.

MEMORY FUNCTION > CINEMATIC BEAUTY. Prioritize, in this exact order: mnemonic objects, character action, sequence, spatial relationships, fact mapping, visual clarity, style/atmosphere. Do NOT prioritize cinematic lighting, dramatic fog, photorealism, or aesthetic background detail when those interfere with memory cues.

ONE CONTINUOUS SCENE. Do not divide the composition into unrelated cinematic panels. Represent sequential actions through spatial movement within the same world. The story should read from beginning → middle → end across the scene.

Do not turn the scene into a generic anatomy diagram.

Do not replace symbolic objects with realistic anatomical structures unless specifically requested.

Do not add major decorative objects that are absent from the story.

If the story contains a protagonist, the protagonist must remain visually consistent throughout the scene — the same character performing each action in sequence, not multiple unrelated people.`

/** Clinical Ink™ (mapped to "sketchy" visual style) — original hand-drawn educational memory illustration. */
export const CLINICAL_INK_INSTRUCTIONS = `\n\nCLINICAL INK™ STYLE:

Render as an original hand-drawn educational memory illustration.

Use: expressive characters, strong silhouettes, bold mnemonic objects, clear actions, readable spatial arrangement, selectively vivid visual anchors, simplified but memorable anatomy, educational illustration quality.

Avoid: photorealism, dark cinematic poster aesthetics, excessive fog, indistinct silhouettes, overly realistic anatomy, decorative clutter.

The result should feel like an original educational memory illustration — not a photograph, not a cinematic poster, not a generic anatomy diagram.

Do not imitate or reproduce Sketchy artwork. This is MnemonicFlow's own Clinical Ink™ style.`

/**
 * Medical content safety instructions — appended to EVERY image prompt.
 * Prevents sexualized, vulgar, graphic, or otherwise inappropriate outputs.
 * This is a medical education platform — all visuals must be appropriate
 * for MBBS students and maintain textbook-quality standards.
 */
export const MEDICAL_SAFETY_INSTRUCTIONS = `\n\nMEDICAL EDUCATION CONTENT SAFETY:

This is a medical education platform for MBBS students. All images MUST be appropriate for an academic setting.

Render in a textbook-quality educational illustration style. Use diagrammatic, clinical, or educational visualization. Characters should be stylized educational illustration figures, NOT photorealistic people.

STRICTLY PROHIBITED: nudity, sexualized content, vulgar imagery, graphic gore, gratuitous bodily exposure, suggestive poses, or any content inappropriate for a professional medical education context. When depicting anatomy or body-related concepts, use textbook-style diagrammatic visualization, educational illustration conventions, or symbolic representation — never photorealistic bodies or unnecessarily graphic depiction.`

/** NeuroCanvas™ (mapped to "osmosis" visual style) — clean educational visual language. */
export const NEUROCANVAS_INSTRUCTIONS = `\n\nNEUROCANVAS™ STYLE:

Render as a clean educational visual language scene.

Use: strong shapes, clear spatial relationships, readable character actions, flat/vector-inspired forms, memorable color coding, minimal background clutter, generous white space.

ONE CONTINUOUS STORY WORLD — the entire narrative unfolds within a single coherent environment, not disconnected panels.`

/**
 * Build the final prompt sent to the image model: the compiled narrative
 * prompt + model-specific execution requirements + style-specific instructions.
 *
 * If the incoming prompt is already a compiled narrative prompt (starts with
 * "NARRATIVE CONTEXT"), it is used as-is. Legacy visualScene strings (from
 * older saved cards) get a minimal narrative reinforcement wrapper first.
 */
export function buildFinalPrompt(
  compiledPrompt: string,
  visualStyle: string,
): string {
  const isNarrative = compiledPrompt.trimStart().startsWith('NARRATIVE CONTEXT')

  const base = isNarrative
    ? compiledPrompt
    : `highly detailed, professional medical illustration, editorial quality. Render EXACTLY the following scene and art style. This is a NARRATIVE scene — show the story actively happening: the character performing the described actions and the sequence of events visibly progressing from beginning to end, never a static arrangement of objects standing side by side. Do not introduce a different art style, do not abstract or symbolize the scene, and do not replace it with an unrelated object, texture, or surface. Scene: ${compiledPrompt}`

  const styleBlock = visualStyle === 'osmosis'
    ? NEUROCANVAS_INSTRUCTIONS
    : CLINICAL_INK_INSTRUCTIONS

  return `${base}${MODEL_EXECUTION_REQUIREMENTS}${styleBlock}${MEDICAL_SAFETY_INSTRUCTIONS}`
}

/** Default aspect ratio for narrative image generation (landscape, good for story flow). */
export const DEFAULT_ASPECT_RATIO = '4:3'

// ── Cloudflare Workers AI Provider (primary — free tier) ────────────────────

/** Default Cloudflare model — FLUX.1 schnell (fast, high-quality, free tier). */
export const DEFAULT_CLOUDFLARE_MODEL = '@cf/black-forest-labs/flux-1-schnell'

/**
 * Cloudflare Workers AI provider.
 * Free tier: 100,000 neurons/day (~500 images/day with FLUX.1-schnell).
 * Requires: CLOUDFLARE_ACCOUNT_ID + CLOUDFLARE_API_TOKEN env vars.
 * Setup: https://dash.cloudflare.com → Workers AI → Use REST API
 */
/**
 * Truncate a prompt to fit Cloudflare's token limit (~4000 chars ≈ 1000 tokens;
 * FLUX.1-schnell supports up to 4096 tokens).
 * Preserves the beginning (narrative context + setting + characters + beats)
 * and the end (style instructions), dropping middle detail (object consistency,
 * action requirements, spatial details) when the prompt is too long.
 *
 * NOTE: This is a legacy utility kept for backward compatibility.
 * The CloudflareProvider now uses compilePromptForCloudflare() which
 * intelligently preserves mnemonic-critical content.
 */
export function truncatePromptForCloudflare(prompt: string, maxLen = 4000): string {
  if (prompt.length <= maxLen) return prompt

  // Keep the first ~1400 chars (narrative context, setting, character, beats)
  // and the last ~500 chars (style instructions)
  const headEnd = Math.min(1400, Math.floor(maxLen * 0.7))
  const tailLen = maxLen - headEnd - 20 // 20 chars for separator
  const tailStart = Math.max(headEnd, prompt.length - tailLen)

  return prompt.slice(0, headEnd) + '\n\n[... condensed ...]\n\n' + prompt.slice(tailStart)
}

// ── Cloudflare token-budget constants ──────────────────────────────────────
// Cloudflare FLUX.1-schnell enforces a hard 2048-token prompt limit.
// Production evidence: a 3055-char prompt was rejected with
//   "AiError: Bad input: Error: Length of '/prompt' must be <= 2048"
// Conservative estimation: ~2 chars/token for English text (standard NLP
// heuristic). Target 1200 tokens = 40% safety margin below the 2048 limit.
const CF_TOKEN_BUDGET = 1200
const CF_CHARS_PER_TOKEN = 2
const CF_MAX_CHARS = CF_TOKEN_BUDGET * CF_CHARS_PER_TOKEN // 2400

/**
 * Compact quality reminder appended when the prompt is rebuilt from
 * narrative sections. Reinforces mnemonic execution + medical safety.
 */
const COMPACT_QUALITY_REMINDER = `\n\nMEMORY FUNCTION > CINEMATIC BEAUTY. Show the story actively happening. Preserve exact mnemonic objects and identities. One coherent educational illustration — no photorealism, no inappropriate content.`

/**
 * Extract a named section from the narrative prompt text.
 * Sections are separated by double newlines (\n\n). Multi-line sections
 * (e.g. STORY BEATS with one beat per line) are handled by reading until
 * the next known section header or end of text.
 */
function extractNarrativeSection(text: string, headerPrefix: string): string | null {
  const idx = text.indexOf(headerPrefix)
  if (idx === -1) return null

  const contentStart = idx
  const afterHeader = idx + headerPrefix.length

  // Find the next section boundary (\n\n followed by a capitalized header)
  const nextSectionMatch = text.slice(afterHeader).match(/\n\n(?=[A-Z\/])/)
  if (nextSectionMatch && nextSectionMatch.index !== undefined) {
    return text.slice(contentStart, afterHeader + nextSectionMatch.index)
  }

  // Last section in the text
  return text.slice(contentStart)
}

/**
 * Compile a prompt for Cloudflare's FLUX.1-schnell 2048-token limit.
 *
 * Uses a token-budget approach with conservative character estimation
 * (2 chars/token) rather than a raw character limit.
 *
 * Strategy:
 * 1. If the full prompt fits within the token budget → use as-is.
 * 2. Otherwise, extract the narrative prompt (stripping appended instruction
 *    blocks) and rebuild from highest-priority mnemonic sections first.
 * 3. Sections are added in priority order until the budget is exhausted.
 * 4. A compact quality/safety reminder is appended if room allows.
 *
 * Section priority (highest first):
 *   1. STORY BEATS — ordered events (core mnemonic structure)
 *   2. OBJECT CONSISTENCY — exact symbol identities
 *   3. ACTION REQUIREMENTS — visible verbs
 *   4. SPATIAL/SEQUENCE — reading order and progression
 *   5. MEDICAL ACCURACY — object → medical fact mappings
 *   6. NARRATIVE CONTEXT — story overview
 *   7. VISUAL STYLE — illustration style and negative prompt
 *   8. CHARACTER/GUIDE — protagonist description
 *   9. SCENE DESCRIPTION — supporting visual reference (lowest priority)
 *
 * All mnemonic-critical content (objects, mappings, actions, spatial
 * relationships, sequence) is preserved. Only verbose supporting
 * text (SCENE DESCRIPTION, SETTING) is dropped first.
 */
export function compilePromptForCloudflare(fullPrompt: string): string {
  // If the full prompt fits within the token budget, use it unchanged
  if (fullPrompt.length <= CF_MAX_CHARS) {
    return fullPrompt
  }

  // Extract the narrative prompt by stripping appended instruction blocks
  let narrativePrompt = fullPrompt
  const markers = [
    '\n\nMODEL EXECUTION REQUIREMENTS:',
    '\n\nCLINICAL INK™ STYLE:',
    '\n\nNEUROCANVAS™ STYLE:',
    '\n\nMEDICAL EDUCATION CONTENT SAFETY:',
  ]
  for (const marker of markers) {
    const idx = narrativePrompt.indexOf(marker)
    if (idx !== -1) {
      narrativePrompt = narrativePrompt.slice(0, idx)
      break
    }
  }

  // Parse narrative into individual sections
  const sections: { key: string; text: string }[] = []

  const storyBeats = extractNarrativeSection(narrativePrompt, 'STORY BEATS —')
  if (storyBeats) sections.push({ key: 'beats', text: storyBeats })

  const objectConsistency = extractNarrativeSection(narrativePrompt, 'OBJECT CONSISTENCY —')
  if (objectConsistency) sections.push({ key: 'objects', text: objectConsistency })

  const actionReqs = extractNarrativeSection(narrativePrompt, 'ACTION REQUIREMENTS —')
  if (actionReqs) sections.push({ key: 'actions', text: actionReqs })

  const spatialSeq = extractNarrativeSection(narrativePrompt, 'SPATIAL/SEQUENCE REQUIREMENTS —')
  if (spatialSeq) sections.push({ key: 'spatial', text: spatialSeq })

  const medicalAcc = extractNarrativeSection(narrativePrompt, 'MEDICAL ACCURACY —')
  if (medicalAcc) sections.push({ key: 'medical', text: medicalAcc })

  const narrativeCtx = extractNarrativeSection(narrativePrompt, 'NARRATIVE CONTEXT —')
  if (narrativeCtx) sections.push({ key: 'narrative', text: narrativeCtx })

  const visualStyle = extractNarrativeSection(narrativePrompt, 'VISUAL STYLE —')
  if (visualStyle) sections.push({ key: 'style', text: visualStyle })

  const characterGuide = extractNarrativeSection(narrativePrompt, 'CHARACTER/GUIDE —')
  if (characterGuide) sections.push({ key: 'character', text: characterGuide })

  const sceneDesc = extractNarrativeSection(narrativePrompt, 'SCENE DESCRIPTION ')
  if (sceneDesc) sections.push({ key: 'scene', text: sceneDesc })

  // Rebuild prompt in priority order (highest-priority sections first)
  const priorityOrder = ['beats', 'objects', 'actions', 'spatial', 'medical', 'narrative', 'style', 'character', 'scene']
  const selected: string[] = []
  let currentLen = 0

  for (const key of priorityOrder) {
    const section = sections.find(s => s.key === key)
    if (!section) continue

    const additionLen = section.text.length + (currentLen > 0 ? 2 : 0) // 2 for \n\n separator
    if (currentLen + additionLen + COMPACT_QUALITY_REMINDER.length <= CF_MAX_CHARS) {
      selected.push(section.text)
      currentLen += additionLen
    }
  }

  // If no sections fit, fall back to raw character truncation
  if (selected.length === 0) {
    return narrativePrompt.slice(0, CF_MAX_CHARS - 50).trimEnd() + '\n\n[... condensed for model limit ...]'
  }

  let result = selected.join('\n\n')

  // Append compact quality reminder if there is room
  if (result.length + COMPACT_QUALITY_REMINDER.length <= CF_MAX_CHARS) {
    result += COMPACT_QUALITY_REMINDER
  }

  return result
}

export class CloudflareProvider implements ImageGenerationProvider {
  readonly providerName: string
  private readonly accountId: string
  private readonly apiToken: string
  private readonly modelId: string

  constructor(accountId: string, apiToken: string, modelId?: string) {
    this.accountId = accountId
    this.apiToken = apiToken
    this.modelId = modelId ?? DEFAULT_CLOUDFLARE_MODEL
    this.providerName = `cloudflare:${this.modelId.replace('@cf/', '')}`
  }

  async generateImage(input: ImageGenerationInput): Promise<ImageGenerationResult> {
    const url = `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/ai/run/${this.modelId}`

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: compilePromptForCloudflare(input.prompt),
        steps: 4,
      }),
    })

    if (!response.ok) {
      const body = await response.text().catch(() => '')
      throw new Error(`Cloudflare AI error ${response.status}: ${body.slice(0, 300)}`)
    }

    // Cloudflare Workers AI returns JSON: { result: { image: "<base64>" }, success: true }
    const json = await response.json() as {
      result?: { image?: string }
      success?: boolean
      errors?: Array<{ message: string }>
    }

    if (!json.success || json.errors?.length) {
      const msg = json.errors?.map(e => e.message).join('; ') ?? 'unknown error'
      throw new Error(`Cloudflare AI error: ${msg}`)
    }

    const imageData = json.result?.image
    if (!imageData) {
      throw new Error('Cloudflare AI returned no image data.')
    }

    return { imageData, mimeType: 'image/png', model: this.modelId }
  }
}

// ── Gemini Provider ─────────────────────────────────────────────────────────

/**
 * Google Gemini image generation provider.
 * Uses the @google/genai SDK with responseModalities: ['IMAGE'].
 * Requires paid billing — free tier has zero quota for image models.
 */
export class GeminiProvider implements ImageGenerationProvider {
  readonly providerName: string
  private readonly apiKey: string
  private readonly modelId: string

  constructor(apiKey: string, modelId: string) {
    this.apiKey = apiKey
    this.modelId = modelId
    this.providerName = `gemini:${modelId}`
  }

  async generateImage(input: ImageGenerationInput): Promise<ImageGenerationResult> {
    const { GoogleGenAI } = await import('@google/genai')
    const ai = new GoogleGenAI({ apiKey: this.apiKey })

    const response = await ai.models.generateContent({
      model: this.modelId,
      contents: input.prompt,
      config: {
        responseModalities: ['IMAGE'],
        imageConfig: {
          aspectRatio: input.aspectRatio ?? DEFAULT_ASPECT_RATIO,
        },
      },
    })

    const data = response.data
    if (!data) {
      throw new Error(`Gemini (${this.modelId}) returned no image data.`)
    }

    return {
      imageData: data,
      mimeType: 'image/png',
      model: this.modelId,
    }
  }
}

// ── Pollinations Provider (free fallback — always available) ────────────────

/**
 * Pollinations.ai provider (free, no API key required).
 * Uses `enhance=false` to prevent the cinematic default style.
 * Model selection via constructor or POLLINATIONS_MODEL env var.
 */
export class PollinationsProvider implements ImageGenerationProvider {
  readonly providerName: string
  private readonly model: string

  constructor(model?: string) {
    this.model = model ?? 'flux-dev'
    this.providerName = `pollinations:${this.model}`
  }

  async generateImage(input: ImageGenerationInput): Promise<ImageGenerationResult> {
    const seed = Math.floor(Math.random() * 999999)
    const params = new URLSearchParams({
      width: '1024',
      height: '768',
      seed: String(seed),
      nologo: 'true',
      model: this.model,
      enhance: 'false',
      safe: 'true',
    })
    const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(input.prompt)}?${params.toString()}`

    const response = await fetch(url)
    if (!response.ok) {
      const body = await response.text().catch(() => '')
      throw new Error(`Pollinations error ${response.status}: ${body.slice(0, 200)}`)
    }

    const buffer = await response.arrayBuffer()
    const data = Buffer.from(buffer).toString('base64')
    const mimeType = response.headers.get('content-type') ?? 'image/jpeg'

    return { imageData: data, mimeType, model: this.model }
  }
}

// ── Factory functions ────────────────────────────────────────────────────────

/**
 * Create the primary image provider.
 * Priority: Cloudflare Workers AI → Pollinations flux-dev.
 *
 * IMPORTANT: the primary Pollinations model is always flux-dev (best
 * instruction following for mnemonic/illustration prompts). flux-realism
 * is a photorealistic model that produces generic cinematic scenes — it
 * must only be the last-resort fallback, never the primary.
 */
export function createPrimaryProvider(): ImageGenerationProvider {
  // 1. Cloudflare Workers AI (best free option — 100K neurons/day)
  const cfAccountId = process.env.CLOUDFLARE_ACCOUNT_ID
  const cfApiToken = process.env.CLOUDFLARE_API_TOKEN
  if (cfAccountId && cfApiToken) {
    const model = process.env.CLOUDFLARE_IMAGE_MODEL ?? DEFAULT_CLOUDFLARE_MODEL
    return new CloudflareProvider(cfAccountId, cfApiToken, model)
  }

  // 2. Pollinations flux-dev (always available, free, no auth)
  // Explicitly flux-dev — NOT configurable via env var to prevent
  // accidental flux-realism selection (which produces bland cinematic images).
  return new PollinationsProvider('flux-dev')
}

/**
 * Create the premium fallback provider (Gemini Pro Image).
 * Returns null if GEMINI_API_KEY is not configured.
 */
export function createPremiumProvider(): ImageGenerationProvider | null {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return null
  const modelId = process.env.IMAGE_MODEL_PREMIUM ?? 'gemini-3-pro-image'
  return new GeminiProvider(apiKey, modelId)
}

/**
 * Create the legacy fallback provider (Pollinations, no auth required).
 * Uses flux-realism as fallback model for maximum compatibility.
 */
export function createFallbackProvider(): ImageGenerationProvider {
  return new PollinationsProvider('flux-realism')
}
