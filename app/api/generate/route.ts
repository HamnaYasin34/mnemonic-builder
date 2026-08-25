import { NextRequest, NextResponse } from 'next/server'
import { MnemonicType, VisualStyle, StoryStyle } from '../../types'

const MNEMONIC_TYPE_RULES: Record<MnemonicType, string> = {
  acronym: 'Build the mnemonic as a strict FIRST-LETTER ACRONYM only. Each letter of a single word/phrase = one key fact, in order. No storyline needed — the story field should briefly justify the acronym word choice in 1-2 lines.',
  storyline: 'Build the mnemonic as a CHARACTER-DRIVEN STORYLINE. One specific named character physically acts out the mechanism step by step across exactly 4 lines. The mnemonic field is the one-line absurd/hilarious hook sentence; the story field is the full scene.',
  spatial: 'Build the mnemonic as a VISUAL SPATIAL LAYOUT. Describe fixed positions (top-left, center, bottom-right, foreground, background) where each fact "lives" in the scene, the way a labeled anatomical diagram works. The story field should describe the spatial map in words; no characters required, just landmarks and labeled zones.',
  hybrid: 'Build the mnemonic as a HYBRID: a short acronym AND a 4-line character storyline AND explicit spatial positions for each fact in the scene. Combine all three so the acronym letters map onto labeled positions a character visits in order.',
  hook: 'Build the mnemonic as ONE CRAZY HOOK: a single short, weird, visually vivid sentence or phrase the student can recall in 3-5 seconds — NOT a full acronym, NOT a multi-part structure. It must stay relevant to the real mechanism, not just be silly for its own sake. Easy beats clever: if a simpler, dumber sentence is more memorable than an elegant one, use the simpler one. The story field then briefly (in the 4 lines) shows this hook happening.',
  auto: `AUTO-SELECT the best architecture for THIS specific topic before writing anything else, by privately reasoning through: how many discrete facts need encoding, whether there is a natural sequence or spatial/branching relationship, whether a clean acronym exists without being forced, and whether a single visual metaphor is strong enough to replace all of that. Then commit fully to ONE of: a strict acronym, a character-driven storyline, a spatial layout, a hybrid of these, or (if the concept is simple enough) a single crazy hook — whichever makes recall EASIEST, not most elaborate. Do not default to the same architecture every time; different topics should get different structures. State which architecture you chose as the first few words of the "mnemonicKey" field, e.g. "[Architecture: Pure Story] G = ...".`,
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
): string {
  const forbiddenOpeners = storyStyle === 'clinical'
    ? ''
    : `\n\nBANNED OPENERS: Never begin the story with "A doctor...", "A patient...", or "A hospital..." — that framing is reserved for Clinical mode only. Open instead with action, a character, a place, or a line of dialogue true to the ${storyStyle} world above.`

  const memeTemplateBlock = storyStyle === 'meme' && memeTemplate
    ? `\n\nMEME TEMPLATE TO RECREATE — you MUST use exactly this one, not a different meme: "${memeTemplate.name}". Format: ${memeTemplate.format}. The story's 4 lines must walk through this exact panel/beat structure, and the visual scene must describe recreating that composition literally (panel layout, poses, expressions) with the medical facts mapped onto each panel/role — never depict a real celebrity or public figure, use original generic-looking characters acting out the format.`
    : ''

  return `You are a world-class medical memory architect for MBBS students, currently writing in the ${storyStyle.toUpperCase()} style. Your only goal: make this concept IMPOSSIBLE to forget. Generic explanations OR a story that could have been written in any other style are both failure conditions — the writing philosophy below is not decoration, it is the actual assignment.

Topic: "${topic}"
Subject: ${subject}
Subject focus: ${subjectFocusHint(subject)}

TOPIC/SUBJECT CHECK: If "${topic}" doesn't genuinely belong to ${subject} (e.g. a physiology topic entered under Anatomy), don't force a fake anatomical framing onto it. Either find the real anatomical angle if one honestly exists, or write the explanation from the discipline the topic actually belongs to and open the explanation with one short clause noting that, e.g. "(Primarily a physiology concept — explained accordingly.)" Never block generation over this, just be honest about it.

ONE MEMORY WORLD RULE (most important rule): the mnemonic, the story, and the visual scene are not three separate creative outputs — they are three views of the SAME memory. Every character, object, location, or action in the story must correspond to a real medical fact, and every one of those elements must reappear, unchanged, in the visual scene. If you invent a detail for the story that doesn't map to anything medical, cut it. If a fact is important enough to be in the mnemonic, it needs a visual anchor. Do not generate a mnemonic, a story, and an image that merely share a topic — they must share the same characters, objects, and sequence.

ANTI-REPETITION RULE: do not default to the same world every time regardless of style — e.g. don't make everything a city, a factory, a battlefield, or a detective's office just because it worked before. Do not reuse the same recurring metaphors (keys/locks/doors/cars/traffic/soldiers/messengers/villains) unless they are genuinely the strongest fit for THIS topic's actual mechanism. Build the metaphor from what the topic itself is doing, not from a stock toolkit.

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

3. THE STORYLINE:
- EXACTLY 4 LINES in one cohesive paragraph (or the spatial-map equivalent if mnemonic type is "spatial")
- Written entirely in the ${storyStyle} voice and world described above — not a clinical summary with genre words sprinkled on top
- NO alphabet/letter explanations ever
- Characters, forces, or zones must literally and physically/visually represent the medical mechanism step by step, using the ${storyStyle} world's own internal logic
- Should read like a professionally written piece of ${storyStyle} fiction a person would actually want to read — not a teaching aid wearing a costume
- Must use ONLY elements that map to real facts per the One Memory World rule above — no decorative characters or events with no medical meaning

4. VISUAL SCENE: A vivid scene description of the exact storyline above, set in ${STORY_STYLE_SETTING_HINT[storyStyle]} — same characters/zones, same objects, same action/layout, specific pose/expression/props/positions, nothing added or removed. Prefer ONE coherent scene the eye can trace through the story's sequence, rather than several disconnected vignettes. This will be fed directly to an image generator using a ${visualStyle === 'sketchy' ? 'Clinical Ink™ hand-drawn medical illustration' : 'NeuroCanvas™ flat-vector whiteboard illustration'} renderer, so be concrete and literal about every visual element, not abstract. Choose whatever visual metaphor is strongest for THIS mechanism specifically (a receptor could be a lock, a checkpoint, a docking station, a courtroom entrance — whichever fits this topic, not a recycled default).

5. QUICK QUIZ: One short, punchy self-test question that can be answered in one phrase, directly testing the highest-yield fact from the explanation — and its one-line answer.

MEDICAL ACCURACY (non-negotiable): the metaphor, characters, and setting may be fictional — the underlying medicine may not be. Never invent a receptor function, anatomical structure, diagnostic test, drug mechanism, or clinical finding to make the story neater. If you're not certain a detail is correct, leave it out rather than guessing.

Return ONLY this exact JSON, no markdown, no extra text:
{
  "explanation": "Concept in 1-2 sentences, then mechanism as A → B → C → D, then 2-4 high-yield facts, then clinical correlation if relevant. Plain educational voice.",
  "mnemonic": "THE MNEMONIC per the type rules above",
  "mnemonicKey": "Visual Memory Anchor decode guide: one 'Visual element → Medical fact' line per major anchor (not every tiny detail). If mnemonicType is auto, prefix with '[Architecture: <name chosen>] '.",
  "story": "EXACTLY 4 lines (or spatial map description), written fully in the ${storyStyle} voice and world. No letter explanations.",
  "visualScene": "Concrete literal scene description matching the storyline exactly — same characters/zones, positions, props, actions, nothing added.",
  "ankiFront": "High-yield clinical exam question",
  "ankiBack": "Answer + clinical mechanism + mnemonic sentence as final takeaway",
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

/**
 * LLMs sometimes emit raw, un-escaped control characters (literal newlines, tabs,
 * carriage returns) inside JSON string values — e.g. a multi-line "story" field
 * written with real line breaks instead of "\n". That's invalid JSON and makes
 * JSON.parse throw "Unterminated string". This walks the text char-by-char,
 * tracks whether we're inside a quoted string (respecting escape sequences),
 * and escapes any stray control characters it finds there. It never touches
 * characters outside of string literals, so the JSON structure itself is untouched.
 */
function sanitizeJsonControlChars(text: string): string {
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
function repairTruncatedJson(text: string): string {
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
 * Calls Groq's chat completions endpoint and, if it comes back with a 429
 * (rate limit), automatically retries. Groq's 429 body includes a message
 * like "...Please try again in 7.425s..." — we parse that exact delay when
 * present so we wait just long enough, rather than guessing. Falls back to
 * exponential backoff if the delay can't be parsed.
 */
async function fetchGroqWithRetry(
  url: string,
  options: RequestInit,
  maxRetries = 3
): Promise<Response> {
  let lastResponse: Response | null = null

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const response = await fetch(url, options)

    if (response.status !== 429 || attempt === maxRetries) {
      return response
    }

    // Clone so the body can still be read again by the caller if this was
    // actually the final attempt (fetch bodies can only be consumed once).
    lastResponse = response
    const bodyText = await response.clone().text().catch(() => '')
    const match = bodyText.match(/try again in ([\d.]+)s/i)
    const delaySeconds = match ? parseFloat(match[1]) : 1.5 * (attempt + 1)

    console.warn(`[MnemonicFlow API] Groq rate-limited (attempt ${attempt + 1}/${maxRetries}); retrying in ${delaySeconds}s.`)
    await new Promise(resolve => setTimeout(resolve, Math.min(delaySeconds, 15) * 1000 + 200))
  }

  // Unreachable in practice, but keeps TypeScript happy.
  return lastResponse!
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
  const visualStyle: VisualStyle = body.visualStyle ?? 'sketchy'
  // Defaults to 'clinical' so any existing caller that doesn't yet send
  // storyStyle keeps its current behavior exactly as before.
  const storyStyle: StoryStyle = body.storyStyle ?? 'clinical'
  // Meme Recall™ picks one real template per generation so the format actually varies
  // instead of the model inventing a vague "meme vibe" every time.
  const memeTemplate = storyStyle === 'meme' ? pickMemeTemplate() : undefined

  if (!topic?.trim() || !subject) {
    return NextResponse.json({ success: false, error: 'Topic and subject are required.' }, { status: 400 })
  }

  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    return NextResponse.json({ success: false, error: 'No Groq API key found in .env.local' }, { status: 500 })
  }

  try {
    const response = await fetchGroqWithRetry('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'openai/gpt-oss-120b',
        temperature: storyStyle === 'clinical' ? 0.93 : 1.05,
        max_tokens: 3500,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: `You are a world-class medical memory architect for MBBS students. Generic output, or output that ignores the requested story style, is a failure condition. Rules you never break:
- Explanation: exactly 3-4 sentences, 70% precise medical jargon 30% vivid real-world analogy, high-yield only, and always written in a plain educational voice regardless of story style
- Mnemonic: follow the requested mnemonic type exactly (acronym / storyline / spatial / hybrid) as instructed in the user prompt
- Story: EXACTLY 4 lines (or spatial-map equivalent), written fully inside the requested story style's world and voice — a Fantasy story and a Detective story about the same topic must read like two different genres, not the same sentence with swapped nouns. Literal physical/visual representation of the mechanism step by step, NEVER explain individual letters
- Story style discipline: unless the style is Clinical, do not default to a hospital, doctor, or patient setting, and never open the story with "A doctor...", "A patient...", or "A hospital..."
- Visual scene: concrete, literal scene description — no abstraction — matching the story exactly and set in the same non-generic world as the story, since it will be rendered as a hand-drawn medical illustration, not a cartoon
- Quiz: one short punchy self-test question + one-line answer testing the highest-yield fact
Output ONLY valid JSON, nothing else.`,
          },
          { role: 'user', content: buildPrompt(topic.trim(), subject, mnemonicType, visualStyle, storyStyle, memeTemplate) },
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
        const msg = data?.error?.message ?? `Groq API error: ${response.status}`
        return NextResponse.json({ success: false, error: msg }, { status: 500 })
      }
    } else {
      raw = data?.choices?.[0]?.message?.content ?? ''
      finishReason = data?.choices?.[0]?.finish_reason
    }

    const cleaned = raw.replace(/```json/gi, '').replace(/```/g, '').trim()

    let parsed: any
    try {
      parsed = JSON.parse(cleaned)
    } catch {
      try {
        // Fallback 1: model likely emitted raw newlines/tabs inside a JSON string
        // (e.g. the multi-line "story" field). Escape those and retry.
        parsed = JSON.parse(sanitizeJsonControlChars(cleaned))
      } catch {
        // Fallback 2: the response was genuinely cut off (max_tokens hit)
        // partway through a string or before all brackets closed. Close
        // things off so we can recover whatever fields did finish writing.
        if (finishReason === 'length') {
          console.warn('[MnemonicFlow API] Groq response was truncated (finish_reason=length); attempting repair.')
        }
        parsed = JSON.parse(repairTruncatedJson(sanitizeJsonControlChars(cleaned)))
      }
    }

    // Sanity check: if any of the fields the rest of the app depends on came
    // back missing or suspiciously short (a sign the repair above only
    // recovered a fragment), fail loudly here rather than silently shipping
    // a broken/empty visualScene down to the image generator — that's what
    // was producing the abstract, content-less "ink blot" images instead of
    // the requested scene.
    const requiredFields: Array<[string, number]> = [
      ['explanation', 20],
      ['mnemonic', 5],
      ['story', 20],
      ['visualScene', 20],
    ]
    for (const [field, minLen] of requiredFields) {
      const value = parsed?.[field]
      if (typeof value !== 'string' || value.trim().length < minLen) {
        console.error(`[MnemonicFlow API] Recovered JSON is missing/incomplete field "${field}".`, { raw })
        return NextResponse.json(
          {
            success: false,
            error: `Generation came back incomplete (missing "${field}"). This usually means the response got cut off — try again.`,
          },
          { status: 500 }
        )
      }
    }

    if (!Array.isArray(parsed.tags)) parsed.tags = [subject]
    // Authoritative — don't rely on the model to echo the chosen template back correctly.
    if (memeTemplate) parsed.memeTemplate = memeTemplate.name

    // Pre-compile the final image prompt server-side so the client just sends it straight to the renderer.
    parsed.visualScene = compileImagePrompt(parsed.visualScene, visualStyle)

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