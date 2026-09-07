// ─────────────────────────────────────────────────────────────────────────────
// app/lib/memory-representation.ts
// The MemoryRepresentation layer — the "one source of truth" of a mnemonic.
//
// The generator produces a structured symbol map (symbols: cue → fact, with
// type/location/action) alongside its narrative fields. Everything downstream
// is DERIVED here in plain TypeScript, never re-generated: the memory
// breakdown, the image prompt, and the audio tour. That guarantees the
// mnemonic, story, scene, image and narration always describe the same
// memory, and keeps the future Symbol Explorer / hotspot / hide-reveal modes
// possible (every cue is independently addressable).
// ─────────────────────────────────────────────────────────────────────────────

import { MemorySymbol, StoryBeat } from '../types'

/** Max symbols in one scene — beyond this the image becomes visual clutter. */
const MAX_SYMBOLS = 9

/** Coerce an unknown JSON value into a clean string[] (drops junk, caps length). */
export function coerceStringArray(value: unknown, max: number): string[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
    .map(s => s.trim())
    .slice(0, max)
}

/**
 * Validate the model's symbols[] output: keep only entries that carry a real
 * cue AND a real fact. Returns [] when the array is missing or unusable —
 * callers must then fall back to the legacy free-text paths (model-written
 * mnemonicKey, paragraph-compiled image prompt).
 */
export function validateSymbols(value: unknown): MemorySymbol[] {
  if (!Array.isArray(value)) return []
  const out: MemorySymbol[] = []
  for (const item of value) {
    if (out.length >= MAX_SYMBOLS) break // clutter guard
    if (!item || typeof item !== 'object') continue
    const cue = typeof item.cue === 'string' ? item.cue.trim() : ''
    const fact = typeof item.fact === 'string' ? item.fact.trim() : ''
    if (cue.length < 3 || fact.length < 3) continue
    out.push({
      cue,
      fact,
      type: typeof item.type === 'string' && item.type.trim() ? item.type.trim() : undefined,
      location: typeof item.location === 'string' && item.location.trim() ? item.location.trim() : undefined,
      action: typeof item.action === 'string' && item.action.trim() ? item.action.trim() : undefined,
      retrievalTrigger: typeof item.retrievalTrigger === 'string' && item.retrievalTrigger.trim() ? item.retrievalTrigger.trim() : undefined,
      memoryProblem: typeof item.memoryProblem === 'string' && item.memoryProblem.trim() ? item.memoryProblem.trim() : undefined,
    })
  }
  return out
}

/**
 * Generic-object detector: short cue phrases built around bare nouns like
 * "tube", "box", "ball" without distinctive modifiers are unlikely to create
 * a specific retrieval cue — they could represent hundreds of medical facts.
 * This list is intentionally short; the goal is flagging obvious generics,
 * not penalising every common noun.
 */
const GENERIC_CUE_PATTERNS = [
  /^a\s+/, /^the\s+/, /^some\s+/,
  /\b(generic|simple|basic|plain)\b/i,
]
const BARE_NOUNS = /^(tube|box|ball|door|arrow|road|tunnel|person|book|container|object|tool|machine|pipe|channel|path|line|circle|square|triangle|shape|object|thing)$/i

/**
 * Phase 3 mnemonic-strength model. Extends the Phase 2 scorer with:
 * - retrievalTrigger quality bonus (short, specific cues score higher)
 * - generic-object penalty (bare nouns without distinctive modifiers)
 * - heavier forcedness penalty (cue is just the fact renamed)
 * - memory-problem awareness (symbols with an identified problem score slightly higher)
 */
