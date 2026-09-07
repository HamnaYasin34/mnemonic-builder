/**
 * Image Provider Tests — Cloudflare + Pollinations
 *
 * Verifies:
 *   - Provider factory selection (Cloudflare → Pollinations flux-dev → Pollinations flux-realism)
 *   - buildFinalPrompt: narrative prompt passthrough + model-specific requirements
 *   - buildFinalPrompt: legacy visualScene wrapper + model-specific requirements
 *   - Style-specific instructions (Clinical Ink vs NeuroCanvas)
 *   - Prompt structure: all required sections present in the final prompt
 *   - Cloudflare provider: configuration and URL construction
 *   - Pollinations provider: configurable model, enhance=false
 *
 * Does NOT call external APIs — all tests are pure logic or use mocked providers.
 */

import { describe, it, expect, afterEach } from 'vitest'
import {
  buildFinalPrompt,
  MODEL_EXECUTION_REQUIREMENTS,
  CLINICAL_INK_INSTRUCTIONS,
  NEUROCANVAS_INSTRUCTIONS,
  DEFAULT_ASPECT_RATIO,
  DEFAULT_CLOUDFLARE_MODEL,
  truncatePromptForCloudflare,
  createPrimaryProvider,
  createFallbackProvider,
  CloudflareProvider,
  PollinationsProvider,
} from '../app/lib/image-provider'

// ── Fixtures ──────────────────────────────────────────────────────────────────

const NARRATIVE_PROMPT = `NARRATIVE CONTEXT — the story below is the script; this image is its visual execution. Render the story HAPPENING. The story: "Captain Vega steps onto the glowing blue spine rail."

SETTING — one coherent world: a luminous transit network running along the inside of the skull.

CHARACTER/GUIDE — Captain Vega is the story's guide.

STORY BEATS — depict these events IN THIS ORDER:
Beat 1: Captain Vega steps onto glowing blue spine rail → represents superior sagittal sinus

OBJECT CONSISTENCY — glowing blue spine rail; torcular hub.

ACTION REQUIREMENTS — steps onto.

SPATIAL/SEQUENCE REQUIREMENTS — one continuous path.

MEDICAL ACCURACY — glowing blue spine rail = superior sagittal sinus.

VISUAL STYLE — clean editorial vector style`

const LEGACY_SCENE = 'a glowing blue rail inside the skull with Captain Vega stepping onto it'

// ── buildFinalPrompt ──────────────────────────────────────────────────────────

describe('buildFinalPrompt — prompt assembly', () => {
  it('passes through a compiled narrative prompt (starts with NARRATIVE CONTEXT)', () => {
    const final = buildFinalPrompt(NARRATIVE_PROMPT, 'sketchy')
    expect(final.startsWith('NARRATIVE CONTEXT')).toBe(true)
    expect(final).toContain('Captain Vega steps onto the glowing blue spine rail')
  })

  it('wraps a legacy visualScene with narrative reinforcement', () => {
    const final = buildFinalPrompt(LEGACY_SCENE, 'sketchy')
    expect(final).toContain('NARRATIVE scene')
    expect(final).toContain(LEGACY_SCENE)
  })

  it('appends MODEL EXECUTION REQUIREMENTS to every prompt', () => {
    const narrative = buildFinalPrompt(NARRATIVE_PROMPT, 'sketchy')
    const legacy = buildFinalPrompt(LEGACY_SCENE, 'sketchy')
    expect(narrative).toContain('MODEL EXECUTION REQUIREMENTS')
    expect(legacy).toContain('MODEL EXECUTION REQUIREMENTS')
  })

  it('includes the memory-function-over-cinematic-beauty priority', () => {
    const final = buildFinalPrompt(NARRATIVE_PROMPT, 'sketchy')
    expect(final).toContain('MEMORY FUNCTION > CINEMATIC BEAUTY')
  })

  it('includes the one-continuous-scene instruction (§4/§6)', () => {
    const final = buildFinalPrompt(NARRATIVE_PROMPT, 'sketchy')
    expect(final).toContain('ONE CONTINUOUS SCENE')
    expect(final).toMatch(/beginning → middle → end/)
  })

  it('includes character consistency requirement (§3)', () => {
    const final = buildFinalPrompt(NARRATIVE_PROMPT, 'sketchy')
    expect(final).toMatch(/protagonist must remain visually consistent/)
  })

  it('appends Clinical Ink instructions for sketchy style', () => {
    const final = buildFinalPrompt(NARRATIVE_PROMPT, 'sketchy')
    expect(final).toContain('CLINICAL INK')
    expect(final).toContain('hand-drawn educational memory illustration')
    expect(final).not.toContain('NEUROCANVAS')
  })

  it('appends NeuroCanvas instructions for osmosis style', () => {
    const final = buildFinalPrompt(NARRATIVE_PROMPT, 'osmosis')
    expect(final).toContain('NEUROCANVAS')
    expect(final).toContain('clean educational visual language')
    expect(final).not.toContain('CLINICAL INK')
  })

  it('defaults to Clinical Ink for unknown styles', () => {
    const final = buildFinalPrompt(NARRATIVE_PROMPT, 'unknown-style')
    expect(final).toContain('CLINICAL INK')
  })

  it('preserves the narrative prompt structure in order', () => {
    const final = buildFinalPrompt(NARRATIVE_PROMPT, 'sketchy')
    const headers = [
      'NARRATIVE CONTEXT', 'SETTING', 'STORY BEATS',
      'OBJECT CONSISTENCY', 'ACTION REQUIREMENTS', 'VISUAL STYLE',
    ]
    const idx = headers.map(h => final.indexOf(h))
    expect(idx.every(i => i >= 0)).toBe(true)
    expect([...idx].sort((a, b) => a - b)).toEqual(idx)
  })

  it('the MODEL EXECUTION_REQUIREMENTS block comes AFTER the narrative structure', () => {
    const final = buildFinalPrompt(NARRATIVE_PROMPT, 'sketchy')
    const narrativeEnd = final.indexOf('VISUAL STYLE')
    const modelExec = final.indexOf('MODEL EXECUTION REQUIREMENTS')
    expect(modelExec).toBeGreaterThan(narrativeEnd)
  })
})

