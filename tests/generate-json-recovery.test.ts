/**
 * JSON recovery + validation tests for the mnemonic generation pipeline.
 *
 * Covers the root-cause fix for the "Generation came back incomplete
 * (missing mnemonic)" bug:
 *   - extractJsonObject: prose-wrapped / fenced / truncated model output
 *   - parseWithRecovery: full chain direct → sanitized → extracted → repaired
 *   - validateRequiredFields: backend refuses incomplete objects
 *   - buildCompactRetryMessages: the ONE controlled retry prompt
 *   - parseGroqJson regression (used by guide/quiz/simulation/examiner routes)
 */

import { describe, it, expect } from 'vitest'
import {
  extractJsonObject,
  parseWithRecovery,
  validateRequiredFields,
  buildCompactRetryMessages,
  parseGroqJson,
} from '../app/lib/groq-utils'

// A representative full mnemonic response (same field order as the real prompt)
const FULL_RESPONSE = `{
  "explanation": "The external carotid artery has eight branches. Concept: the ECA supplies the face and scalp. Mechanism: ascending pharyngeal → superior thyroid → lingual → facial → occipital → posterior auricular → maxillary → superficial temporal. High-yield: the maxillary and superficial temporal are terminal branches.",
  "architecture": "acronym",
  "memoryTargets": ["eight branches", "terminal branches"],
  "symbols": [{ "cue": "angry ladies", "fact": "ECA branches", "type": "phonetic" }],
  "sceneSetting": "a college campus",
  "sceneRoute": "start at the library, walk the quad",
  "storyBeats": [{ "order": 1, "action": "step onto", "object": "quad path", "medicalMeaning": "ECA" }],
  "mnemonic": "Some Anatomists Like Freaking Out Poor Medical Students",
  "mnemonicKey": "Some = Superior thyroid, Anatomists = Ascending pharyngeal",
  "story": "Line one happens. Line two follows. Line three escalates. Line four resolves.",
  "visualScene": "A literal campus scene where each landmark is one branch, laid out along the walking route.",
  "visualMemoryAnchor": "Follow the scene: the library is the superior thyroid. The quad path is the lingual artery.",
  "highYieldAssociations": ["terminal branches"],
  "cognitivePrinciples": ["first-letter acrostic"],
  "ankiFront": "Name the eight branches of the external carotid artery.",
  "ankiBack": "The eight branches are... mechanism: ECA supplies face and scalp.",
  "quizQuestion": "Which two are terminal ECA branches?",
  "quizAnswer": "Maxillary and superficial temporal.",
  "tags": ["anatomy", "MBBS", "clinical"]
}`

// ── extractJsonObject ─────────────────────────────────────────────────────────

describe('extractJsonObject', () => {
  it('extracts a JSON object wrapped in leading prose', () => {
    const wrapped = `Here is your mnemonic:\n${FULL_RESPONSE}`
    const extracted = extractJsonObject(wrapped)
    expect(extracted).not.toBeNull()
    expect(JSON.parse(extracted!)).toEqual(JSON.parse(FULL_RESPONSE))
  })

  it('extracts a JSON object with trailing prose after it', () => {
    const wrapped = `${FULL_RESPONSE}\n\nHope this helps — let me know if you need another one!`
    const extracted = extractJsonObject(wrapped)
    expect(extracted).not.toBeNull()
    expect(JSON.parse(extracted!)).toEqual(JSON.parse(FULL_RESPONSE))
  })

  it('ignores braces inside string values (tracks string state)', () => {
    const text = 'prefix {"a": "brace } inside string", "b": 2} suffix'
    const extracted = extractJsonObject(text)
    expect(extracted).toBe('{"a": "brace } inside string", "b": 2}')
  })

  it('returns null when no object can be found', () => {
    expect(extractJsonObject('no json here at all')).toBeNull()
  })

  it('returns null for a truncated (unbalanced) object — the caller must repair instead', () => {
    const truncated = '{"mnemonic": "Some Anatomists", "story": "cut off mid st'
    expect(extractJsonObject(truncated)).toBeNull()
  })

  it('extracts the FIRST outermost object when multiple appear', () => {
    const text = '{"a": 1} then {"b": 2}'
    expect(extractJsonObject(text)).toBe('{"a": 1}')
  })
})