export function computeMnemonicStrength(s: MemorySymbol): number {
  let score = 50
  const type = (s.type ?? '').toLowerCase()
  // Non-literal associations create additional retrieval cues beyond visualization
  if (type === 'phonetic' || type === 'semantic') score += 25
  else if (type === 'functional' || type === 'morphological') score += 20
  else if (type === 'spatial') score += 5
  // else literal: no bonus
  if (s.location) score += 8
  if (s.action) score += 10

  // RetrievalTrigger quality: short (2-6 words) specific cues get a bonus.
  // Missing or bloated triggers (>8 words) get no bonus.
  if (s.retrievalTrigger) {
    const trigWords = s.retrievalTrigger.trim().split(/\s+/).length
    if (trigWords >= 2 && trigWords <= 6) score += 8
    else if (trigWords > 8) score -= 3
  }

  // Memory-problem awareness: symbols with an identified problem type
  // show the model thought about WHY this fact is hard to remember.
  if (s.memoryProblem) score += 3

  // Forcedness penalty: cue text is suspiciously close to fact text.
  // Phase 3: heavier penalty than Phase 2, and also check bigram overlap.
  const cueWords = new Set(s.cue.toLowerCase().split(/\s+/))
  const factWords = new Set(s.fact.toLowerCase().split(/\s+/))
  let overlap = 0
  for (const w of cueWords) if (w.length > 2 && factWords.has(w)) overlap++
  if (cueWords.size > 0 && overlap / cueWords.size > 0.5) score -= 25
  else if (cueWords.size > 0 && overlap / cueWords.size > 0.3) score -= 12

  // Generic-object penalty: bare nouns without distinctive modifiers
  // could represent hundreds of facts — they fail the specificity test.
  const cueStripped = s.cue.replace(/^(a|the|some)\s+/i, '').trim()
  if (BARE_NOUNS.test(cueStripped)) score -= 18
  for (const pat of GENERIC_CUE_PATTERNS) {
    if (pat.test(s.cue)) { score -= 5; break }
  }

  return Math.max(0, Math.min(100, score))
}

/**
 * Quality label derived from the strength score — the UI shows this instead
 * of raw numbers so students see "Strong" instead of "78".
 */
export function classifyQuality(strength: number): string {
  if (strength >= 85) return 'Excellent'
  if (strength >= 70) return 'Strong'
  if (strength >= 55) return 'Acceptable'
  return 'Weak'
}

/**
 * Batch-apply quality scoring to a set of symbols. Also detects cues that
 * are too similar to each other (interference risk): if two cues share >70%
 * of their content words, both get a small penalty — they may be confused
 * during retrieval.
 */
export function applySymbolQuality(symbols: MemorySymbol[]): void {
  // Score each symbol individually
  symbols.forEach(s => {
    (s as any).mnemonicStrength = computeMnemonicStrength(s)
  })
  // Interference check: penalise cues that are too similar to siblings
  for (let i = 0; i < symbols.length; i++) {
    for (let j = i + 1; j < symbols.length; j++) {
      const wordsA = new Set(symbols[i].cue.toLowerCase().split(/\s+/).filter(w => w.length > 2))
      const wordsB = new Set(symbols[j].cue.toLowerCase().split(/\s+/).filter(w => w.length > 2))
      if (wordsA.size === 0 || wordsB.size === 0) continue
      let shared = 0
      for (const w of wordsA) if (wordsB.has(w)) shared++
      const minSize = Math.min(wordsA.size, wordsB.size)
      if (minSize > 0 && shared / minSize > 0.7) {
        const sA: any = symbols[i]
        const sB: any = symbols[j]
        sA.mnemonicStrength = Math.max(0, (sA.mnemonicStrength ?? 50) - 8)
        sB.mnemonicStrength = Math.max(0, (sB.mnemonicStrength ?? 50) - 8)
      }
    }
  }
  // Assign quality labels from the (possibly adjusted) scores
  symbols.forEach(s => {
    s.qualityLabel = classifyQuality((s as any).mnemonicStrength ?? 50)
  })
}

/**
 * Memory Breakdown ("Visual cue → Medical fact" lines) derived from the symbol
 * map — never independently generated, so it can never contradict the scene.
 */
export function deriveBreakdown(symbols: MemorySymbol[], architecture?: string, isAuto = false): string {
  const header = isAuto && architecture ? `[Architecture: ${architecture}]\n` : ''
  return header + symbols.map(s => `${s.cue} → ${s.fact}`).join('\n')
}

/**
 * Audio narration that follows the visual memory route: setting → route →
 * each landmark with its meaning → the mnemonic as the tie-off. Audio
 * therefore walks the same scene the image renders, instead of reading the
 * explanation aloud.
 */
export function buildMemoryTour(
  sceneSetting?: string,
  sceneRoute?: string,
  symbols: MemorySymbol[] = [],
  mnemonic?: string,
): string {
  const strip = (s: string) => s.replace(/\s*[.;]+\s*$/, '')
  const parts: string[] = []
  // Orientation
  if (sceneSetting) parts.push(`You are looking at ${strip(sceneSetting)}.`)
  if (sceneRoute) parts.push(`Walk the route: ${strip(sceneRoute)}.`)
  // Walk through each landmark with natural transitions and SHORT retrieval cues
  symbols.forEach((s, i) => {
    const where = s.location ? ` at ${strip(s.location)}` : ''
    const doing = s.action ? `, ${strip(s.action)}` : ''
    // Use the short retrieval trigger for natural narration; fall back to
    // the full fact when no trigger was provided.
    const meaning = s.retrievalTrigger ? strip(s.retrievalTrigger) : strip(s.fact)
    const transition = i === 0 ? 'First, notice' : (i === symbols.length - 1 ? 'Finally, notice' : 'Next, notice')
    parts.push(`${transition} the ${strip(s.cue)}${where}${doing} — ${meaning}.`)
  })
  if (mnemonic) parts.push(`Tie it together: ${strip(mnemonic)}`)
  return parts.join(' ')
}