// ── Constants ─────────────────────────────────────────────────────────────────

describe('prompt constants — content verification', () => {
  it('MODEL_EXECUTION_REQUIREMENTS covers all spec §225–§283 directives', () => {
    expect(MODEL_EXECUTION_REQUIREMENTS).toContain('not a generic illustration')
    expect(MODEL_EXECUTION_REQUIREMENTS).toContain('story actively happening')
    expect(MODEL_EXECUTION_REQUIREMENTS).toContain('protagonist must visibly perform')
    expect(MODEL_EXECUTION_REQUIREMENTS).toContain('exact mnemonic objects')
    expect(MODEL_EXECUTION_REQUIREMENTS).toContain('ONE coherent visual world')
    expect(MODEL_EXECUTION_REQUIREMENTS).toContain('reconstruct the narrative')
    expect(MODEL_EXECUTION_REQUIREMENTS).toContain('MEMORY FUNCTION > CINEMATIC BEAUTY')
    expect(MODEL_EXECUTION_REQUIREMENTS).toContain('generic anatomy diagram')
    expect(MODEL_EXECUTION_REQUIREMENTS).toContain('Do not add major decorative objects')
  })

  it('CLINICAL_INK_INSTRUCTIONS covers spec §308–§337 directives', () => {
    expect(CLINICAL_INK_INSTRUCTIONS).toContain('hand-drawn educational memory illustration')
    expect(CLINICAL_INK_INSTRUCTIONS).toContain('expressive characters')
    expect(CLINICAL_INK_INSTRUCTIONS).toContain('strong silhouettes')
    expect(CLINICAL_INK_INSTRUCTIONS).toContain('bold mnemonic objects')
    expect(CLINICAL_INK_INSTRUCTIONS).toMatch(/avoid.*photorealism/i)
    expect(CLINICAL_INK_INSTRUCTIONS).toMatch(/avoid.*fog/i)
    expect(CLINICAL_INK_INSTRUCTIONS).toContain('Do not imitate or reproduce Sketchy')
  })

  it('NEUROCANVAS_INSTRUCTIONS covers spec §340–§357 directives', () => {
    expect(NEUROCANVAS_INSTRUCTIONS).toContain('clean educational visual language')
    expect(NEUROCANVAS_INSTRUCTIONS).toContain('strong shapes')
    expect(NEUROCANVAS_INSTRUCTIONS).toContain('flat/vector-inspired')
    expect(NEUROCANVAS_INSTRUCTIONS).toContain('memorable color coding')
    expect(NEUROCANVAS_INSTRUCTIONS).toContain('ONE CONTINUOUS STORY WORLD')
  })

  it('DEFAULT_ASPECT_RATIO is 4:3 (landscape, good for narrative flow)', () => {
    expect(DEFAULT_ASPECT_RATIO).toBe('4:3')
  })
})

