import { NextRequest, NextResponse } from 'next/server'
import { MnemonicType, VisualStyle, StoryStyle } from '../../types'
import {
  fetchGroqWithRetry,
  parseWithRecovery,
  validateRequiredFields,
  buildCompactRetryMessages,
  type FieldValidationFailure,
} from '../../lib/groq-utils'
import {
  coerceStringArray,
  validateSymbols,
  validateStoryBeats,
  deriveStoryBeatsFromStory,
  deriveBreakdown,
  buildMemoryTour,
  compileImagePromptFromSpec,
  compileNarrativeImagePrompt,
  computeVisualStoryCoverage,
  refineNarrativeImagePrompt,
  applySymbolQuality,
} from '../../lib/memory-representation'

// ─────────────────────────────────────────────────────────────────────────────
// Provider configuration — every Groq/gpt-oss-specific request parameter lives
// here so the selected provider's capabilities are explicit and a future
// provider swap changes exactly one block.
// ─────────────────────────────────────────────────────────────────────────────
const GROQ_CHAT_URL = 'https://api.groq.com/openai/v1/chat/completions'
const GROQ_MODEL = 'openai/gpt-oss-120b'

// gpt-oss is a REASONING model: hidden chain-of-thought tokens are billed
// against the same max_tokens budget as the JSON answer itself. At the default
// 'medium' effort the model burned 800-2,500+ reasoning tokens before writing
// a single output character, starving the JSON and truncating it before the
// "mnemonic" field (#8 of 19, right after the large symbols/storyBeats arrays)
// — the root cause of the "missing mnemonic" errors. 'low' keeps reasoning
// under ~50 tokens (verified live) so the output gets the budget.
const GROQ_REASONING_EFFORT = 'low'

// TPM budget math (Groq on-demand gpt-oss-120b: 8,000 tokens/minute, checked
// pre-flight as prompt_tokens + max_tokens): the full mnemonic prompt is
// ~3,500 tokens, so 3,500 + 4,000 = 7,500 < 8,000 — a request fits a fresh
// window. Do NOT raise max_tokens without re-checking this: at 4,500 the
// request equals the entire per-minute budget and a second generation within
// the same minute fails with HTTP 413 rate_limit_exceeded.
const GROQ_MAX_TOKENS = 4000

// The single compact retry asks only for the required fields with tight
// length caps (small prompt + small reserve ≈ 1,700 tokens) so it fits the
// per-minute budget remaining right after a full attempt.
const RETRY_MAX_TOKENS = 1200

/** Fields the rest of the app cannot function without (existing schema). */
const REQUIRED_FIELDS: Array<[string, number]> = [
  ['explanation', 20],
  ['mnemonic', 5],
  ['story', 20],
  ['visualScene', 20],
]

/** Strict JSON schema for the compact retry — Groq enforces it server-side,
 *  guaranteeing every required field is present in the retry response. */
const COMPACT_RETRY_JSON_SCHEMA = {
  type: 'json_schema' as const,
  json_schema: {
    name: 'mnemonic_compact',
    strict: true,
    schema: {
      type: 'object',
      properties: {
        subject: { type: 'string', description: 'The subject ID (e.g. anatomy, pathology)' },
        mnemonic: { type: 'string', description: 'The memorable mnemonic phrase' },
        explanation: { type: 'string', description: 'Core concept, mechanism chain, 1-2 high-yield facts' },
        visualMemoryAnchor: { type: 'string', description: 'Two sentences starting with "Follow the scene:"' },
        story: { type: 'string', description: 'Exactly 4 short lines in the requested style' },
        visualScene: { type: 'string', description: 'One coherent literal scene description, max 90 words' },
        ankiFront: { type: 'string', description: 'Exam-style question' },
        ankiBack: { type: 'string', description: 'Answer + mechanism' },
        question: { type: 'string', description: 'Flashcard question (same as ankiFront)' },
        answer: { type: 'string', description: 'Flashcard answer (same as ankiBack)' },
        quizQuestion: { type: 'string', description: 'Short self-test question' },
        quizAnswer: { type: 'string', description: 'One-line answer' },
      },
      required: ['subject', 'mnemonic', 'explanation', 'visualMemoryAnchor', 'story', 'visualScene', 'ankiFront', 'ankiBack', 'question', 'answer', 'quizQuestion', 'quizAnswer'],
      additionalProperties: false,
    },
  },
}

/** Development-only diagnostic logging — never active in production. */
const isDev = process.env.NODE_ENV === 'development'
function devLog(...args: unknown[]) {
  if (isDev) console.log('[MnemonicFlow API]', ...args)
}

const MNEMONIC_TYPE_RULES: Record<MnemonicType, string> = {
  acronym: 'Build the mnemonic as a strict FIRST-LETTER ACRONYM only. Each letter of a single word/phrase = one key fact, in order. No storyline needed — the story field should briefly justify the acronym word choice in 1-2 lines.',
  storyline: 'Build the mnemonic as a CHARACTER-DRIVEN STORYLINE. One specific named character physically acts out the mechanism step by step across exactly 4 lines. The mnemonic field is the one-line absurd/hilarious hook sentence; the story field is the full scene.',
  spatial: 'Build the mnemonic as a VISUAL SPATIAL LAYOUT. Describe fixed positions (top-left, center, bottom-right, foreground, background) where each fact "lives" in the scene, the way a labeled anatomical diagram works. The story field should describe the spatial map in words; no characters required, just landmarks and labeled zones.',
  hybrid: 'Build the mnemonic as a HYBRID: a short acronym AND a 4-line character storyline AND explicit spatial positions for each fact in the scene. Combine all three so the acronym letters map onto labeled positions a character visits in order.',
  hook: 'Build the mnemonic as ONE CRAZY HOOK: a single short, weird, visually vivid sentence or phrase the student can recall in 3-5 seconds — NOT a full acronym, NOT a multi-part structure. It must stay relevant to the real mechanism, not just be silly for its own sake. Easy beats clever: if a simpler, dumber sentence is more memorable than an elegant one, use the simpler one. The story field then briefly (in the 4 lines) shows this hook happening.',
  auto: `AUTO-SELECT the best architecture for THIS specific topic before writing anything else, by privately reasoning through: how many discrete facts need encoding, whether there is a natural sequence or spatial/branching relationship, whether a clean acronym exists without being forced, and whether a single visual metaphor is strong enough to replace all of that. Then commit fully to ONE of: a strict acronym, a character-driven storyline, a spatial layout, a hybrid of these, or (if the concept is simple enough) a single crazy hook — whichever makes recall EASIEST, not most elaborate. Do not default to the same architecture every time; different topics should get different structures. State the architecture you chose in the "architecture" field.`,
}

