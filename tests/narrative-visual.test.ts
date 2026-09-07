/**
 * Narrative Visual Memory Tests — "The image IS the narrative mnemonic."
 *
 * Spec: "The Narrative Storyline is the source of truth for the generated
 * image." The image must be the visual execution of the story — not an
 * independent illustration of the same topic.
 *
 * Fixtures (the spec's own worked examples):
 *   - Dural Venous Sinuses: protagonist pathway story (Captain Vega, §15)
 *   - Thyroid: characterless object story (stone citadel, §16)
 *
 * Each fixture walks the chain: story → beats → image prompt → coverage →
 * refined prompt, and verifies §2 action, §3 character, §6 order, §7 no
 * disappearances, §8 no invented symbols, §9 identity consistency, §14
 * prompt structure, §17 coverage, §18 refinement.
 */

import { describe, it, expect } from 'vitest'
import { type MemorySymbol, type StoryBeat } from '../app/types'
import {
  validateStoryBeats,
  deriveStoryBeatsFromStory,
  compileNarrativeImagePrompt,
  computeVisualStoryCoverage,
  refineNarrativeImagePrompt,
} from '../app/lib/memory-representation'

// ── Fixtures ──────────────────────────────────────────────────────────────

const DURAL_STORY =
  'Captain Vega steps onto the glowing blue spine rail. ' +
  'She travels to the torcular hub. ' +
  'She turns right onto the broad transverse conduit. ' +
  'She slides down the S-shaped sigmoid chute into the jugular exit.'

const DURAL_SYMBOLS: MemorySymbol[] = [
  { cue: 'glowing blue spine rail', fact: 'superior sagittal sinus' },
  { cue: 'torcular hub', fact: 'confluence of sinuses' },
  { cue: 'broad transverse conduit', fact: 'transverse sinus' },
  { cue: 'S-shaped sigmoid chute', fact: 'sigmoid sinus' },
  { cue: 'jugular exit', fact: 'internal jugular vein' },
]

const DURAL_BEATS: StoryBeat[] = [
  { order: 1, character: 'Captain Vega', action: 'steps onto', object: 'glowing blue spine rail', location: 'central station spine', medicalMeaning: 'superior sagittal sinus' },
  { order: 2, character: 'Captain Vega', action: 'travels to', object: 'torcular hub', location: 'central junction', medicalMeaning: 'confluence of sinuses' },
  { order: 3, character: 'Captain Vega', action: 'turns right onto', object: 'broad transverse conduit', medicalMeaning: 'transverse sinus' },
  { order: 4, character: 'Captain Vega', action: 'slides down', object: 'S-shaped sigmoid chute', medicalMeaning: 'sigmoid sinus' },
]

const THYROID_STORY =
  "The stone citadel stands before the white pillar. " +
  "A golden river reaches the upper tower. " +
  "A crimson stream reaches the lower tower. " +
  "Behind the walls a silver snake moves through the narrow gorge. " +
  "The citadel suddenly swells and compresses the pillar and the snake's path."

const THYROID_SYMBOLS: MemorySymbol[] = [
  { cue: 'stone citadel', fact: 'thyroid gland' },
  { cue: 'white pillar', fact: 'trachea' },
  { cue: 'golden river', fact: 'superior thyroid artery' },
  { cue: 'crimson stream', fact: 'inferior thyroid artery' },
  { cue: 'silver snake', fact: 'recurrent laryngeal nerve' },
]

const THYROID_BEATS: StoryBeat[] = [
  { order: 1, action: 'the stone citadel stands before the white pillar', object: 'stone citadel', medicalMeaning: 'thyroid gland' },
  { order: 2, action: 'a golden river reaches the upper tower', object: 'golden river', medicalMeaning: 'superior thyroid artery' },
  { order: 3, action: 'a crimson stream reaches the lower tower', object: 'crimson stream', medicalMeaning: 'inferior thyroid artery' },
  { order: 4, action: 'a silver snake moves through the narrow gorge', object: 'silver snake', medicalMeaning: 'recurrent laryngeal nerve' },
  { order: 5, action: "the citadel swells outward and compresses the pillar and the snake's path", object: 'citadel', medicalMeaning: 'goiter compression' },
]

const STYLE = 'clean editorial vector style, restrained palette, generous negative space'
const NEGATIVE = 'no text labels, no arrows, no watermarks, no cartoon chibi'