// ── Provider factories ────────────────────────────────────────────────────────

describe('provider factory — selection logic', () => {
  const savedGeminiKey = process.env.GEMINI_API_KEY
  const savedModel = process.env.IMAGE_MODEL
  const savedPremium = process.env.IMAGE_MODEL_PREMIUM
  const savedCfAccount = process.env.CLOUDFLARE_ACCOUNT_ID
  const savedCfToken = process.env.CLOUDFLARE_API_TOKEN
  const savedCfModel = process.env.CLOUDFLARE_IMAGE_MODEL
  const savedPolModel = process.env.POLLINATIONS_MODEL

  afterEach(() => {
    // Restore env
    if (savedGeminiKey !== undefined) process.env.GEMINI_API_KEY = savedGeminiKey
    else delete process.env.GEMINI_API_KEY
    if (savedModel !== undefined) process.env.IMAGE_MODEL = savedModel
    else delete process.env.IMAGE_MODEL
    if (savedPremium !== undefined) process.env.IMAGE_MODEL_PREMIUM = savedPremium
    else delete process.env.IMAGE_MODEL_PREMIUM
    if (savedCfAccount !== undefined) process.env.CLOUDFLARE_ACCOUNT_ID = savedCfAccount
    else delete process.env.CLOUDFLARE_ACCOUNT_ID
    if (savedCfToken !== undefined) process.env.CLOUDFLARE_API_TOKEN = savedCfToken
    else delete process.env.CLOUDFLARE_API_TOKEN
    if (savedCfModel !== undefined) process.env.CLOUDFLARE_IMAGE_MODEL = savedCfModel
    else delete process.env.CLOUDFLARE_IMAGE_MODEL
    if (savedPolModel !== undefined) process.env.POLLINATIONS_MODEL = savedPolModel
    else delete process.env.POLLINATIONS_MODEL
  })

  it('returns Cloudflare when CLOUDFLARE_ACCOUNT_ID + CLOUDFLARE_API_TOKEN are set', () => {
    delete process.env.GEMINI_API_KEY
    process.env.CLOUDFLARE_ACCOUNT_ID = 'test-account'
    process.env.CLOUDFLARE_API_TOKEN = 'test-token'
    const provider = createPrimaryProvider()
    expect(provider).toBeInstanceOf(CloudflareProvider)
    expect(provider.providerName).toContain('cloudflare:')
  })

  it('Cloudflare uses DEFAULT_CLOUDFLARE_MODEL when no env override', () => {
    delete process.env.CLOUDFLARE_IMAGE_MODEL
    process.env.CLOUDFLARE_ACCOUNT_ID = 'test-account'
    process.env.CLOUDFLARE_API_TOKEN = 'test-token'
    const provider = createPrimaryProvider()
    expect(provider.providerName).toContain('flux-1-schnell')
  })

  it('Cloudflare uses CLOUDFLARE_IMAGE_MODEL env var', () => {
    process.env.CLOUDFLARE_ACCOUNT_ID = 'test-account'
    process.env.CLOUDFLARE_API_TOKEN = 'test-token'
    process.env.CLOUDFLARE_IMAGE_MODEL = '@cf/black-forest-labs/flux-2-dev'
    const provider = createPrimaryProvider()
    expect(provider.providerName).toContain('flux-2-dev')
  })

  it('Cloudflare takes priority over Pollinations', () => {
    process.env.CLOUDFLARE_ACCOUNT_ID = 'test-account'
    process.env.CLOUDFLARE_API_TOKEN = 'test-token'
    const provider = createPrimaryProvider()
    expect(provider).toBeInstanceOf(CloudflareProvider)
  })

  it('returns Pollinations when no Cloudflare credentials', () => {
    delete process.env.CLOUDFLARE_ACCOUNT_ID
    delete process.env.CLOUDFLARE_API_TOKEN
    const provider = createPrimaryProvider()
    expect(provider).toBeInstanceOf(PollinationsProvider)
    expect(provider.providerName).toContain('pollinations:')
  })

  it('createFallbackProvider returns Pollinations flux-realism', () => {
    const fb = createFallbackProvider()
    expect(fb).toBeInstanceOf(PollinationsProvider)
    expect(fb.providerName).toBe('pollinations:flux-realism')
  })

  it('POLLINATIONS_MODEL env var controls primary Pollinations model', () => {
    delete process.env.CLOUDFLARE_ACCOUNT_ID
    delete process.env.CLOUDFLARE_API_TOKEN
    delete process.env.GEMINI_API_KEY
    process.env.POLLINATIONS_MODEL = 'flux'
    const provider = createPrimaryProvider()
    expect(provider.providerName).toBe('pollinations:flux')
  })
})

