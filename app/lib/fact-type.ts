// ─────────────────────────────────────────────────────────────────────────────
// app/lib/fact-type.ts
// Phase 5: Deterministic fact-type classification.
//
// Uses topic metadata (subject, memoryProblem values from symbols) to classify
// the dominant fact type of a topic WITHOUT sending to the LLM.
// The classifier informs adaptive strategy selection — it does NOT alter
// medical facts.
//
// When confidence is low, returns 'unknown' rather than guessing.
// ─────────────────────────────────────────────────────────────────────────────

import { FactType, MemorySymbol, SubjectId } from '../types'

/**
 * Keywords that signal specific fact types.
 * Each entry maps a pattern to a fact type with a weight.
 */
const TOPIC_KEYWORDS: Record<FactType, string[]> = {
  sequence: ['steps', 'order', 'sequence', 'stages', 'phases', 'cascade', 'series', 'chain', 'cycle'],
  spatial: ['branches', 'relations', 'location', 'position', 'anatomy', 'triangle', 'fossa', 'space', 'region', 'layer', 'sinus'],
  contrast: ['vs', 'versus', 'difference', 'compare', 'differential', 'distinguish', 'classification'],
  mechanism: ['mechanism', 'pathway', 'process', 'how', 'action', 'function', 'regulation', 'signaling', 'synthesis'],
  association: ['association', 'syndrome', 'triad', 'linked', 'related', 'correlation', 'complication'],
  number: ['dose', 'dose range', 'value', 'level', 'count', 'percentage', 'ratio', 'measurement', 'normal range'],
  pathway: ['pathway', 'tract', 'route', 'course', 'artery', 'vein', 'nerve', 'blood supply', 'drainage', 'innervation'],
  causality: ['cause', 'etiology', 'risk factor', 'leads to', 'results in', 'trigger', 'predisposing'],
  morphology: ['shape', 'structure', 'appearance', 'histology', 'morphology', 'gross', 'microscopic'],
  classification: ['types', 'classes', 'categories', 'classification', 'grading', 'staging', 'groups'],
  unknown: [],
}

/**
 * Subject-level hints — certain subjects strongly correlate with specific
 * fact types. Used as a secondary signal when topic keywords are ambiguous.
 */
const SUBJECT_FACT_HINTS: Partial<Record<SubjectId, FactType[]>> = {
  'anatomy': ['spatial', 'pathway', 'morphology'],
  'bds-anatomy': ['spatial', 'pathway', 'morphology'],
  'physiology': ['mechanism', 'pathway', 'sequence'],
  'bds-physiology': ['mechanism', 'pathway', 'sequence'],
  'pharmacology': ['association', 'number', 'mechanism'],
  'bds-pharmacology': ['association', 'number', 'mechanism'],
  'pathology': ['morphology', 'causality', 'classification'],
  'bds-pathology': ['morphology', 'causality', 'classification'],
  'microbiology': ['classification', 'morphology', 'association'],
  'bds-microbiology': ['classification', 'morphology', 'association'],
  'biochemistry': ['pathway', 'sequence', 'mechanism'],
  'oral-biology': ['morphology', 'spatial'],
  'oral-histology': ['morphology', 'classification'],
  'community-medicine': ['causality', 'number', 'classification'],
  'community-dentistry': ['causality', 'number', 'classification'],
}

/**
 * memoryProblem values from the generation pipeline map to fact types.
 * These are LLM-generated and represent WHY each fact is hard to remember.
 */
const MEMORY_PROBLEM_TO_FACT_TYPE: Record<string, FactType> = {
  'sequence': 'sequence',
  'shape': 'morphology',
  'branching': 'spatial',
  'contrast': 'contrast',
  'mechanism': 'mechanism',
  'association': 'association',
  'number': 'number',
  'laterality': 'spatial',
  'pathway': 'pathway',
  'causality': 'causality',
}

/**
 * Classify the dominant fact type of a topic based on:
 * 1. Topic name keywords (strongest signal)
 * 2. Symbol memoryProblem values (medium signal)
 * 3. Subject hints (weakest signal, used as tiebreaker)
 *
 * Returns 'unknown' when evidence is insufficient.
 */
export function classifyFactType(
  topic: string,
  symbols?: MemorySymbol[],
  subject?: SubjectId,
): FactType {
  const topicLower = topic.toLowerCase()

  // 1. Score from topic keywords
  const scores: Partial<Record<FactType, number>> = {}
  for (const [factType, keywords] of Object.entries(TOPIC_KEYWORDS)) {
    if (factType === 'unknown') continue
    for (const kw of keywords) {
      if (topicLower.includes(kw)) {
        scores[factType as FactType] = (scores[factType as FactType] ?? 0) + 1
      }
    }
  }

  // 2. Score from symbol memoryProblem values
  if (symbols && symbols.length > 0) {
    const problemCounts: Partial<Record<FactType, number>> = {}
    for (const sym of symbols) {
      if (sym.memoryProblem) {
        const mapped = MEMORY_PROBLEM_TO_FACT_TYPE[sym.memoryProblem.toLowerCase()]
        if (mapped) {
          problemCounts[mapped] = (problemCounts[mapped] ?? 0) + 1
        }
      }
    }
    // Add symbol-level signals (weighted less than topic keywords)
    for (const [ft, count] of Object.entries(problemCounts)) {
      scores[ft as FactType] = (scores[ft as FactType] ?? 0) + count * 0.5
    }
  }

  // 3. Subject hints (weakest signal — only used as tiebreaker)
  if (subject && SUBJECT_FACT_HINTS[subject]) {
    for (const ft of SUBJECT_FACT_HINTS[subject]!) {
      scores[ft] = (scores[ft] ?? 0) + 0.3
    }
  }

  // Find the top score
  let bestType: FactType = 'unknown'
  let bestScore = 0
  for (const [ft, score] of Object.entries(scores)) {
    if (score > bestScore) {
      bestScore = score
      bestType = ft as FactType
    }
  }

  // Require minimum confidence — at least 1 point from keywords/symbols
  // Subject hints alone (0.3) are not enough to classify
  if (bestScore < 1) return 'unknown'

  return bestType
}

/**
 * Get strategies that are naturally compatible with a given fact type.
 * Used by the adaptive strategy selector to constrain choices.
 */
export function getCompatibleStrategies(factType: FactType): string[] {
  const COMPATIBILITY: Record<FactType, string[]> = {
    'sequence': ['story', 'spatial', 'hook'],
    'spatial': ['spatial', 'story', 'semantic'],
    'contrast': ['semantic', 'story', 'phonetic'],
    'mechanism': ['story', 'spatial', 'semantic'],
    'association': ['phonetic', 'semantic', 'story'],
    'number': ['phonetic', 'hook', 'semantic'],
    'pathway': ['spatial', 'story', 'semantic'],
    'causality': ['story', 'semantic', 'spatial'],
    'morphology': ['spatial', 'semantic', 'functional'],
    'classification': ['semantic', 'story', 'spatial'],
    'unknown': ['story', 'spatial', 'phonetic', 'semantic', 'hook'],
  }
  return COMPATIBILITY[factType] ?? COMPATIBILITY['unknown']
}

/**
 * Check whether a specific strategy is compatible with a fact type.
 */
export function isStrategyCompatible(factType: FactType, strategy: string): boolean {
  return getCompatibleStrategies(factType).includes(strategy)
}