const VISUAL_STYLE_RULES: Record<VisualStyle, string> = {
  sketchy: `SKETCHY MEDICAL AESTHETIC — hand-drawn ink line art, fine cross-hatching and stippling shading, rich saturated flat coloring (no gradients), bold black outlines, concrete spatial scene layout on a plain pale background, characters and objects as strict literal visual metaphors for the clinical fact (e.g. a specific weapon = a specific mechanism of action, a costume detail = a specific receptor or enzyme). Comic-panel composition, slightly exaggerated proportions, medical-textbook-meets-graphic-novel look.`,
  osmosis: `OSMOSIS WHITEBOARD AESTHETIC — clean flat-vector illustration, soft watercolor texture fills, minimal thin outlines, friendly muted color palette (teal/coral/cream), generous white space, clear sans-serif style labels implied in the composition, intuitive simplified anatomical/process schema, whiteboard-explainer-video look, no fine detail clutter.`,
}

const NEGATIVE_PROMPT = 'NOT 3D render, NOT Pixar style, NOT cartoon character eyes, NOT glossy plastic textures, NOT photorealism, NOT claymation, NOT CGI animation still.'

// ─────────────────────────────────────────────────────────────────────────────
// MEME_TEMPLATES — Meme Recall™ picks ONE of these by name and recreates its
// exact panel/composition LOGIC (not a real person's likeness — every template
// below is described generically so the illustration renders as an original
// drawing acting out the format, never a photo of an actual public figure).
// ─────────────────────────────────────────────────────────────────────────────
interface MemeTemplate { name: string; format: string }
const MEME_TEMPLATES: MemeTemplate[] = [
  { name: 'Gigachad', format: 'a single dramatic black-and-white close-up of an exaggeratedly chiseled, stoic figure looking off to the side with heroic lighting — used to frame one fact as the objectively "correct" or "based" choice' },
  { name: 'Drake', format: 'a two-panel vertical stack: top panel a figure turns away in rejection/disgust from one label, bottom panel the same figure points and smiles approvingly at a second label — used to contrast a wrong approach vs. the right one' },
  { name: 'Distracted Boyfriend', format: 'three figures walking: one figure visibly turns to stare at a new option while their partner reacts with shock/annoyance — used to show attention being "distracted" from the obvious right answer toward a tempting wrong one' },
  { name: 'Galaxy Brain', format: 'a vertical sequence of 3-4 panels, each showing a brain glowing brighter/more cosmic than the last, paired with increasingly "elevated" (and increasingly wrong or absurd) framings of an idea — used to escalate from the simple correct fact to an overcomplicated wrong one' },
  { name: 'UNO Reverse', format: 'a hand dramatically holding up a reversal card at a tense moment, flipping the direction of an interaction — used to show one factor cancelling out or reversing another' },
  { name: 'Woman Yelling at Cat', format: 'two-panel split: on one side a figure pointing and yelling emotionally across a table, on the other side a calm, unbothered animal sitting at a dinner table looking unimpressed — used to contrast a dramatic reaction with an indifferent/unaffected process' },
  { name: 'Surprised Pikachu', format: 'a single panel: a small round wide-eyed character with an exaggerated flat, open-mouthed "shocked" expression — used for a "predictable but somehow still surprising" outcome' },
  { name: 'This Is Fine', format: 'a calm figure sitting at a table sipping a drink while the room around them is engulfed in flames — used to show a system continuing to function on the surface while something underneath is actually failing' },
  { name: 'NPC', format: 'a flat, grey, expressionless generic figure standing in a static default pose against a plain background — used to represent a default/baseline state before something changes it' },
  { name: 'Bro Is Cooked', format: 'a single reaction panel with a slightly blurred/zoomed dramatic close-up on a figure realizing something has gone badly wrong for them — used for an outcome that spells clear failure for a cell, pathogen, or process' },
  { name: "Nah I'd Win", format: 'a two-panel size/threat comparison: a small confident figure squares up against a much larger imposing figure, captioned with unbothered confidence — used when a small factor still overpowers something much bigger' },
  { name: 'Standing Here I Realize', format: 'a lone figure standing in a vast, quiet, epic-scale landscape having a sudden moment of clarity — used for a slow-dawning realization about how a mechanism actually works' },
]
function pickMemeTemplate(): MemeTemplate {
  return MEME_TEMPLATES[Math.floor(Math.random() * MEME_TEMPLATES.length)]
}