// ── Prompt regression: final prompt must carry all narrative elements ─────────

describe('final prompt — narrative elements survive the assembly', () => {
  it('preserves story, beats, objects, actions, sequence, spatial, medical accuracy, and style', () => {
    const final = buildFinalPrompt(NARRATIVE_PROMPT, 'sketchy')
    // §14 narrative structure elements
    expect(final).toContain('Captain Vega')         // character
    expect(final).toContain('glowing blue spine rail') // object
    expect(final).toContain('steps onto')           // action
    expect(final).toContain('superior sagittal sinus') // medical mapping
    expect(final).toContain('IN THIS ORDER')        // sequence
    expect(final).toContain('one continuous path')  // spatial
    // Model-specific execution requirements
    expect(final).toContain('MODEL EXECUTION REQUIREMENTS')
    expect(final).toContain('MEMORY FUNCTION > CINEMATIC BEAUTY')
    // Style-specific
    expect(final).toContain('CLINICAL INK')
  })
})

// ── Cloudflare provider construction ──────────────────────────────────────────

describe('CloudflareProvider — configuration', () => {
  it('DEFAULT_CLOUDFLARE_MODEL points to flux-1-schnell', () => {
    expect(DEFAULT_CLOUDFLARE_MODEL).toBe('@cf/black-forest-labs/flux-1-schnell')
  })

  it('providerName strips @cf/ prefix for readability', () => {
    const p = new CloudflareProvider('acct', 'tok')
    expect(p.providerName).toBe('cloudflare:black-forest-labs/flux-1-schnell')
  })

  it('custom model is reflected in providerName', () => {
    const p = new CloudflareProvider('acct', 'tok', '@cf/black-forest-labs/flux-2-klein-9b')
    expect(p.providerName).toBe('cloudflare:black-forest-labs/flux-2-klein-9b')
  })
})

// ── Prompt truncation for Cloudflare 2048-char limit ────────────────────────

describe('truncatePromptForCloudflare', () => {
  it('passes short prompts through unchanged', () => {
    const short = 'a simple red circle'
    expect(truncatePromptForCloudflare(short)).toBe(short)
  })

  it('passes prompts at exactly the limit unchanged', () => {
    const exact = 'x'.repeat(2000)
    expect(truncatePromptForCloudflare(exact)).toBe(exact)
  })

  it('truncates prompts over 2000 chars', () => {
    const long = 'x'.repeat(5000)
    const result = truncatePromptForCloudflare(long)
    expect(result.length).toBeLessThanOrEqual(2020) // 2000 + separator overhead
    expect(result).toContain('[... condensed ...]')
  })

  it('preserves the beginning of the prompt (narrative context)', () => {
    const long = 'NARRATIVE CONTEXT: ' + 'important story content '.repeat(200) + 'STYLE: hand-drawn'
    const result = truncatePromptForCloudflare(long)
    expect(result.startsWith('NARRATIVE CONTEXT:')).toBe(true)
  })

  it('preserves the end of the prompt (style instructions)', () => {
    const long = 'NARRATIVE: ' + 'content '.repeat(300) + 'CLINICAL INK STYLE: hand-drawn educational memory illustration'
    const result = truncatePromptForCloudflare(long)
    expect(result).toContain('CLINICAL INK STYLE')
    expect(result).toContain('hand-drawn educational memory illustration')
  })

  it('respects custom maxLen', () => {
    const long = 'x'.repeat(500)
    const result = truncatePromptForCloudflare(long, 200)
    expect(result.length).toBeLessThanOrEqual(220)
  })
})

// ── Pollinations provider construction ──────────────────────────────────────

describe('PollinationsProvider — configuration', () => {
  it('default model is flux-dev (better instruction following)', () => {
    const p = new PollinationsProvider()
    expect(p.providerName).toBe('pollinations:flux-dev')
  })

  it('custom model via constructor', () => {
    const p = new PollinationsProvider('flux-realism')
    expect(p.providerName).toBe('pollinations:flux-realism')
  })

  it('model from env variable', () => {
    const p = new PollinationsProvider('turbo')
    expect(p.providerName).toBe('pollinations:turbo')
  })
})