/**
 * Compile the image prompt FROM the structured scene spec (setting, route,
 * symbols with position/action) rather than a free-text paragraph alone: the
 * image model is handed an explicit rendering specification — what is
 * present, where it sits, what it is doing — so it renders the mnemonic
 * instead of inventing one.
 */
export function compileImagePromptFromSpec(
  parsed: {
    visualScene: string
    sceneSetting?: string
    sceneRoute?: string
    symbols?: MemorySymbol[]
  },
  styleBlock: string,
  negativePrompt: string,
): string {
  const strip = (s: string) => s.replace(/\s*[.;]+\s*$/, '')
  const setting = parsed.sceneSetting ? `Setting: ${strip(parsed.sceneSetting)}. ` : ''
  const route = parsed.sceneRoute ? `Composition and viewing route: ${strip(parsed.sceneRoute)}. ` : ''
  // List only the symbol NAMES — their positions and actions are already
  // described in the visualScene paragraph. This avoids duplicating ~500
  // chars of location text and keeps the prompt focused for the image model.
  const symbols = parsed.symbols ?? []
  const elements = symbols.length > 0
    ? `Required elements (all must appear): ${symbols.map(s => strip(s.cue)).join(', ')}. `
    : ''
  return `${styleBlock} ${setting}${route}${elements}Scene to depict: ${parsed.visualScene}. ${negativePrompt}`
}

// ─────────────────────────────────────────────────────────────────────────────
// NARRATIVE STORYBOARD LAYER
// The narrative storyline is the source of truth for the image: the story is
// the script, the story beats are the shot sequence, and the image is the
// visual execution of that story. Everything below derives the image prompt
// FROM the beats — never an independent illustration of the same topic.
// ─────────────────────────────────────────────────────────────────────────────

/** Max beats in one storyboard — the image renders the story's key events, not every sentence of the explanation (visual-overload guard). */
const MAX_BEATS = 6

/** §17 quality-check result for a compiled narrative image prompt. */
export interface VisualStoryCoverage {
  storyBeatCoverage: boolean
  characterCoverage: boolean
  objectCoverage: boolean
  actionCoverage: boolean
  sequenceCoverage: boolean
  spatialCoverage: boolean
  medicalMappingCoverage: boolean
  passed: boolean
}

/** Content words (>3 chars) of a phrase, lowercased — the matching vocabulary for beats ↔ symbols ↔ prompt. */
function contentWords(s: string): string[] {
  return s.toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length > 3)
}

/**
 * Validate the model's storyBeats[] output: keep only entries carrying a real
 * action AND a real object, normalize order to array position, cap at 6.
 * Returns [] when unusable — the caller then derives beats from the story text.
 */
export function validateStoryBeats(value: unknown): StoryBeat[] {
  if (!Array.isArray(value)) return []
  const out: StoryBeat[] = []
  for (const item of value) {
    if (out.length >= MAX_BEATS) break
    if (!item || typeof item !== 'object') continue
    const object = typeof item.object === 'string' ? item.object.trim() : ''
    const action = typeof item.action === 'string' ? item.action.trim() : ''
    if (object.length < 3 || action.length < 3) continue
    const medicalMeaning = typeof item.medicalMeaning === 'string' ? item.medicalMeaning.trim() : ''
    out.push({
      order: out.length + 1,
      character: typeof item.character === 'string' && item.character.trim() ? item.character.trim() : undefined,
      action,
      object,
      location: typeof item.location === 'string' && item.location.trim() ? item.location.trim() : undefined,
      medicalMeaning: medicalMeaning.length >= 3 ? medicalMeaning : undefined,
    })
  }
  return out
}

/**
 * Fallback beat parser: split the storyline into sentences (the story's
 * natural beats) and match each sentence to its best-overlapping symbol, so
 * even legacy/failed storyBeats[] output still yields a story-driven
 * storyboard. Sentences without a symbol match still become beats — the
 * story itself drives the image even when the mapping layer is thin.
 */