function duralPrompt(overrides: Partial<Parameters<typeof compileNarrativeImagePrompt>[0]> = {}) {
  return compileNarrativeImagePrompt(
    {
      topic: 'Dural Venous Sinuses',
      story: DURAL_STORY,
      visualScene: 'Captain Vega journeying along a glowing blue rail to a large junction hub, then rightward along a broad conduit and down an S-shaped chute toward a rounded exit.',
      sceneSetting: 'a luminous transit network running along the inside of the skull',
      sceneRoute: 'central rail back to the hub, then right and down to the neck exit',
      storyBeats: DURAL_BEATS,
      symbols: DURAL_SYMBOLS,
      ...overrides,
    },
    STYLE,
    NEGATIVE,
  )
}

function thyroidPrompt(overrides: Partial<Parameters<typeof compileNarrativeImagePrompt>[0]> = {}) {
  return compileNarrativeImagePrompt(
    {
      topic: 'Thyroid Anatomy',
      story: THYROID_STORY,
      visualScene: 'A stone fortress world at the front of the neck: citadel facing a pillar, golden and crimson rivers reaching the upper and lower towers, silver snake threading through the gorge behind the walls.',
      sceneSetting: 'a stone fortress world at the front of the neck',
      sceneRoute: 'citadel face, rivers to the towers, gorge behind',
      storyBeats: THYROID_BEATS,
      symbols: THYROID_SYMBOLS,
      ...overrides,
    },
    STYLE,
    NEGATIVE,
  )
}

// ── validateStoryBeats ────────────────────────────────────────────────────

describe('validateStoryBeats — model output → usable beats', () => {
  it('keeps valid beats and renumbers order to array position', () => {
    const validated = validateStoryBeats(DURAL_BEATS.map((b, i) => ({ ...b, order: (i + 1) * 10 })))
    expect(validated).toHaveLength(4)
    expect(validated.map(b => b.order)).toEqual([1, 2, 3, 4])
    expect(validated[0].character).toBe('Captain Vega')
    expect(validated[0].medicalMeaning).toBe('superior sagittal sinus')
  })

  it('caps at 6 beats for long storyboards (visual-overload guard)', () => {
    const long = Array.from({ length: 10 }, (_, i) => ({
      action: `action number ${i + 1}`, object: `object number ${i + 1}`,
      medicalMeaning: `fact number ${i + 1}`,
    }))
    expect(validateStoryBeats(long)).toHaveLength(6)
  })

  it('drops entries with too-short action or object and skips non-objects', () => {
    const mixed = [
      { action: 'ab', object: 'torcular hub' },
      { action: 'travels to', object: 'x' },
      'not-an-object',
      { action: 'valid action phrase', object: 'valid object phrase', medicalMeaning: 'si' },
    ]
    const result = validateStoryBeats(mixed)
    expect(result).toHaveLength(1)
    expect(result[0].object).toBe('valid object phrase')
    expect(result[0].medicalMeaning).toBeUndefined()
  })

  it('returns empty array for non-array input', () => {
    expect(validateStoryBeats(undefined)).toEqual([])
    expect(validateStoryBeats(null)).toEqual([])
    expect(validateStoryBeats('nope')).toEqual([])
  })
})

// ── deriveStoryBeatsFromStory ─────────────────────────────────────────────

describe('deriveStoryBeatsFromStory — fallback parser', () => {
  it('derives beats in story order, matching each sentence to its best symbol', () => {
    const beats = deriveStoryBeatsFromStory(DURAL_STORY, DURAL_SYMBOLS)
    expect(beats.length).toBe(4)
    expect(beats.map(b => b.order)).toEqual([1, 2, 3, 4])
    expect(beats[0].object).toBe('glowing blue spine rail')
    expect(beats[0].medicalMeaning).toBe('superior sagittal sinus')
    expect(beats[1].object).toBe('torcular hub')
    expect(beats[3].object).toBe('S-shaped sigmoid chute')
    expect(beats[3].medicalMeaning).toBe('sigmoid sinus')
  })

  it('uses the sentence itself as the object when no symbol matches', () => {
    const beats = deriveStoryBeatsFromStory(
      'Alpha beacon rises above the distant ridge. Beta beacon sinks into the marsh.',
      [],
    )
    expect(beats).toHaveLength(2)
    expect(beats[0].object).toBe(beats[0].action)
    expect(beats[0].medicalMeaning).toBeUndefined()
  })

  it('returns [] for empty or whitespace-only story', () => {
    expect(deriveStoryBeatsFromStory('', DURAL_SYMBOLS)).toEqual([])
    expect(deriveStoryBeatsFromStory('   ', DURAL_SYMBOLS)).toEqual([])
  })
})