// ─────────────────────────────────────────────────────────────────────────────
// STORY_STYLE_RULES
// Each entry is a full writing philosophy, not a paint-by-numbers "tone" tag.
// It defines: the voice, the world the mechanism gets mapped into, concrete
// narrative devices to use, and — critically — what to avoid, so ten
// different styles actually read like ten different pieces of writing
// instead of the same paragraph with a reskinned vocabulary.
// ─────────────────────────────────────────────────────────────────────────────
const STORY_STYLE_RULES: Record<StoryStyle, string> = {
  clinical: `WRITING PHILOSOPHY — CLINICAL:
Voice: a sharp attending physician teaching a case on rounds. Precise, confident, economical.
World: real clinical settings are allowed and expected here — wards, ORs, clinics, patients, doctors.
Devices: ground the mechanism in a concrete clinical vignette (a specific presentation, a specific decision point). Every sentence should carry diagnostic or mechanistic weight — no filler.
Avoid: flowery language, jokes, or genre trappings. This is the one style where "boring but bulletproof" beats "creative."`,

  dramatic: `WRITING PHILOSOPHY — DRAMATIC:
Voice: literary, theatrical, high emotional stakes — think stage play or awards-season screenplay, not a soap opera.
World: personal and human stakes with real weight: an inheritance dispute, a courtroom reckoning, a reunion after years apart, a storm-battered household, a rivalry between siblings. Do NOT default to a hospital deathbed scene — that is the cliché this style must avoid.
Devices: build tension through what a character wants and what stands in their way; let the medical mechanism BE the obstacle or the turning point (e.g. a betrayal that mirrors an enzyme being blocked, a locked door that mirrors a channel closing). Use short, weighted sentences at the climax.
Avoid: melodrama for its own sake, generic hospital-drama tropes, and opening with a diagnosis.`,

  comedy: `WRITING PHILOSOPHY — COMEDY:
Voice: a sharp sitcom writer's room — witty, fast, character-driven humor, not dad-joke puns.
World: everyday absurd chaos: a wedding gone wrong, an office prank war, a family road trip, a reality-TV competition, roommates feuding over rent. Never set it in a hospital or clinic.
Devices: build the joke through escalating misunderstanding or a character's specific flaw, and land the mechanism as the PUNCHLINE, not a footnote after the joke. Comic timing matters — vary sentence length, save the biggest laugh for the last line.
Avoid: random silliness disconnected from the mechanism, and "doctor tells a joke" framing.`,

  fantasy: `WRITING PHILOSOPHY — FANTASY:
Voice: epic high-fantasy narration — a chronicle of kingdoms, oaths, and magic.
World: build a small but vivid magic system where the medical mechanism becomes the RULE of that world — a spell, a curse, a guild's law, a creature's power, a kingdom's border. (Example logic, don't copy verbatim: a receptor becomes a locked gate only one key-bearer may open; an enzyme cascade becomes a chain of ritual spells each triggering the next.)
Devices: named realms, artifacts, and titles; a quest structure (a hero seeks/blocks/restores something) that mirrors the mechanism's steps in order.
Avoid: generic "wizard casts a spell" hand-waving — the magic's internal logic must map 1:1 onto the real mechanism.`,

  horror: `WRITING PHILOSOPHY — HORROR:
Voice: slow-building psychological dread — atmospheric, controlled, unsettling rather than gory.
World: gothic or eerie non-clinical settings: an abandoned house, a fog-locked village, a cursed family heirloom, a night shift at an empty building, a childhood home with one door that's never opened. Do not default to hospital-horror.
Devices: build dread through what's implied, not shown; give the mechanism a "monster" or "curse" that behaves exactly like the real biological process, with a final unsettling image that seals the memory.
Avoid: cheap jump-scares in prose form, gore for shock value, and hospital/patient framing.`,

  scifi: `WRITING PHILOSOPHY — SCI-FI:
Voice: crisp, speculative, technically confident — think a season-finale twist from a smart space or cyberpunk series.
World: a spaceship, a colony under a dome, a neural-implant city, an AI construct, a derelict station — the medical mechanism becomes a SYSTEM (life-support subroutine, security protocol, power relay, alien biology) with its own internal rules.
Devices: name the tech precisely (a console, a protocol, a override code) and let the system's failure/success map exactly onto the mechanism's steps.
Avoid: generic "in the future..." throat-clearing and hospital-in-space defaults.`,

  historical: `WRITING PHILOSOPHY — HISTORICAL:
Voice: grounded period narration with specific, accurate-feeling texture of a real era.
World: pick ONE concrete historical setting (e.g. a Roman legion camp, a medieval royal court, a Victorian shipping company, a WWII resistance cell, a 1920s speakeasy) and stay inside it — real stakes of that era, not a modern story in costume.
Devices: let period-accurate objects, ranks, or customs stand in for the mechanism's components; the story's conflict should resolve through the same sequence as the real process.
Avoid: vague "long ago" settings, and modern dialogue or slang bleeding into the era.`,

  detective: `WRITING PHILOSOPHY — DETECTIVE:
Voice: hardboiled noir narration — clipped, wary, a case being worked one clue at a time.
World: a private investigator's office, a rain-soaked street, a locked-room case, a suspect list — never a hospital ward.
Devices: structure the story as an investigation: a clue is found, a suspect is questioned, a red herring appears, the mechanism is the culprit "confession" at the end. Each clue should correspond to one step of the real mechanism, revealed in the correct order.
Avoid: forensic-pathologist-in-a-morgue framing (too close to clinical) — keep it street-level noir, not medical examiner procedural.`,

  movie: `WRITING PHILOSOPHY — MOVIE:
Voice: blockbuster trailer narration — punchy, cinematic, propulsive, present tense energy even in past tense prose.
World: a hero-vs-villain set piece — a heist, a rescue, a countdown, a final confrontation — staged anywhere except a hospital.
Devices: open mid-action, use short punchy sentence fragments for impact beats, and land the mechanism as the "big reveal" or "twist" moment right before the climax.
Avoid: slow scene-setting; get to the stakes in the first line, and never open on a diagnosis.`,

  anime: `WRITING PHILOSOPHY — ANIME:
Voice: shonen-battle energy — internal monologue, named special moves, rival dynamics, dramatic escalation.
World: a tournament arc, a rival showdown, a training arc, a team of specialists each with one "power" — the mechanism becomes a named technique or power-up with clear rules.
Devices: give the technique a bold declared name that encodes the real mechanism, build a rival or teammate dynamic, and escalate to a climactic clash where the technique's rule decides the outcome.
Avoid: hospital settings, and power-ups with no logical link back to the actual mechanism.`,

  meme: `WRITING PHILOSOPHY — MEME RECALL™:
Voice: current internet voice — punchy, self-aware, hyperbolic, quotable in one line, like a viral thread or a caption that would actually get shared.
World: relatable everyday chaos reframed as a meme scenario (group chat drama, "POV: you are the [X]", a chaotic group project, main-character-energy moments) — never a hospital.
Devices: use exaggerated stakes for comic effect, at least one quotable "this is the line people screenshot" sentence, and map the mechanism onto the meme's internal logic so the joke only fully lands if you know the fact.
Avoid: cringe try-hard slang stuffed in for its own sake — the humor must still turn on the medical mechanism, not replace it.`,
}

// Canonical settings for each style, used to keep the model's scene grounded
// once it starts writing the visual scene too.
const STORY_STYLE_SETTING_HINT: Record<StoryStyle, string> = {
  clinical: 'a real clinical setting (ward, OR, or clinic)',
  dramatic: 'a real-world, non-hospital setting with personal emotional stakes',
  comedy: 'an everyday, non-hospital setting with comedic potential',
  fantasy: 'an original fantasy realm with its own magic system',
  horror: 'an atmospheric, non-hospital, eerie setting',
  scifi: 'a speculative sci-fi setting (ship, colony, AI construct, etc.)',
  historical: 'one specific, real historical era and place',
  detective: 'a noir investigation setting, never a hospital or morgue',
  movie: 'a cinematic action set piece, never a hospital',
  anime: 'a shonen-style arc setting (tournament, rivalry, training), never a hospital',
  meme: 'a relatable modern-life meme scenario, never a hospital',
}

// Subject-specific memory design guidance (spec section 14) — tells the model
// what kind of relationship to prioritize encoding for each subject, instead
// of forcing every subject through the same storytelling formula.
const SUBJECT_FOCUS_HINTS: Record<string, string> = {
  anatomy: 'Prioritize SPATIAL relationships: position, landmarks, branches, routes, and how structures relate to their neighbors.',
  physiology: 'Prioritize CAUSE → EFFECT: feedback loops, signals, dynamic regulation — what triggers what.',
  biochemistry: 'Prioritize PATHWAYS: enzymes, substrates, products, regulation points, and what a deficiency breaks.',
  pharmacology: 'Prioritize the CHAIN: drug → target → mechanism → effect → adverse effect, in that exact order.',
  pathology: 'Prioritize CAUSE → CELLULAR CHANGE → MORPHOLOGY → MECHANISM → CLINICAL CONSEQUENCE.',
  microbiology: 'Prioritize: organism → morphology → virulence factor → transmission → clinical presentation → diagnosis → treatment.',
  medicine: 'Prioritize clinical reasoning: presentation → mechanism → diagnosis → management.',
  surgery: 'Prioritize procedural/anatomical sequence and the specific complication or indication being tested.',
}
function subjectFocusHint(subject: string): string {
  return SUBJECT_FOCUS_HINTS[subject] ?? 'Prioritize whichever relationship (spatial, causal, sequential, or pathway-based) makes this specific topic easiest to encode — do not force a generic structure onto it.'
}