export function deriveStoryBeatsFromStory(story: string, symbols: MemorySymbol[]): StoryBeat[] {
  if (!story?.trim()) return []
  const sentences = story
    .split(/(?<=[.!?])\s+|\n+/)
    .map(s => s.trim())
    .filter(s => s.length >= 10)
    .slice(0, MAX_BEATS)
  return sentences.map((sentence, i) => {
    const words = new Set(contentWords(sentence))
    let best: MemorySymbol | null = null
    let bestOverlap = 0
    for (const sym of symbols) {
      let overlap = 0
      for (const w of contentWords(sym.cue)) if (words.has(w)) overlap++
      if (overlap > bestOverlap) { bestOverlap = overlap; best = sym }
    }
    return {
      order: i + 1,
      action: sentence,
      object: best ? best.cue : sentence,
      location: best?.location,
      medicalMeaning: best?.fact,
    }
  })
}

/** Render one beat as a prompt line. Fallback beats carry the whole sentence as their action — don't repeat the object when it already appears inside it. */
function renderBeat(beat: StoryBeat): string {
  const strip = (s: string) => s.replace(/\s*[.;]+\s*$/, '')
  const meaning = beat.medicalMeaning ? ` → represents ${strip(beat.medicalMeaning)}` : ''
  if (beat.action.toLowerCase().includes(beat.object.toLowerCase())) {
    return `${strip(beat.action)}${meaning}`
  }
  const actor = beat.character ? `${strip(beat.character)} ` : ''
  const loc = beat.location ? ` (at ${strip(beat.location)})` : ''
  return `${actor}${strip(beat.action)} ${strip(beat.object)}${loc}${meaning}`
}

/**
 * Compile the image prompt FROM the narrative storyboard (spec §14 structure):
 * NARRATIVE CONTEXT → SETTING → CHARACTER → STORY BEATS → OBJECT CONSISTENCY →
 * ACTION REQUIREMENTS → SPATIAL/SEQUENCE REQUIREMENTS → MEDICAL ACCURACY →
 * VISUAL STYLE. The narrative drives the composition — never the medical
 * facts with the story as an afterthought.
 */
export function compileNarrativeImagePrompt(
  parsed: {
    topic?: string
    story: string
    visualScene: string
    sceneSetting?: string
    sceneRoute?: string
    storyBeats: StoryBeat[]
    symbols?: MemorySymbol[]
  },
  styleBlock: string,
  negativePrompt: string,
): string {
  const strip = (s: string) => s.replace(/\s*[.;]+\s*$/, '')
  const beats = parsed.storyBeats
  const symbols = parsed.symbols ?? []
  const characters = [...new Set(beats.map(b => b.character).filter((c): c is string => !!c))]

  const sections: string[] = []

  sections.push(
    `NARRATIVE CONTEXT — the story below is the script; this image is its visual execution. Render the story HAPPENING, not a static illustration of the topic${parsed.topic ? ` "${parsed.topic}"` : ''}. The story: "${strip(parsed.story)}"`,
  )

  if (parsed.sceneSetting) {
    sections.push(`SETTING — one coherent world, not five unrelated illustrations placed together: ${strip(parsed.sceneSetting)}.`)
  }

  if (characters.length > 0) {
    sections.push(
      `CHARACTER/GUIDE — ${characters.join(' and ')} is the story's guide. Show them actively progressing through the scene: beginning at the first landmark, moving toward the next, interacting with the third, performing the key action, reaching the final landmark. Their visible movement IS part of the mnemonic — never a decorative figure standing idle in a corner.`,
    )
  }

  sections.push(
    `STORY BEATS — depict these events IN THIS ORDER:\n${beats.map((b, i) => `Beat ${i + 1}: ${renderBeat(b)}`).join('\n')}`,
  )

  if (symbols.length > 0) {
    sections.push(
      `OBJECT CONSISTENCY — every one of these exact story objects must appear, each keeping its exact identity (a "silver snake" stays a visually recognizable snake; never substitute a generic alternative, synonym, or curved tube): ${symbols.map(s => strip(s.cue)).join('; ')}. Do NOT introduce any new major object, character, or symbol beyond this list — every major object in the image must serve the memory.`,
    )
  }

  const actionPhrases = [...new Set(beats.map(b => strip(b.action.split(/\s+/).slice(0, 3).join(' '))))]
  sections.push(
    `ACTION REQUIREMENTS — the scene must show these verbs visibly happening (${actionPhrases.join('; ')}): characters mid-stride, objects actively swelling/pressing/sliding/turning/blocking — whatever the story says, the image must show it being DONE. Never objects sitting statically side by side.`,
  )

  sections.push(
    `SPATIAL/SEQUENCE REQUIREMENTS — the story order must read clearly as beginning → middle → end through the composition: one continuous path${parsed.sceneRoute ? ` (${strip(parsed.sceneRoute)})` : ''} the eye walks left-to-right or top-to-bottom, connected landmarks, visible progression. Do not scatter unrelated vignettes and do not add arbitrary decorative arrows — the character's movement and the path itself carry the sequence.`,
  )

  const mappings = beats.filter(b => b.medicalMeaning).map(b => `${strip(b.object)} = ${strip(b.medicalMeaning!)}`)
  if (mappings.length > 0) {
    sections.push(
      `MEDICAL ACCURACY — the world and characters are metaphorical, but the relationships are not: ${mappings.join('; ')}. Preserve these mappings exactly — never invent anatomy, mechanisms, or findings, and never replace a story object with something that breaks its mapping.`,
    )
  }

  sections.push(
    `SCENE DESCRIPTION (supporting reference — must not contradict the beats above): ${strip(parsed.visualScene)}.`,
  )

  sections.push(`VISUAL STYLE — ${styleBlock} ${negativePrompt}`)

  return sections.join('\n\n')
}

