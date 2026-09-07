// ─────────────────────────────────────────────────────────────────────────────
// app/lib/adaptive-strategy.ts
// Phase 5: Adaptive strategy selection.
//
// Selects the best mnemonic strategy for a given topic by combining:
// 1. Fact-type compatibility (highest priority)
// 2. Learner evidence (subject-specific → global)
// 3. Default fallback
//
// Never forces a learner preference if it conflicts with the nature of the
// fact. The hierarchy is:
//   Medical correctness → Fact-type compatibility → Memory strategy → Learner preference
// ─────────────────────────────────────────────────────────────────────────────

import {
  AdaptiveSignal,
  FactType,
  StrategyEvidenceLevel,
  EVIDENCE_THRESHOLDS,
  MnemonicType,
  FailureDiagnosis,
  FailureReason,
  RetrievalValidation,
} from '../types'
import { isStrategyCompatible, getCompatibleStrategies } from './fact-type'
import { normalizeArchitecture, classifyEvidenceLevel } from './learner-profile'

// ── Strategy Selection ──────────────────────────────────────────────────────

export interface StrategyRecommendation {
  /** Recommended architecture string (e.g. "Pure Story", "Spatial Layout"). */
  architecture: string
  /** The strategy family name (story, spatial, phonetic, etc.). */
  strategyFamily: string
  /** Why this strategy was selected (for debugging/transparency). */
  reason: string
  /** Evidence strength behind this recommendation. */
  evidenceLevel: StrategyEvidenceLevel
  /** Confidence score 0-100 for internal ranking. */
  score: number
}

/** Map from strategy family to common architecture display names. */
const FAMILY_TO_ARCHITECTURE: Record<string, string> = {
  'story': 'Pure Story',
  'spatial': 'Spatial Layout',
  'hook': 'Crazy Hook',
  'acronym': 'Acronym',
  'hybrid': 'Hybrid',
  'phonetic': 'Pure Story',   // phonetic encoding within a story
  'semantic': 'Pure Story',   // semantic encoding within a story
  'functional': 'Spatial Layout',
}

/**
 * Select the best strategy for a given topic, considering:
 * - factType: what kind of medical fact this is
 * - signal: the learner's aggregated evidence
 * - subject: the medical subject
 * - explicitType: user-requested MnemonicType (overrides adaptive if not 'auto')
 */
export function selectStrategy(
  factType: FactType,
  signal: AdaptiveSignal | null,
  subject?: string,
  explicitType?: MnemonicType,
): StrategyRecommendation {
  // If the user explicitly chose a non-auto type, respect it
  if (explicitType && explicitType !== 'auto') {
    return {
      architecture: FAMILY_TO_ARCHITECTURE[explicitType] ?? explicitType,
      strategyFamily: explicitType,
      reason: `User explicitly selected ${explicitType}.`,
      evidenceLevel: 'insufficient',
      score: 100, // user override
    }
  }

  // No learner evidence yet — use fact-type defaults
  if (!signal || !signal.strongestStrategies || signal.strongestStrategies.length === 0) {
    const compatible = getCompatibleStrategies(factType)
    const defaultStrategy = compatible[0] ?? 'story'
    return {
      architecture: FAMILY_TO_ARCHITECTURE[defaultStrategy] ?? 'Pure Story',
      strategyFamily: defaultStrategy,
      reason: factType !== 'unknown'
        ? `No learner evidence yet. Using ${defaultStrategy} as the default for ${factType} facts.`
        : 'No learner evidence yet. Using default storyline approach.',
      evidenceLevel: 'insufficient',
      score: 50,
    }
  }

  // Score each candidate strategy
  const candidates = scoreStrategies(factType, signal, subject)

  // Return the best candidate
  const best = candidates[0]
  return {
    architecture: FAMILY_TO_ARCHITECTURE[best.strategyFamily] ?? 'Pure Story',
    strategyFamily: best.strategyFamily,
    reason: best.reason,
    evidenceLevel: best.evidenceLevel,
    score: best.score,
  }
}

interface CandidateScore {
  strategyFamily: string
  score: number
  evidenceLevel: StrategyEvidenceLevel
  reason: string
}