function buildPrompt(
  topic: string,
  subject: string,
  mnemonicType: MnemonicType,
  visualStyle: VisualStyle,
  storyStyle: StoryStyle,
  memeTemplate?: MemeTemplate,
  learnerAdaptation?: string,
): string {
  const forbiddenOpeners = storyStyle === 'clinical'
    ? ''
    : `\n\nBANNED OPENERS: Never begin the story with "A doctor...", "A patient...", or "A hospital..." — that framing is reserved for Clinical mode only. Open instead with action, a character, a place, or a line of dialogue true to the ${storyStyle} world above.`

  const memeTemplateBlock = storyStyle === 'meme' && memeTemplate
    ? `\n\nMEME TEMPLATE TO RECREATE — you MUST use exactly this one, not a different meme: "${memeTemplate.name}". Format: ${memeTemplate.format}. The story's 4 lines must walk through this exact panel/beat structure, and the visual scene must describe recreating that composition literally (panel layout, poses, expressions) with the medical facts mapped onto each panel/role — never depict a real celebrity or public figure, use original generic-looking characters acting out the format.`
    : ''

  // Stage 3 of the pipeline below — how the memory architecture is chosen.
  const strategyStage = mnemonicType === 'auto'
    ? 'Ask what type of memory problem this is — a sequence wants a route, a classification wants grouped zones, a single hard term wants one crazy hook, a mechanism wants an action chain — then commit to the single architecture that makes recall EASIEST: a strict acronym ONLY if a natural one exists, otherwise a storyline, spatial layout, hybrid, or a single crazy hook for simple concepts. Do not default to the same architecture every time.'
    : `Commit to the required architecture for this generation: ${mnemonicType}.`

  // The staged FACT → TARGETS → STRATEGY → SYMBOLS → SCENE → DERIVE pipeline.
  // The model works through it silently in the SAME single call, and every
  // output field must be derived from its result — this is the
  // MemoryRepresentation the server-side derivation layer then reads from.
  // Inject learner adaptation signal between prioritization and strategy selection
  const learnerBlock = learnerAdaptation ? `\n\n${learnerAdaptation}\n` : ''

  const pipeline = `
MEMORY ARCHITECTURE PIPELINE — work through these stages silently, in order, BEFORE writing anything. Every field of your JSON must be derived from the result of these stages:

Stage 1 FACTS: Extract the discrete medical facts a student must actually recall for this topic (subject focus above). Not the whole chapter — the recall targets.
Stage 2 PRIORITIZE: Rank them must-remember / supporting / background, and note each core target's memory type (sequence, location, relationship, mechanism, association, number, classification, cause→effect, pathway). Only must-remember targets get symbols; supporting facts ride along in the explanation.
${learnerBlock}Stage 3 STRATEGY: ${strategyStage}
Stage 4 SYMBOLS: For each must-remember target, FIRST identify the memory problem (sequence? shape? branching? contrast? mechanism? association? number? laterality?), THEN silently generate 3 candidate symbols via different association paths (e.g. one literal, one phonetic/semantic, one functional/morphological), then pick the STRONGEST — the one that creates a genuinely NEW retrieval cue, not just a visual depiction of the medical structure. Do NOT force diversity: if all targets genuinely work best as spatial cues, that is fine — choose whatever best fits each fact, never manufacture variety for its own sake. Prefer phonetic, semantic, functional, or morphological associations when they are genuinely stronger than literal depiction — but a strong natural cue always beats a clever but forced one. For EACH candidate, silently test: (a) if the medical label were removed, could a student retrieve the fact? (b) could this same visual cue represent a DIFFERENT medical fact? If (b) is YES, the cue is too generic — pick a more specific one. Use the MINIMUM sufficient number of symbols: 4 strong symbols beat 8 weak ones. Each symbol must include a short retrievalTrigger (2-6 words) capturing the key retrieval cue for quick recall.
Stage 5 SCENE: Place the symbols into ONE coherent world whose zones and landmarks organize them. Spatial relationships must MEAN something — above/below/inside/blocking/flowing-into must mirror real anatomical or causal relationships, never be arbitrary. Give the scene a route in retrieval order so the learner can mentally walk it. If the concept is simple, keep the scene minimal — one strong symbol beats a crowded memory palace.
Stage 5.5 STORYBOARD: Split the storyline into 3-6 ordered visual beats — the story's shot sequence. Each beat keeps: the character (if the story has one), the action (the story's verb, e.g. "steps onto", "slides down"), the object (the EXACT symbol identity, e.g. "glowing blue spine rail" — same words the symbol map uses), the location, and the medical meaning it encodes. The image will render exactly these beats in this order, so they must retell the story with nothing added and nothing lost.
Stage 6 DERIVE: Only now write the output fields — mnemonic, story (a guided tour through that route, written in the style philosophy below), visualScene (the literal rendering of that exact scene), explanation, anki, quiz — all sharing the same symbols, the same order, the same relationships. Any layer that contradicts another is a failure: fix it before outputting.`

  return `You are a world-class medical memory architect for MBBS students, currently writing in the ${storyStyle.toUpperCase()} style. Your only goal: make this concept IMPOSSIBLE to forget. Generic explanations OR a story that could have been written in any other style are both failure conditions — the writing philosophy below is not decoration, it is the actual assignment.

Topic: "${topic}"
Subject: ${subject}
Subject focus: ${subjectFocusHint(subject)}

TOPIC/SUBJECT CHECK: If "${topic}" doesn't genuinely belong to ${subject} (e.g. a physiology topic entered under Anatomy), don't force a fake anatomical framing onto it. Either find the real anatomical angle if one honestly exists, or write the explanation from the discipline the topic actually belongs to and open the explanation with one short clause noting that, e.g. "(Primarily a physiology concept — explained accordingly.)" Never block generation over this, just be honest about it.

ONE MEMORY WORLD RULE (most important rule): the mnemonic, the story, and the visual scene are not three separate creative outputs — they are three views of the SAME memory. Every character, object, location, or action in the story must correspond to a real medical fact, and every one of those elements must reappear, unchanged, in the visual scene. If you invent a detail for the story that doesn't map to anything medical, cut it. If a fact is important enough to be in the mnemonic, it needs a visual anchor. Do not generate a mnemonic, a story, and an image that merely share a topic — they must share the same characters, objects, and sequence.

ANTI-REPETITION RULE: do not default to the same world every time regardless of style — e.g. don't make everything a city, a factory, a battlefield, or a detective's office just because it worked before. Do not reuse the same recurring metaphors (keys/locks/doors/cars/traffic/soldiers/messengers/villains) unless they are genuinely the strongest fit for THIS topic's actual mechanism. Build the metaphor from what the topic itself is doing, not from a stock toolkit.
${pipeline}

${STORY_STYLE_RULES[storyStyle]}${forbiddenOpeners}${memeTemplateBlock}

STRICT RULES:

1. EXPLANATION (the Concept Layer — accuracy over entertainment, plain educational voice regardless of story style): 
   - 1-2 concise sentences stating the core concept/definition.
   - Then the mechanism as a clear chain: A → B → C → D (or however many steps are real).
   - Then 2-4 High-Yield facts as short standalone sentences (cause/effect, key exceptions, important associations).
   - If genuinely relevant, one closing sentence of clinical correlation.
   - Total should still be compact — dense high-yield content, not padding. No jokes, no story voice here; this is the answer key the student actually studies from.

2. THE MNEMONIC: ${MNEMONIC_TYPE_RULES[mnemonicType]}
   Before finalizing it, silently check: is this actually easier to recall than the raw fact itself? Could a student repeat it after reading it once or twice? If not, simplify it rather than making it cleverer.
   NEVER force an acronym: if no natural acronym exists for these facts, use the closest real word or phrase — never invent filler words that encode nothing. A mnemonic must never exist merely because the format demands one.

3. THE STORYLINE:
- EXACTLY 4 LINES in one cohesive paragraph (or the spatial-map equivalent if mnemonic type is "spatial")
- Written entirely in the ${storyStyle} voice and world described above — not a clinical summary with genre words sprinkled on top
- NO alphabet/letter explanations ever
- Written as a chain of VISIBLE EVENTS the image can act out — every line advances the action (a character moves, an object changes, something is opened/blocked/compressed); the story's verbs are the image's actions
- Characters, forces, or zones must literally and physically/visually represent the medical mechanism step by step, using the ${storyStyle} world's own internal logic
- Structured as a guided tour through the scene's route — where you are, what you see, what it means, where you go next — not events happening somewhere off-scene
- Should read like a professionally written piece of ${storyStyle} fiction a person would actually want to read — not a teaching aid wearing a costume
- Must use ONLY elements that map to real facts per the One Memory World rule above — no decorative characters or events with no medical meaning

4. VISUAL SCENE: The visual presentation of the actual storyline — the story happening on canvas, NOT an independent illustration of the topic. Same characters/zones, same objects, same actions, set in ${STORY_STYLE_SETTING_HINT[storyStyle]}. If the story has a protagonist, they must be shown actively progressing through the beats — starting at the first landmark, moving to the next, performing the key action, arriving at the last — never standing decoratively in a corner. Every important story verb (steps onto, turns, slides, swells, compresses) must be visibly HAPPENING in the composition. The sequence must read beginning → middle → end through composition — one continuous path through one coherent world (left-to-right or top-to-bottom), never objects sitting statically side by side and never five unrelated vignettes placed together. Specific pose/expression/props/positions, nothing added or removed beyond the story. It must render exactly the symbols, beats, and route you designed in the pipeline — the image model will draw only what this description specifies. This will be fed directly to an image generator using a ${visualStyle === 'sketchy' ? 'Clinical Ink™ hand-drawn medical illustration' : 'NeuroCanvas™ flat-vector whiteboard illustration'} renderer, so be concrete and literal about every visual element, not abstract. Choose whatever visual metaphor is strongest for THIS mechanism specifically (a receptor could be a lock, a checkpoint, a docking station, a courtroom entrance — whichever fits this topic, not a recycled default).

5. QUICK QUIZ: One short, punchy self-test question that can be answered in one phrase, directly testing the highest-yield fact from the explanation — and its one-line answer.

SILENT SELF-AUDIT before outputting: (a) every symbol maps to a real medical fact; (b) every must-remember target has a symbol; (c) the sceneRoute order equals the retrieval order; (d) nothing decorative — every object in the scene encodes something; (e) REMOVE-LABEL TEST: if all text labels vanished, the facts would still be reconstructible from the visuals alone; (f) the mnemonic is EASIER to remember than the raw facts — if not, simplify it; (g) FORCEDNESS CHECK — for each symbol, ask "what does the learner gain beyond seeing the medical term?" — if the answer is nothing, the symbol is just renaming, pick a stronger candidate; (h) the strongest candidate was selected from multiple options, not the first idea; (i) COUNTERFACTUAL TEST: for each symbol, ask "if I replaced the intended fact with a different medical fact, would this same visual cue still make sense?" — if YES, the cue is too generic, replace it; (j) STORY-INDEPENDENCE: the visual scene relationships must encode the facts even without the story paragraph — if removing the story destroys retrieval, the visual encoding is too weak; (k) GENERIC-OBJECT TEST: no bare generic objects (tube, box, door, ball) without a meaningful distinctive modifier or action that makes them specific to this fact; (l) STORYBOARD AUDIT: the storyBeats in order retell the story exactly — every beat's object uses the symbol's exact identity, the protagonist appears in the beats and visibly progresses beat to beat, every beat carries its medical meaning, and no major story object or verb is missing from the beats. Fix anything that fails before writing the JSON.

MEDICAL ACCURACY (non-negotiable): the metaphor, characters, and setting may be fictional — the underlying medicine may not be. Never invent a receptor function, anatomical structure, diagnostic test, drug mechanism, or clinical finding to make the story neater. If you're not certain a detail is correct, leave it out rather than guessing.

The "symbols" array holds the minimum sufficient entries for the topic — typically 3-5 strong symbols for most topics (1-2 for a simple Crazy Hook). Fewer excellent symbols always beat more mediocre ones. Do not pad to a target number.

Return ONLY this exact JSON, no markdown, no extra text:
{
  "subject": "${subject}",
  "explanation": "Concept in 1-2 sentences, then mechanism as A → B → C → D, then 2-4 high-yield facts, then clinical correlation if relevant. Plain educational voice.",
  "architecture": "${mnemonicType === 'auto' ? 'the architecture you committed to at Stage 3, e.g. Pure Story / Spatial Layout / Crazy Hook / Acronym / Hybrid' : mnemonicType}",
  "memoryTargets": ["3-6 must-remember targets, most important first, each a short phrase"],
  "symbols": [
    { "cue": "the distinctive visual element (short noun phrase)", "fact": "the exact medical fact it encodes", "type": "literal|semantic|phonetic|morphological|functional|spatial", "location": "where it sits in the scene", "action": "what it is doing — omit this key entirely for static symbols", "retrievalTrigger": "2-6 word short retrieval cue for audio and quick recall, e.g. 'S-shaped descent to jugular'", "memoryProblem": "why this fact is hard: sequence|shape|branching|contrast|mechanism|association|number|laterality|pathway|causality" }
  ],
  "sceneSetting": "one line naming the world/environment and why it is the right container for these facts",
  "sceneRoute": "the path the learner's eye walks through the scene, start to finish, in retrieval order",
  "storyBeats": [
    { "order": 1, "character": "the story's protagonist performing this beat — omit this key entirely for characterless stories", "action": "the story's verb phrase, what happens (e.g. 'steps onto', 'slides down', 'swells and compresses')", "object": "the EXACT story object/symbol identity from the symbols array (e.g. 'glowing blue spine rail')", "location": "where in the scene this happens (omit if not applicable)", "medicalMeaning": "the medical fact this beat encodes (e.g. 'superior sagittal sinus')" }
  ],
  "mnemonic": "THE MNEMONIC per the type rules above",
  "mnemonicKey": "fallback decode guide: one 'Visual element → Medical fact' line per major anchor",
  "story": "EXACTLY 4 lines (or spatial map description), written fully in the ${storyStyle} voice and world — the guided tour through the route. No letter explanations.",
  "visualScene": "Concrete literal scene description rendering exactly the symbols and route above — same characters/zones, positions, props, actions, nothing added.",
  "visualMemoryAnchor": "2-3 sentences beginning with 'Follow the scene:' that teach the learner to READ the visual narrative in story order — walk each story element and what it represents medically (e.g. 'Follow the scene: the golden river reaching the upper tower is the superior thyroid artery; the silver snake behind the citadel is the recurrent laryngeal nerve...')",
  "highYieldAssociations": ["2-4 exam-relevant associations or consequences not already listed in memoryTargets"],
  "cognitivePrinciples": ["2-3 specific encoding mechanisms THIS mnemonic uses, e.g. 'Dual coding: the S-shaped river ties the visual shape directly to the term sigmoid sinus'"],
  "ankiFront": "High-yield clinical exam question",
  "ankiBack": "Answer + clinical mechanism + mnemonic sentence as final takeaway",
  "question": "Same as ankiFront — the flashcard question for active recall",
  "answer": "Same as ankiBack — the flashcard answer",
  "quizQuestion": "One short punchy self-test question",
  "quizAnswer": "One-line answer",
  "tags": ["${subject}", "MBBS", "${storyStyle}"]${memeTemplate ? `,\n  "memeTemplate": "${memeTemplate.name}"` : ''}
}`
}