// ── parseWithRecovery ─────────────────────────────────────────────────────────

describe('parseWithRecovery', () => {
  it('parses clean JSON directly (strategy: direct)', () => {
    const { parsed, strategy } = parseWithRecovery(FULL_RESPONSE)
    expect(strategy).toBe('direct')
    expect(parsed.mnemonic).toBe('Some Anatomists Like Freaking Out Poor Medical Students')
  })

  it('parses JSON wrapped in markdown fences (strategy: direct after cleaning)', () => {
    const fenced = '```json\n' + FULL_RESPONSE + '\n```'
    const { parsed, strategy } = parseWithRecovery(fenced)
    expect(strategy).toBe('direct')
    expect(parsed.mnemonic).toContain('Some Anatomists')
  })

  it('escapes raw control characters inside strings (strategy: sanitized)', () => {
    // Model wrote the 4-line story with REAL newlines inside the JSON string
    const dirty = '{"mnemonic": "ABCD", "story": "line one\nline two\nline three\nline four", "explanation": "x"}'
    const { parsed, strategy } = parseWithRecovery(dirty)
    expect(strategy).toBe('sanitized')
    expect(parsed.story).toContain('\n')
    expect(parsed.mnemonic).toBe('ABCD')
  })

  it('extracts a JSON object wrapped in prose (strategy: extracted)', () => {
    const wrapped = `Sure! Here is your mnemonic as requested:\n\n${FULL_RESPONSE}\n\nEnjoy!`
    const { parsed, strategy } = parseWithRecovery(wrapped)
    expect(strategy).toBe('extracted')
    expect(parsed.mnemonic).toContain('Some Anatomists')
  })

  it('repairs genuinely truncated JSON and salvages finished fields (strategy: repaired)', () => {
    // The exact bug shape: cut off partway through the mnemonic field,
    // which sits AFTER the big symbols/storyBeats arrays.
    const truncated = `{
      "explanation": "The external carotid artery has eight branches and supplies the face.",
      "architecture": "acronym",
      "symbols": [{ "cue": "angry ladies", "fact": "ECA branches" }],
      "mnemonic": "Some Anatomists Like Fre`
    const { parsed, strategy } = parseWithRecovery(truncated, 'length')
    expect(strategy).toBe('repaired')
    // Fields the model finished writing are recovered...
    expect(parsed.explanation).toContain('external carotid')
    expect(parsed.architecture).toBe('acronym')
    // ...and the field that was cut mid-write exists but is a fragment —
    // which validateRequiredFields must then catch (see below).
    expect(typeof parsed.mnemonic).toBe('string')
  })

  it('repairs truncation that happens between fields', () => {
    const truncated = '{"explanation": "complete explanation of the topic here", "mnemonic": "KILLER HOOK", "story": "the four line story that made it out okay"'
    const { parsed, strategy } = parseWithRecovery(truncated)
    expect(strategy).toBe('repaired')
    expect(parsed.mnemonic).toBe('KILLER HOOK')
  })

  it('throws for input where even repair cannot produce JSON', () => {
    // Pure prose with no opening brace at all — nothing to repair
    expect(() => parseWithRecovery('Sorry, I cannot help with that request.')).toThrow()
  })
})

// ── validateRequiredFields ────────────────────────────────────────────────────