function scoreStrategies(
  factType: FactType,
  signal: AdaptiveSignal,
  subject?: string,
): CandidateScore[] {
  const candidates: CandidateScore[] = []

  // Score each strategy the learner has evidence for
  for (const strat of signal.strongestStrategies ?? []) {
    const compatible = isStrategyCompatible(factType, strat.strategy)
    const evLevel = strat.evidenceLevel as StrategyEvidenceLevel
    const evWeight = evLevel === 'strong' ? 1.0 : evLevel === 'usable' ? 0.8 : 0.5

    let score = strat.accuracy * 100 * evWeight

    // Fact-type compatibility bonus/penalty
    if (factType !== 'unknown') {
      if (compatible) score += 15
      else score -= 20
    }

    // Subject-specific bonus: check if this subject has evidence
    const subjectSignal = signal.subjectSignals?.find(s => s.subject === subject)
    if (subjectSignal && subjectSignal.attempts >= EVIDENCE_THRESHOLDS.MIN_ATTEMPTS) {
      // If the learner is good at this subject, give a small bonus
      score += subjectSignal.accuracy > 0.7 ? 5 : 0
    }

    candidates.push({
      strategyFamily: strat.strategy,
      score: Math.round(score),
      evidenceLevel: evLevel,
      reason: compatible
        ? `Strong performance with ${strat.strategy} (${Math.round(strat.accuracy * 100)}% accuracy, ${evLevel} evidence). Compatible with ${factType} facts.`
        : `Strong performance with ${strat.strategy} but less compatible with ${factType} facts.`,
    })
  }

  // Also consider fact-type default strategies that might not be in the learner's history
  const compatibleDefaults = getCompatibleStrategies(factType)
  for (const strat of compatibleDefaults) {
    if (!candidates.find(c => c.strategyFamily === strat)) {
      candidates.push({
        strategyFamily: strat,
        score: 40, // baseline score for untested but compatible strategies
        evidenceLevel: 'insufficient',
        reason: `No learner evidence for ${strat}, but it is compatible with ${factType} facts.`,
      })
    }
  }

  // Penalize weakest strategies
  for (const weak of signal.weakestStrategies ?? []) {
    const existing = candidates.find(c => c.strategyFamily === weak.strategy)
    if (existing) {
      existing.score -= 10
      existing.reason += ` Penalized: learner has weaker performance here.`
    }
  }

  // Sort by score descending
  candidates.sort((a, b) => b.score - a.score)
  return candidates
}

// ── Adaptive Prompt Text ────────────────────────────────────────────────────

/**
 * Build a compact learner-adaptation text block for the generation prompt.
 * This goes into Stage 3 of the pipeline as a preference signal.
 * Never includes raw percentages with tiny samples.
 */
export function buildAdaptivePromptText(
  recommendation: StrategyRecommendation,
  factType: FactType,
): string {
  if (recommendation.evidenceLevel === 'insufficient') {
    if (factType !== 'unknown') {
      return `FACT TYPE: This topic involves ${factType}-type learning. Use ${recommendation.strategyFamily} approach as the natural fit.`
    }
    return '' // no signal, no text
  }

  const evLabel = recommendation.evidenceLevel === 'strong' ? 'strong evidence'
    : recommendation.evidenceLevel === 'usable' ? 'developing evidence'
    : 'early evidence'

  const compatible = isStrategyCompatible(factType, recommendation.strategyFamily)

  let text = `LEARNER ADAPTATION: The learner has demonstrated stronger retrieval with ${recommendation.strategyFamily} approaches (${evLabel}).`

  if (factType !== 'unknown') {
    text += compatible
      ? ` This is compatible with the ${factType} nature of this topic.`
      : ` However, this topic is ${factType}-type — prioritize fact-type compatibility over learner preference.`
  }

  text += ' Use this as a preference signal, not an absolute rule. Never sacrifice factual correctness or fact-type compatibility to follow a learner preference.'

  return text
}

// ── Failure-Driven Regeneration ─────────────────────────────────────────────