/** Compiles the final image-generator prompt: hardcoded art style + negative prompt + the AI's literal scene description. */
function compileImagePrompt(visualScene: string, visualStyle: VisualStyle): string {
  const styleBlock = VISUAL_STYLE_RULES[visualStyle]
  return `${styleBlock} Scene to depict: ${visualScene}. ${NEGATIVE_PROMPT}`
}

export async function POST(req: NextRequest) {
  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid request body.' }, { status: 400 })
  }

  const { topic, subject } = body
  const mnemonicType: MnemonicType = body.mnemonicType ?? 'hybrid'
  const visualStyle: VisualStyle = ['sketchy', 'osmosis'].includes(body.visualStyle) ? body.visualStyle : 'sketchy'
  // Defaults to 'clinical' so any existing caller that doesn't yet send
  // storyStyle keeps its current behavior exactly as before.
  const storyStyle: StoryStyle = body.storyStyle ?? 'clinical'
  // Meme Recall™ picks one real template per generation so the format actually varies
  // instead of the model inventing a vague "meme vibe" every time.
  const memeTemplate = storyStyle === 'meme' ? pickMemeTemplate() : undefined

  // Phase 5 FIX 4: Use pre-computed adaptation text from the strategy engine.
  // The client builds this via selectStrategy() + buildAdaptivePromptText() —
  // the server never duplicates scoring logic here.
  const learnerAdaptation: string | undefined = body.adaptationText || undefined

  // FIX 7: versioning for regenerated mnemonics
  const parentMnemonicId: string | undefined = body.parentMnemonicId
  const generationVersion: number | undefined = body.generationVersion
  const regenerationReason: string | undefined = body.regenerationReason

  if (!topic?.trim() || !subject) {
    return NextResponse.json({ success: false, error: 'Topic and subject are required.' }, { status: 400 })
  }

  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    return NextResponse.json({ success: false, error: 'Server configuration error.' }, { status: 500 })
  }

  try {
    // ── Attempt 1: full MemoryRepresentation generation ────────────────────
    devLog(`provider=groq model=${GROQ_MODEL} max_tokens=${GROQ_MAX_TOKENS} reasoning_effort=${GROQ_REASONING_EFFORT} story_style=${storyStyle}`)

    const response = await fetchGroqWithRetry(GROQ_CHAT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        temperature: storyStyle === 'clinical' ? 0.93 : 1.05,
        max_tokens: GROQ_MAX_TOKENS,
        reasoning_effort: GROQ_REASONING_EFFORT,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: `You are a world-class medical memory architect for MBBS students. Generic output, or output that ignores the requested story style, is a failure condition. Work through the staged MEMORY ARCHITECTURE PIPELINE in the user prompt before writing anything — facts → priorities → strategy → symbols → scene → storyboard → derived outputs — and make every output field come from that single representation. Rules you never break:
- Explanation: exactly 3-4 sentences, 70% precise medical jargon 30% vivid real-world analogy, high-yield only, and always written in a plain educational voice regardless of story style
- Mnemonic: follow the requested mnemonic type exactly (acronym / storyline / spatial / hybrid) as instructed in the user prompt
- Story: EXACTLY 4 lines (or spatial-map equivalent), written fully inside the requested story style's world and voice — a Fantasy story and a Detective story about the same topic must read like two different genres, not the same sentence with swapped nouns. Literal physical/visual representation of the mechanism step by step, NEVER explain individual letters
- Story style discipline: unless the style is Clinical, do not default to a hospital, doctor, or patient setting, and never open the story with "A doctor...", "A patient...", or "A hospital..."
- StoryBeats: ordered visual beats of the storyline (character, action, object, location, medical meaning) — the image is compiled directly from these beats, so they must retell the story exactly, in order, using the symbols' exact identities
- Visual scene: concrete, literal scene description — no abstraction — matching the story exactly and set in the same non-generic world as the story: the story's action and sequence must be visibly happening in the composition, never a static arrangement of objects, since it will be rendered as a hand-drawn medical illustration, not a cartoon
- Quiz: one short punchy self-test question + one-line answer testing the highest-yield fact
Output ONLY valid JSON, nothing else.`,
          },
          { role: 'user', content: buildPrompt(topic.trim(), subject, mnemonicType, visualStyle, storyStyle, memeTemplate, learnerAdaptation) },
        ],
      }),
    })

    const data = await response.json()

    // Groq's response_format: json_object mode validates the model's output
    // server-side. If the model produced malformed JSON, Groq rejects the
    // whole request with a 400 and this specific error shape — but it still
    // includes the model's raw (invalid) text under error.failed_generation.
    // We treat that the same as any other raw completion and try to repair it,
    // instead of just surfacing Groq's rejection to the user.
    let raw: string
    let finishReason: string | undefined

    if (!response.ok) {
      const failedGeneration = data?.error?.failed_generation
      if (typeof failedGeneration === 'string' && failedGeneration.trim()) {
        raw = failedGeneration
      } else {
        // No recoverable model output — surface an actionable message instead
        // of a dead end. Rate-limit (429/413) bodies carry code
        // 'rate_limit_exceeded'; anything else is a generic provider error.
        const errCode = typeof data?.error?.code === 'string' ? data.error.code : ''
        const isRateLimit = response.status === 429 || response.status === 413 || errCode === 'rate_limit_exceeded'
        devLog(`attempt 1: provider error HTTP ${response.status} code=${errCode || 'n/a'} — no failed_generation to recover`)
        console.error(`[MnemonicFlow API] Groq HTTP ${response.status} (${errCode || 'no error code'}).`)
        const msg = isRateLimit
          ? 'The AI provider is rate-limited right now (per-minute token budget reached). Wait about a minute and try again.'
          : 'Something went wrong during generation. Please try again.'
        return NextResponse.json({ success: false, error: msg }, { status: 500 })
      }
    } else {
      raw = data?.choices?.[0]?.message?.content ?? ''
      finishReason = data?.choices?.[0]?.finish_reason
    }

    const usage = data?.usage
    devLog(`attempt 1: http=${response.status} finish_reason=${finishReason ?? 'n/a'} raw_length=${raw.length} completion_tokens=${usage?.completion_tokens ?? 'n/a'} reasoning_tokens=${usage?.completion_tokens_details?.reasoning_tokens ?? 'n/a'}`)

    // Parse with the full recovery chain (direct → sanitize → extract →
    // repair). A throw here means even repair couldn't produce valid JSON.
    let attempt1: any = null
    let parseStrategy = 'unrecoverable'
    try {
      const recovered = parseWithRecovery(raw, finishReason)
      attempt1 = recovered.parsed
      parseStrategy = recovered.strategy
    } catch {
      attempt1 = null
    }
    devLog(`attempt 1: json_parse=${parseStrategy}`)

    // Validate: the backend refuses to return success with a missing/empty
    // mnemonic. This is exactly where the old "missing mnemonic" errors came
    // from — the JSON was truncated before the mnemonic field, and the only
    // recovery was telling the user to try again.
    const failure: FieldValidationFailure | null = attempt1
      ? validateRequiredFields(attempt1, REQUIRED_FIELDS)
      : { field: 'json', reason: 'missing' }

    let parsed: any

    if (!failure) {
      parsed = attempt1
    } else {
      devLog(`attempt 1: validation failed field=${failure.field} reason=${failure.reason}${failure.actualLength !== undefined ? ` (length ${failure.actualLength} < ${failure.requiredLength})` : ''} raw_head=${JSON.stringify(raw.slice(0, 200))} — triggering ONE compact retry`)
      console.error(`[MnemonicFlow API] Attempt 1 incomplete (${failure.field} ${failure.reason}); retrying compact.`)

      // ── Attempt 2 (max 1 retry): compact prompt + strict JSON schema ──
      // The retry asks ONLY for the fields the app requires, with tight
      // length caps, and Groq's strict json_schema mode guarantees the shape.
      // No fake content is ever generated — if this also fails, the user
      // gets a clear error below.
      const retryResponse = await fetchGroqWithRetry(GROQ_CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: GROQ_MODEL,
          temperature: 0.85,
          max_tokens: RETRY_MAX_TOKENS,
          reasoning_effort: GROQ_REASONING_EFFORT,
          response_format: COMPACT_RETRY_JSON_SCHEMA,
          messages: buildCompactRetryMessages(topic.trim(), subject, mnemonicType, storyStyle),
        }),
      })

      const retryData = await retryResponse.json()
      let retryRaw: string
      if (!retryResponse.ok) {
        const failedGeneration = retryData?.error?.failed_generation
        if (typeof failedGeneration === 'string' && failedGeneration.trim()) {
          retryRaw = failedGeneration
        } else {
          devLog(`retry: provider error HTTP ${retryResponse.status} — giving up (no fake content)`)
          console.error(`[MnemonicFlow API] Compact retry failed: HTTP ${retryResponse.status}.`)
          return NextResponse.json(
            {
              success: false,
              error: `Generation came back incomplete (missing "${failure.field}") and the compact retry could not reach the provider. Please try again.`,
            },
            { status: 500 },
          )
        }
      } else {
        retryRaw = retryData?.choices?.[0]?.message?.content ?? ''
      }
      devLog(`retry: http=${retryResponse.status} finish_reason=${retryData?.choices?.[0]?.finish_reason ?? 'n/a'} raw_length=${retryRaw.length}`)

      let retryParsed: any = null
      try {
        retryParsed = parseWithRecovery(retryRaw, retryData?.choices?.[0]?.finish_reason).parsed
      } catch {
        retryParsed = null
      }

      const retryFailure: FieldValidationFailure | null = retryParsed
        ? validateRequiredFields(retryParsed, REQUIRED_FIELDS)
        : { field: 'json', reason: 'missing' }

      if (retryFailure) {
        devLog(`retry: validation failed field=${retryFailure.field} reason=${retryFailure.reason} — giving up (no fake content)`, 'raw_head=', JSON.stringify(retryRaw.slice(0, 200)))
        console.error(`[MnemonicFlow API] Compact retry still incomplete (${retryFailure.field} ${retryFailure.reason}).`)
        return NextResponse.json(
          {
            success: false,
            error: `Generation came back incomplete (missing "${retryFailure.field}") even after a compact retry. This means the response got cut off — try again.`,
          },
          { status: 500 },
        )
      }

      devLog('retry: success — serving the compact result (user sees a complete mnemonic, not an error)')
      // The compact retry result stands alone: it is internally coherent
      // (same generation produced mnemonic + story + scene together), while
      // salvaging attempt-1 fragments could pair a stale story with a fresh
      // mnemonic and violate the ONE MEMORY WORLD rule.
      parsed = retryParsed
    }

    if (!Array.isArray(parsed.tags)) parsed.tags = [subject]
    // Authoritative — don't rely on the model to echo the chosen template back correctly.
    if (memeTemplate) parsed.memeTemplate = memeTemplate.name

    // Ensure subject is present in the response (the AI should echo it, but
    // we set it authoritatively to prevent drift)
    if (!parsed.subject || typeof parsed.subject !== 'string') parsed.subject = subject
    // Map ankiFront/ankiBack to explicit question/answer fields for flashcard use
    if (!parsed.question && parsed.ankiFront) parsed.question = parsed.ankiFront
    if (!parsed.answer && parsed.ankiBack) parsed.answer = parsed.ankiBack

    // ── MemoryRepresentation layer ───────────────────────────────────────────
    // Validate the structured fields, then DERIVE every downstream layer from
    // the symbol map: memory breakdown, image prompt, and audio tour. Nothing
    // downstream is ever re-generated independently, so the mnemonic, story,
    // scene, image and narration cannot drift apart.
    const symbols = validateSymbols(parsed.symbols)
    parsed.architecture =
      typeof parsed.architecture === 'string' && parsed.architecture.trim() ? parsed.architecture.trim() : undefined
    parsed.memoryTargets = coerceStringArray(parsed.memoryTargets, 8)
    parsed.highYieldAssociations = coerceStringArray(parsed.highYieldAssociations, 6)
    parsed.cognitivePrinciples = coerceStringArray(parsed.cognitivePrinciples, 5)
    parsed.visualMemoryAnchor =
      typeof parsed.visualMemoryAnchor === 'string' && parsed.visualMemoryAnchor.trim().length >= 20
        ? parsed.visualMemoryAnchor.trim()
        : undefined
    parsed.sceneSetting =
      typeof parsed.sceneSetting === 'string' && parsed.sceneSetting.trim() ? parsed.sceneSetting.trim() : undefined
    parsed.sceneRoute =
      typeof parsed.sceneRoute === 'string' && parsed.sceneRoute.trim() ? parsed.sceneRoute.trim() : undefined

    // ── Narrative Storyboard layer ────────────────────────────────────────────
    // The storyline is the source of truth for the image (story = script,
    // beats = shot sequence, image = visual execution). Use the model's
    // storyBeats when usable; otherwise derive beats deterministically from
    // the story text + symbol map so the image is still story-driven.
    let storyBeats = validateStoryBeats(parsed.storyBeats)
    if (storyBeats.length < 2) storyBeats = deriveStoryBeatsFromStory(parsed.story, symbols)
    if (storyBeats.length >= 2) parsed.storyBeats = storyBeats
    else parsed.storyBeats = undefined

    if (symbols.length >= 2) {
      // Phase 3: batch quality scoring with interference detection and
      // quality labels. applySymbolQuality scores each symbol, checks for
      // too-similar cue pairs, and assigns a human-readable qualityLabel.
      applySymbolQuality(symbols)
      parsed.symbols = symbols
      // Breakdown is derived from the symbol map, never taken from free text.
      parsed.mnemonicKey = deriveBreakdown(symbols, parsed.architecture, mnemonicType === 'auto')
      // Audio follows the visual route instead of reading the explanation aloud.
      parsed.memoryTour = buildMemoryTour(parsed.sceneSetting, parsed.sceneRoute, symbols, parsed.mnemonic)
      // Image prompt: the narrative storyboard drives the composition. The
      // spec-compiled prompt remains the fallback when no storyboard exists.
      if (parsed.storyBeats?.length) {
        parsed.imagePrompt = compileNarrativeImagePrompt(
          { ...parsed, topic: topic.trim(), storyBeats: parsed.storyBeats, symbols },
          VISUAL_STYLE_RULES[visualStyle],
          NEGATIVE_PROMPT,
        )
        // §17/§18: verify the compiled prompt carries every beat, object,
        // action, sequence, character and mapping; refine deterministically
        // when coverage fails so no story element is lost on the way to the
        // image model.
        const coverage = computeVisualStoryCoverage(parsed.imagePrompt, parsed.storyBeats, symbols)
        if (!coverage.passed) {
          parsed.imagePrompt = refineNarrativeImagePrompt(parsed.imagePrompt, parsed.storyBeats, symbols)
          console.warn('[MnemonicFlow API] Visual story coverage incomplete; prompt refined:', coverage)
        }
      } else {
        parsed.imagePrompt = compileImagePromptFromSpec(parsed, VISUAL_STYLE_RULES[visualStyle], NEGATIVE_PROMPT)
      }
    } else {
      // Structured layer unusable — degrade gracefully to the legacy paths,
      // but the story still drives the image whenever beats could be parsed.
      parsed.symbols = undefined
      if (parsed.storyBeats?.length) {
        parsed.imagePrompt = compileNarrativeImagePrompt(
          { ...parsed, topic: topic.trim(), storyBeats: parsed.storyBeats, symbols: [] },
          VISUAL_STYLE_RULES[visualStyle],
          NEGATIVE_PROMPT,
        )
      } else {
        parsed.imagePrompt = compileImagePrompt(parsed.visualScene, visualStyle)
      }
    }

    // FIX 7: attach versioning metadata to regenerated mnemonics
    if (parentMnemonicId) parsed.parentMnemonicId = parentMnemonicId
    if (generationVersion) parsed.generationVersion = generationVersion
    if (regenerationReason) parsed.regenerationReason = regenerationReason
    // Generate a stable mnemonicId for this output
    parsed.mnemonicId = `mn_${topic.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 40)}_${Date.now().toString(36)}`

    return NextResponse.json({ success: true, data: parsed })
  } catch (err: any) {
    // Node's fetch collapses real network failures (DNS, connection reset,
    // timeout, firewall/proxy block) into a generic "fetch failed" message.
    // The actual reason lives on err.cause — surface it so it's actionable
    // instead of a dead end.
    const cause = err?.cause
    const causeMsg = cause?.message ?? (typeof cause === 'string' ? cause : undefined)
    console.error('[MnemonicFlow API]', err, cause ? { cause } : '')

    const isNetworkError = err?.message === 'fetch failed'
    const friendlyMsg = isNetworkError
      ? `Could not reach Groq's servers (network error${causeMsg ? `: ${causeMsg}` : ''}). Check your internet connection, VPN/firewall, or antivirus, and make sure you don't have multiple dev servers running at once.`
      : err?.message ?? 'Generation failed. Try again.'

    return NextResponse.json({ success: false, error: friendlyMsg }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ error: 'Method not allowed.' }, { status: 405 })
}