describe('validateRequiredFields', () => {
  const REQUIRED: Array<[string, number]> = [
    ['explanation', 20],
    ['mnemonic', 5],
    ['story', 20],
    ['visualScene', 20],
  ]

  it('returns null for a complete object', () => {
    const complete = {
      explanation: 'A sufficiently long explanation of the medical concept.',
      mnemonic: 'Some Anatomists Like Freaking Out',
      story: 'A four line story that is definitely long enough to pass validation.',
      visualScene: 'A literal scene description that is comfortably over the limit.',
    }
    expect(validateRequiredFields(complete, REQUIRED)).toBeNull()
  })

  it('detects a missing mnemonic — the exact field from the reported bug', () => {
    const truncated = {
      explanation: 'A sufficiently long explanation of the medical concept.',
      // mnemonic missing: JSON was cut before this field
      story: 'A four line story that is definitely long enough to pass validation.',
      visualScene: 'A literal scene description that is comfortably over the limit.',
    }
    const failure = validateRequiredFields(truncated, REQUIRED)
    expect(failure).toEqual({ field: 'mnemonic', reason: 'missing' })
  })

  it('detects an empty/whitespace mnemonic as missing', () => {
    const broken = {
      explanation: 'A sufficiently long explanation of the medical concept.',
      mnemonic: '   ',
      story: 'A four line story that is definitely long enough to pass validation.',
      visualScene: 'A literal scene description that is comfortably over the limit.',
    }
    expect(validateRequiredFields(broken, REQUIRED)).toEqual({ field: 'mnemonic', reason: 'missing' })
  })

  it('detects a too-short field with actual and required lengths', () => {
    const broken = {
      explanation: 'A sufficiently long explanation of the medical concept.',
      mnemonic: 'ok', // < 5 chars
      story: 'A four line story that is definitely long enough to pass validation.',
      visualScene: 'A literal scene description that is comfortably over the limit.',
    }
    const failure = validateRequiredFields(broken, REQUIRED)
    expect(failure).toEqual({ field: 'mnemonic', reason: 'too_short', actualLength: 2, requiredLength: 5 })
  })

  it('detects a non-string field as missing', () => {
    const broken = {
      explanation: 'A sufficiently long explanation of the medical concept.',
      mnemonic: { nested: 'object instead of string' },
      story: 'A four line story that is definitely long enough to pass validation.',
      visualScene: 'A literal scene description that is comfortably over the limit.',
    }
    expect(validateRequiredFields(broken, REQUIRED)).toEqual({ field: 'mnemonic', reason: 'missing' })
  })

  it('reports the FIRST failing field in order', () => {
    const broken = { explanation: '', mnemonic: '', story: '', visualScene: '' }
    expect(validateRequiredFields(broken, REQUIRED)?.field).toBe('explanation')
  })

  it('handles null/undefined parsed objects (unrecoverable parse)', () => {
    expect(validateRequiredFields(null, REQUIRED)?.field).toBe('explanation')
    expect(validateRequiredFields(undefined, REQUIRED)?.field).toBe('explanation')
  })
})

// ── The end-to-end bug scenario at unit level ─────────────────────────────────

describe('truncation → repair → validation flow (the reported bug)', () => {
  it('a response truncated before the mnemonic field is repaired but REJECTED by validation', () => {
    // Truncated exactly like a real max_tokens cut: everything up to
    // sceneRoute made it out, mnemonic and later fields never did.
    const truncated = `{
      "explanation": "The external carotid artery gives eight branches supplying the face and scalp.",
      "architecture": "acronym",
      "memoryTargets": ["eight branches"],
      "symbols": [{ "cue": "angry ladies", "fact": "ECA branches", "type": "phonetic", "location": "campus" }],
      "sceneSetting": "a college campus",
      "sceneRoute": "start at the library and walk the quad`

    const { parsed, strategy } = parseWithRecovery(truncated, 'length')
    expect(strategy).toBe('repaired')

    const failure = validateRequiredFields(parsed, [
      ['explanation', 20],
      ['mnemonic', 5],
      ['story', 20],
      ['visualScene', 20],
    ])
    // Before the fix, this exact state produced the user-facing error with no
    // retry. Now it is the trigger for the ONE compact retry in the route.
    expect(failure).toEqual({ field: 'mnemonic', reason: 'missing' })
  })

  it('a compact retry result passes validation and is servable', () => {
    // What the strict-schema retry returns — complete and compact.
    const retryResult = `{
      "mnemonic": "Some Angry Ladies Fight Over Poor Medical Students",
      "explanation": "The ECA has eight branches. Mechanism: it supplies the face and scalp. High-yield: maxillary and superficial temporal are terminal.",
      "visualMemoryAnchor": "Follow the scene: each campus landmark is one branch in walking order.",
      "story": "The angry ladies march across campus. They fight by the fountain. They block the quad gates. They collapse at the temple steps.",
      "visualScene": "A literal campus scene: eight named landmarks along one walking route, each landmark labeled by its branch, one continuous path from library to temple.",
      "ankiFront": "Name the terminal branches of the external carotid artery.",
      "ankiBack": "Maxillary and superficial temporal. The ECA supplies the face and scalp.",
      "quizQuestion": "Which ECA branch is terminal alongside the maxillary?",
      "quizAnswer": "The superficial temporal artery."
    }`
    const { parsed, strategy } = parseWithRecovery(retryResult)
    expect(strategy).toBe('direct')
    expect(validateRequiredFields(parsed, [
      ['explanation', 20],
      ['mnemonic', 5],
      ['story', 20],
      ['visualScene', 20],
    ])).toBeNull()
    expect(parsed.mnemonic).toContain('Angry Ladies')
  })
})