/**
 * Diagnose why a symbol repeatedly fails retrieval.
 * Returns null if there is insufficient evidence to diagnose.
 */
export function diagnoseRetrievalFailure(
  symbolAttempts: RetrievalValidation[],
  currentArchitecture?: string,
): FailureDiagnosis | null {
  if (symbolAttempts.length < EVIDENCE_THRESHOLDS.MIN_ATTEMPTS) return null

  const correct = symbolAttempts.filter(a => a.isCorrect).length
  const accuracy = correct / symbolAttempts.length
  const falseRecalls = symbolAttempts.filter(a => a.falseRecall).length
  const highConfErrors = symbolAttempts.filter(a => !a.isCorrect && (a.confidence ?? 0) >= 4).length
  const symbolId = symbolAttempts[0].symbolId
  const mnemonicId = symbolAttempts[0].mnemonicId
  const strategy = normalizeArchitecture(currentArchitecture)

  // Must be poor performance to trigger diagnosis
  if (accuracy >= 0.5) return null

  let reason: FailureReason = 'insufficient_evidence'
  let suggestedAlternatives: string[] = []
  let note = ''

  // Classify the failure
  if (falseRecalls >= 2) {
    // Student keeps retrieving the wrong-but-related fact
    reason = 'confusable_cue'
    note = 'Repeated false recall — the cue may be triggering a related but incorrect fact.'
    suggestedAlternatives = strategy === 'story' ? ['spatial', 'semantic'] : ['story', 'phonetic']
  } else if (highConfErrors >= 2) {
    // Student is confident but wrong — the cue is misleading
    reason = 'weak_cue'
    note = 'High confidence errors — the cue may be ambiguous or misleading.'
    suggestedAlternatives = strategy === 'phonetic' ? ['semantic', 'story'] : ['phonetic', 'semantic']
  } else if (accuracy <= 0.2 && symbolAttempts.length >= EVIDENCE_THRESHOLDS.USABLE_SIGNAL) {
    // Near-total failure — likely wrong association
    reason = 'incorrect_association'
    note = 'Very low accuracy — the cue-to-fact association may not be working for this learner.'
    suggestedAlternatives = getAlternativeStrategies(strategy)
  } else {
    // General poor performance
    reason = 'weak_cue'
    note = 'Below-threshold accuracy — the cue may need a stronger or different encoding.'
    suggestedAlternatives = getAlternativeStrategies(strategy)
  }

  return {
    symbolId,
    mnemonicId,
    reason,
    currentStrategy: strategy,
    suggestedAlternatives,
    attemptCount: symbolAttempts.length,
    accuracy,
    note,
  }
}

/**
 * Get alternative strategies when the current one is failing.
 * Only returns strategies compatible with common medical fact types.
 */
function getAlternativeStrategies(currentStrategy: string): string[] {
  const ALTERNATIVES: Record<string, string[]> = {
    'story': ['spatial', 'semantic', 'phonetic'],
    'spatial': ['story', 'semantic', 'phonetic'],
    'phonetic': ['semantic', 'story', 'hook'],
    'semantic': ['phonetic', 'story', 'spatial'],
    'hook': ['story', 'phonetic', 'semantic'],
    'acronym': ['story', 'spatial', 'hook'],
    'hybrid': ['story', 'spatial', 'phonetic'],
    'unknown': ['story', 'spatial', 'phonetic', 'semantic'],
  }
  return ALTERNATIVES[currentStrategy] ?? ALTERNATIVES['unknown']
}

/**
 * Check if a symbol should trigger alternative generation.
 * Returns the diagnosis if triggered, null otherwise.
 */
export function shouldTriggerAlternative(
  symbolAttempts: RetrievalValidation[],
  currentArchitecture?: string,
): FailureDiagnosis | null {
  const diagnosis = diagnoseRetrievalFailure(symbolAttempts, currentArchitecture)
  if (!diagnosis) return null

  // Only trigger after sufficient attempts AND poor performance
  if (diagnosis.attemptCount < EVIDENCE_THRESHOLDS.MIN_ATTEMPTS) return null

  return diagnosis
}