// ── compileNarrativeImagePrompt (§14 structure) ───────────────────────────

describe('compileNarrativeImagePrompt — story-first prompt structure', () => {
  it('begins with NARRATIVE CONTEXT — the story, not medical facts, drives the composition (§14)', () => {
    const prompt = duralPrompt()
    expect(prompt.startsWith('NARRATIVE CONTEXT')).toBe(true)
    // compileNarrativeImagePrompt strips trailing punctuation, so assert the
    // story is embedded via a characteristic sentence rather than the exact string.
    expect(prompt).toContain('Captain Vega steps onto the glowing blue spine rail')
    expect(prompt).toContain('slides down the S-shaped sigmoid chute')
  })

  it('emits all §14 sections in the required order for a protagonist story (dural)', () => {
    const prompt = duralPrompt()
    const headers = [
      'NARRATIVE CONTEXT', 'SETTING', 'CHARACTER/GUIDE', 'STORY BEATS',
      'OBJECT CONSISTENCY', 'ACTION REQUIREMENTS', 'SPATIAL/SEQUENCE REQUIREMENTS',
      'MEDICAL ACCURACY', 'VISUAL STYLE',
    ]
    const idx = headers.map(h => prompt.indexOf(h))
    expect(idx.every(i => i >= 0)).toBe(true)
    expect([...idx].sort((a, b) => a - b)).toEqual(idx)
  })

  it('omits the CHARACTER/GUIDE section when the story has no protagonist (thyroid)', () => {
    const prompt = thyroidPrompt()
    expect(prompt.indexOf('CHARACTER/GUIDE')).toBe(-1)
    const headers = [
      'NARRATIVE CONTEXT', 'SETTING', 'STORY BEATS', 'OBJECT CONSISTENCY',
      'ACTION REQUIREMENTS', 'SPATIAL/SEQUENCE REQUIREMENTS', 'MEDICAL ACCURACY', 'VISUAL STYLE',
    ]
    const idx = headers.map(h => prompt.indexOf(h))
    expect(idx.every(i => i >= 0)).toBe(true)
    expect([...idx].sort((a, b) => a - b)).toEqual(idx)
  })

  it('preserves every story element verbatim — silver snake stays a snake, never a curved tube (§7)', () => {
    const prompt = thyroidPrompt()
    for (const cue of ['stone citadel', 'white pillar', 'golden river', 'crimson stream', 'silver snake']) {
      expect(prompt.toLowerCase()).toContain(cue)
    }
  })

  it('makes the story verbs visible: steps onto, slides, swells, compresses (§5)', () => {
    const dural = duralPrompt()
    expect(dural.toLowerCase()).toMatch(/steps onto|slides down|travels to/)
    const thyroid = thyroidPrompt()
    expect(thyroid.toLowerCase()).toMatch(/swells|compresses|reaches/)
  })

  it('instructs the image model to show action, never a static lineup (§2)', () => {
    const prompt = duralPrompt()
    expect(prompt).toMatch(/Never objects sitting statically/i)
    expect(prompt).toMatch(/mid-stride/)
  })

  it('bans introducing new major symbols beyond the story (§8)', () => {
    const prompt = duralPrompt()
    expect(prompt).toMatch(/Do NOT introduce any new major object/i)
  })

  it('embeds the medical mappings for every beat (§9)', () => {
    const prompt = duralPrompt()
    for (const m of ['superior sagittal sinus', 'confluence of sinuses', 'transverse sinus', 'sigmoid sinus']) {
      expect(prompt.toLowerCase()).toContain(m)
    }
  })

  it('orders beats in prompt text: Beat 1 before Beat 2 before Beat 3 before Beat 4 (§6)', () => {
    const prompt = duralPrompt()
    const i1 = prompt.indexOf('Beat 1')
    const i2 = prompt.indexOf('Beat 2')
    const i3 = prompt.indexOf('Beat 3')
    const i4 = prompt.indexOf('Beat 4')
    expect(i1).toBeGreaterThan(-1)
    expect(i1).toBeLessThan(i2)
    expect(i2).toBeLessThan(i3)
    expect(i3).toBeLessThan(i4)
  })

  it('names the protagonist as the story guide when a character exists (§3)', () => {
    const prompt = duralPrompt()
    expect(prompt).toMatch(/Captain Vega is the story's guide/)
    expect(prompt).toMatch(/never a decorative figure standing idle/)
  })

  it('requires one coherent world, not five unrelated illustrations (§4)', () => {
    const prompt = duralPrompt()
    expect(prompt).toMatch(/one coherent world, not five unrelated illustrations/)
  })
})

// ── computeVisualStoryCoverage (§17) + refineNarrativeImagePrompt (§18) ──

describe('coverage & refinement — quality gate before the image model', () => {
  it('a well-formed compiled prompt passes all seven coverage checks (§17)', () => {
    const prompt = duralPrompt()
    const cov = computeVisualStoryCoverage(prompt, DURAL_BEATS, DURAL_SYMBOLS)
    expect(cov.storyBeatCoverage).toBe(true)
    expect(cov.characterCoverage).toBe(true)
    expect(cov.objectCoverage).toBe(true)
    expect(cov.actionCoverage).toBe(true)
    expect(cov.sequenceCoverage).toBe(true)
    expect(cov.spatialCoverage).toBe(true)
    expect(cov.medicalMappingCoverage).toBe(true)
    expect(cov.passed).toBe(true)
  })

  it('fails when a major story object is replaced with a weakening synonym (§18 failure condition)', () => {
    const drift = duralPrompt().replace(/torcular hub/gi, 'round chamber')
    const cov = computeVisualStoryCoverage(drift, DURAL_BEATS, DURAL_SYMBOLS)
    expect(cov.objectCoverage).toBe(false)
    expect(cov.passed).toBe(false)
  })

  it('refinement restores the story elements so coverage passes (§18 deterministic reinforcement)', () => {
    const drift = duralPrompt().replace(/torcular hub/gi, 'round chamber')
    const refined = refineNarrativeImagePrompt(drift, DURAL_BEATS, DURAL_SYMBOLS)
    const cov = computeVisualStoryCoverage(refined, DURAL_BEATS, DURAL_SYMBOLS)
    expect(cov.passed).toBe(true)
  })

  it('refinement alone satisfies the §18 guarantee even on a totally unrelated base prompt', () => {
    const refined = refineNarrativeImagePrompt('a generic medical scene', DURAL_BEATS, DURAL_SYMBOLS)
    const cov = computeVisualStoryCoverage(refined, DURAL_BEATS, DURAL_SYMBOLS)
    expect(cov.passed).toBe(true)
  })

  it('fails when the protagonist disappears (§18 failure condition)', () => {
    const noHero = duralPrompt().replace(/Captain Vega/gi, 'someone')
    const cov = computeVisualStoryCoverage(noHero, DURAL_BEATS, DURAL_SYMBOLS)
    expect(cov.characterCoverage).toBe(false)
    expect(cov.passed).toBe(false)
  })
})

// ── End-to-end: story → beats → prompt → retrieval phrasing (§13/§20) ──

describe('story → beats → prompt → retrieval cue consistency', () => {
  it('every story beat renders the exact phrase the retrieval UI will show back to the learner', () => {
    // The RetrievalTest shows "From your story: {character} {action} {object}"
    // — the same identifiers must flow story → beats → image prompt.
    const prompt = duralPrompt()
    for (const b of DURAL_BEATS) {
      const phrase = b.character ? `${b.character} ${b.action}` : b.action
      const head = phrase.toLowerCase().split(/\s+/).slice(0, 3).join(' ')
      expect(prompt.toLowerCase()).toContain(head)
    }
  })

  it('the fallback parser + compile pipeline still produces a passing prompt when the LLM omits storyBeats', () => {
    const derived = deriveStoryBeatsFromStory(DURAL_STORY, DURAL_SYMBOLS)
    expect(derived.length).toBeGreaterThanOrEqual(2)
    const prompt = compileNarrativeImagePrompt(
      {
        topic: 'Dural Venous Sinuses', story: DURAL_STORY,
        visualScene: 'Captain Vega journeying along a glowing blue rail to a hub.',
        sceneSetting: 'skull transit network', sceneRoute: 'rail to hub',
        storyBeats: derived, symbols: DURAL_SYMBOLS,
      },
      STYLE, NEGATIVE,
    )
    const cov = computeVisualStoryCoverage(prompt, derived, DURAL_SYMBOLS)
    expect(cov.passed).toBe(true)
  })

  it('the thyroid characterless fixture also passes the full chain (§16)', () => {
    const prompt = thyroidPrompt()
    const cov = computeVisualStoryCoverage(prompt, THYROID_BEATS, THYROID_SYMBOLS)
    expect(cov.passed).toBe(true)
    expect(prompt.toLowerCase()).toContain('silver snake')
    expect(prompt.toLowerCase()).toContain('recurrent laryngeal nerve')
  })
})