// ── buildCompactRetryMessages ─────────────────────────────────────────────────

describe('buildCompactRetryMessages', () => {
  it('returns a system and a user message', () => {
    const messages = buildCompactRetryMessages('Hyperkalemia', 'medicine', 'hybrid', 'clinical')
    expect(messages).toHaveLength(2)
    expect(messages[0].role).toBe('system')
    expect(messages[1].role).toBe('user')
  })

  it('carries the topic and subject into the retry prompt', () => {
    const [, user] = buildCompactRetryMessages('Hyperkalemia & ECG changes', 'medicine', 'hybrid', 'clinical')
    expect(user.content).toContain('Hyperkalemia & ECG changes')
    expect(user.content).toContain('medicine')
  })

  it('asks for exactly the required fields plus the small extras', () => {
    const [, user] = buildCompactRetryMessages('Warfarin', 'pharmacology', 'hybrid', 'clinical')
    for (const field of ['mnemonic', 'explanation', 'visualMemoryAnchor', 'story', 'visualScene', 'ankiFront', 'ankiBack', 'quizQuestion', 'quizAnswer']) {
      expect(user.content).toContain(field)
    }
  })

  it('keeps the retry prompt compact (much smaller than the full prompt)', () => {
    const [, user] = buildCompactRetryMessages('Warfarin', 'pharmacology', 'hybrid', 'clinical')
    expect(user.content.length).toBeLessThan(1500)
  })

  it('mentions the requested story style', () => {
    const [, user] = buildCompactRetryMessages('Warfarin', 'pharmacology', 'hybrid', 'fantasy')
    expect(user.content).toContain('fantasy')
  })

  it('adapts the mnemonic type instruction', () => {
    const [, acronym] = buildCompactRetryMessages('T', 'anatomy', 'acronym', 'clinical')
    expect(acronym.content).toContain('first-letter acronym')

    const [, spatial] = buildCompactRetryMessages('T', 'anatomy', 'spatial', 'clinical')
    expect(spatial.content).toContain('spatial-layout')

    const [, hook] = buildCompactRetryMessages('T', 'anatomy', 'hook', 'clinical')
    expect(hook.content).toContain('hook sentence')
  })
})

// ── parseGroqJson regression (shared by guide/quiz/simulation/examiner) ───────

describe('parseGroqJson regression', () => {
  it('still parses valid JSON directly', () => {
    expect(parseGroqJson('{"a": 1}')).toEqual({ a: 1 })
  })

  it('now also recovers prose-wrapped JSON (upgraded via parseWithRecovery)', () => {
    expect(parseGroqJson('Here you go: {"a": 1}')).toEqual({ a: 1 })
  })

  it('still repairs truncated JSON', () => {
    const parsed = parseGroqJson('{"definition": "complete definition text here"')
    expect(parsed.definition).toBe('complete definition text here')
  })
})