/** All content words of `phrase` appear in `text`. */
function phraseCovered(phrase: string, text: string): boolean {
  const words = contentWords(phrase)
  if (words.length === 0) return true
  const present = new Set(contentWords(text))
  return words.every(w => present.has(w))
}

/**
 * §17 visual-story quality check: verify the compiled prompt actually carries
 * every major story beat, memory object, action, the sequence, the spatial
 * progression, the character, and the medical mappings — BEFORE it is sent to
 * the image model.
 */
export function computeVisualStoryCoverage(
  prompt: string,
  beats: StoryBeat[],
  symbols: MemorySymbol[],
): VisualStoryCoverage {
  const p = prompt.toLowerCase()
  const storyBeatCoverage = beats.length > 0 && beats.every(b => phraseCovered(b.object, p))
  const characterCoverage = beats.every(b => !b.character || phraseCovered(b.character, p))
  const objectCoverage = symbols.every(s => phraseCovered(s.cue, p))
  const actionCoverage = beats.every(b => {
    const verb = contentWords(b.action)[0]
    return !verb || p.includes(verb)
  })
  const sequenceCoverage = /beat \d/.test(p) && /(in this order|beginning)/.test(p)
  const spatialCoverage = /(spatial\/sequence|continuous path|setting)/.test(p)
  const medicalMappingCoverage = beats.every(b => !b.medicalMeaning || phraseCovered(b.medicalMeaning, p))
  const passed =
    storyBeatCoverage && characterCoverage && objectCoverage && actionCoverage &&
    sequenceCoverage && spatialCoverage && medicalMappingCoverage
  return {
    storyBeatCoverage, characterCoverage, objectCoverage, actionCoverage,
    sequenceCoverage, spatialCoverage, medicalMappingCoverage, passed,
  }
}

/**
 * §18 refinement: when the coverage check fails, deterministically append a
 * MANDATORY block that re-states every beat, object, and mapping — the image
 * model must not lose story elements to prompt compression. Deterministic
 * reinforcement (never a second LLM call) guarantees the refined prompt passes
 * the coverage check.
 */
export function refineNarrativeImagePrompt(
  prompt: string,
  beats: StoryBeat[],
  symbols: MemorySymbol[],
): string {
  const strip = (s: string) => s.replace(/\s*[.;]+\s*$/, '')
  const lines: string[] = [
    'MANDATORY NARRATIVE ELEMENTS — the scene is incomplete without every one of these:',
    `Story events in this order:\n${beats.map((b, i) => `Beat ${i + 1}: ${renderBeat(b)}`).join('\n')}`,
    'SEQUENCE & PATH — one continuous path through one coherent world: the events above visibly happening in this order, beginning to middle to end.',
  ]
  if (symbols.length > 0) {
    lines.push(`Required story objects, keeping their exact identities: ${symbols.map(s => strip(s.cue)).join('; ')}.`)
  }
  const mappings = beats.filter(b => b.medicalMeaning).map(b => `${strip(b.object)} = ${strip(b.medicalMeaning!)}`)
  if (mappings.length > 0) {
    lines.push(`Medical mappings that must stay intact: ${mappings.join('; ')}.`)
  }
  return `${prompt}\n\n${lines.join('\n\n')}`
}
