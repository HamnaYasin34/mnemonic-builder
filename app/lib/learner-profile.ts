// ─────────────────────────────────────────────────────────────────────────────
// app/lib/learner-profile.ts
// Phase 5: Learner memory profile aggregation.
//
// Aggregates retrieval evidence into learner-level insights:
// strategy performance, subject performance, fact-type performance,
// confidence calibration, and overall learner profile.
//
// All aggregations use ACTUAL retrieval attempts — never fabricated.
// Small samples are handled with shrinking (conservative estimates).
// ─────────────────────────────────────────────────────────────────────────────

import {
  RetrievalValidation,
  StrategyPerformance,
  SubjectPerformance,
  FactTypePerformance,
  LearnerProfile,
  AdaptiveSignal,
  ConfidenceCalibration,
  StrategyEvidenceLevel,
  SubjectId,
  FactType,
  EVIDENCE_THRESHOLDS,
} from '../types'
import { loadValidations } from './retrieval-validation'

// ── Architecture Normalization ──────────────────────────────────────────────

/**
 * Normalize free-text architecture strings into a consistent strategy family.
 * Architecture and MemorySymbol.type are NOT interchangeable — this maps
 * the architecture-level concept (how the mnemonic is structured) into a
 * strategy family name for performance tracking.
 */
const ARCHITECTURE_MAP: Record<string, string> = {
  'pure story': 'story',
  'story': 'story',
  'storyline': 'story',
  'spatial layout': 'spatial',
  'spatial': 'spatial',
  'crazy hook': 'hook',
  'hook': 'hook',
  'acronym': 'acronym',
  'hybrid': 'hybrid',
  'combined': 'hybrid',
}

export function normalizeArchitecture(architecture?: string): string {
  if (!architecture) return 'unknown'
  const key = architecture.trim().toLowerCase()
  return ARCHITECTURE_MAP[key] ?? key
}

// ── Evidence Level ──────────────────────────────────────────────────────────

export function classifyEvidenceLevel(attempts: number): StrategyEvidenceLevel {
  if (attempts < EVIDENCE_THRESHOLDS.MIN_ATTEMPTS) return 'insufficient'
  if (attempts < EVIDENCE_THRESHOLDS.USABLE_SIGNAL) return 'weak'
  if (attempts < EVIDENCE_THRESHOLDS.STRONG_SIGNAL) return 'usable'
  return 'strong'
}

// ── Shrunk Estimate ────────────────────────────────────────────────────────

/**
 * Conservative/shrunk accuracy estimate. Pulls the raw accuracy toward the
 * global mean (0.5) based on how few observations exist. For large samples
 * the shrink is negligible; for 1/1 it returns ~0.67 instead of 1.0.
 *
 * Formula: (correct + prior) / (attempts + priorWeight)
 * where prior = priorWeight * globalMean
 */
function shrunkAccuracy(correct: number, attempts: number, globalMean = 0.5, priorWeight = 2): number {
  if (attempts === 0) return 0
  const prior = priorWeight * globalMean
  return (correct + prior) / (attempts + priorWeight)
}

// ── Strategy Performance Aggregation ────────────────────────────────────────

interface AttemptWithContext extends RetrievalValidation {
  /** Architecture/strategy from the mnemonic that produced this attempt. */
  architecture?: string
  /** Subject the mnemonic belongs to. */
  subject?: SubjectId
  /** Fact type classified for this topic. */
  factType?: FactType
  /** Symbol encoding type (literal, phonetic, semantic, etc.). */
  symbolType?: string
}

/**
 * Build a strategy performance record from a set of attempts sharing the
 * same strategy key.
 */
function buildStrategyRecord(
  strategy: string,
  attempts: AttemptWithContext[],
  subject?: SubjectId,
  factType?: FactType,
): StrategyPerformance {
  const correct = attempts.filter(a => a.isCorrect).length
  const delayed = attempts.filter(a => a.testType === 'delayed')
  const delayedCorrect = delayed.filter(a => a.isCorrect).length
  const falseRecalls = attempts.filter(a => a.falseRecall).length
  const highConfErrors = attempts.filter(a => !a.isCorrect && (a.confidence ?? 0) >= 4).length
  const confidences = attempts.filter(a => a.confidence != null).map(a => a.confidence!)
  const latencies = attempts.filter(a => a.responseTimeMs != null).map(a => a.responseTimeMs!)

  return {
    strategy,
    subject,
    factType,
    attempts: attempts.length,
    correct,
    accuracy: shrunkAccuracy(correct, attempts.length),
    averageConfidence: confidences.length > 0 ? confidences.reduce((a, b) => a + b, 0) / confidences.length : 0,
    averageLatencyMs: latencies.length > 0 ? latencies.reduce((a, b) => a + b, 0) / latencies.length : 0,
    falseRecallRate: attempts.length > 0 ? falseRecalls / attempts.length : 0,
    highConfidenceErrorRate: attempts.length > 0 ? highConfErrors / attempts.length : 0,
    delayedAttempts: delayed.length,
    delayedCorrect: delayedCorrect,
    delayedAccuracy: delayed.length > 0 ? shrunkAccuracy(delayedCorrect, delayed.length) : 0,
    evidenceLevel: classifyEvidenceLevel(attempts.length),
    updatedAt: new Date().toISOString(),
  }
}

/**
 * Aggregate strategy performance from retrieval attempts.
 * Groups attempts by normalized architecture (global + per-subject).
 */
export function getStrategyPerformance(
  attempts?: RetrievalValidation[],
): StrategyPerformance[] {
  const all = attempts ?? loadValidations()
  if (all.length === 0) return []

  // Group by strategy (global)
  const byStrategy = new Map<string, AttemptWithContext[]>()
  // Group by strategy + subject
  const byStrategySubject = new Map<string, AttemptWithContext[]>()

  for (const a of all) {
    const strategy = normalizeArchitecture((a as any).architecture) || 'unknown'
    if (strategy === 'unknown') continue

    // Global grouping
    if (!byStrategy.has(strategy)) byStrategy.set(strategy, [])
    byStrategy.get(strategy)!.push(a as AttemptWithContext)

    // Per-subject grouping
    const subject = (a as any).subject as SubjectId | undefined
    if (subject) {
      const key = `${strategy}::${subject}`
      if (!byStrategySubject.has(key)) byStrategySubject.set(key, [])
      byStrategySubject.get(key)!.push(a as AttemptWithContext)
    }
  }

  const results: StrategyPerformance[] = []

  // Global strategy records
  for (const [strategy, group] of byStrategy) {
    results.push(buildStrategyRecord(strategy, group))
  }

  // Per-subject strategy records
  for (const [key, group] of byStrategySubject) {
    const [strategy, subject] = key.split('::')
    results.push(buildStrategyRecord(strategy, group, subject as SubjectId))
  }

  // Sort by evidence level (strong first) then accuracy
  results.sort((a, b) => {
    const levelOrder = { strong: 4, usable: 3, weak: 2, insufficient: 1 }
    const lDiff = levelOrder[b.evidenceLevel] - levelOrder[a.evidenceLevel]
    if (lDiff !== 0) return lDiff
    return b.accuracy - a.accuracy
  })

  return results
}

// ── Subject Performance Aggregation ─────────────────────────────────────────

export function getSubjectWeaknesses(
  attempts?: RetrievalValidation[],
): { weak: SubjectPerformance[]; strong: SubjectPerformance[]; all: SubjectPerformance[] } {
  const all = attempts ?? loadValidations()
  if (all.length === 0) return { weak: [], strong: [], all: [] }

  const bySubject = new Map<string, RetrievalValidation[]>()
  for (const a of all) {
    const subj = (a as any).subject as string | undefined
    if (!subj) continue
    if (!bySubject.has(subj)) bySubject.set(subj, [])
    bySubject.get(subj)!.push(a)
  }

  const records: SubjectPerformance[] = []
  for (const [subj, group] of bySubject) {
    const correct = group.filter(a => a.isCorrect).length
    const byMnemonic = new Map<string, boolean[]>()
    for (const a of group) {
      if (!byMnemonic.has(a.mnemonicId)) byMnemonic.set(a.mnemonicId, [])
      byMnemonic.get(a.mnemonicId)!.push(a.isCorrect)
    }
    const weakTopics: string[] = []
    const strongTopics: string[] = []
    for (const [mid, results] of byMnemonic) {
      const acc = results.filter(Boolean).length / results.length
      if (acc < 0.5 && results.length >= 2) weakTopics.push(mid)
      else if (acc >= 0.8 && results.length >= 2) strongTopics.push(mid)
    }
    const confidences = group.filter(a => a.confidence != null).map(a => a.confidence!)

    records.push({
      subject: subj as SubjectId,
      attempts: group.length,
      correct,
      accuracy: shrunkAccuracy(correct, group.length),
      averageConfidence: confidences.length > 0 ? confidences.reduce((a, b) => a + b, 0) / confidences.length : 0,
      weakTopics,
      strongTopics,
      updatedAt: new Date().toISOString(),
    })
  }

  records.sort((a, b) => b.accuracy - a.accuracy)

  return {
    weak: records.filter(r => r.accuracy < 0.5 && r.attempts >= EVIDENCE_THRESHOLDS.MIN_ATTEMPTS),
    strong: records.filter(r => r.accuracy >= 0.8 && r.attempts >= EVIDENCE_THRESHOLDS.MIN_ATTEMPTS),
    all: records,
  }
}

// ── Fact-Type Performance ───────────────────────────────────────────────────

export function getFactTypePerformance(
  attempts?: RetrievalValidation[],
): FactTypePerformance[] {
  const all = attempts ?? loadValidations()
  if (all.length === 0) return []

  const byType = new Map<string, RetrievalValidation[]>()
  for (const a of all) {
    const ft = (a as any).factType as string | undefined
    if (!ft) continue
    if (!byType.has(ft)) byType.set(ft, [])
    byType.get(ft)!.push(a)
  }

  const records: FactTypePerformance[] = []
  for (const [ft, group] of byType) {
    const correct = group.filter(a => a.isCorrect).length
    records.push({
      factType: ft as FactType,
      attempts: group.length,
      correct,
      accuracy: shrunkAccuracy(correct, group.length),
      updatedAt: new Date().toISOString(),
    })
  }

  records.sort((a, b) => b.accuracy - a.accuracy)
  return records
}

// ── Confidence Calibration ──────────────────────────────────────────────────

export function computeConfidenceCalibration(
  attempts?: RetrievalValidation[],
): ConfidenceCalibration {
  const all = attempts ?? loadValidations()
  const withConf = all.filter(a => a.confidence != null)
  if (withConf.length < EVIDENCE_THRESHOLDS.MIN_ATTEMPTS) return 'insufficient_data'

  let highConfCorrect = 0, highConfTotal = 0
  let lowConfCorrect = 0, lowConfTotal = 0

  for (const a of withConf) {
    if ((a.confidence ?? 0) >= 4) {
      highConfTotal++
      if (a.isCorrect) highConfCorrect++
    } else if ((a.confidence ?? 0) <= 2) {
      lowConfTotal++
      if (a.isCorrect) lowConfCorrect++
    }
  }

  if (highConfTotal < 2) return 'insufficient_data'

  const highConfAccuracy = highConfCorrect / highConfTotal
  const lowConfAccuracy = lowConfTotal > 0 ? lowConfCorrect / lowConfTotal : 0.5

  // Overconfident: high confidence but low accuracy
  if (highConfAccuracy < 0.5) return 'overconfident'
  // Underconfident: low confidence but high accuracy
  if (lowConfTotal >= 2 && lowConfAccuracy > 0.7 && highConfAccuracy > 0.7) return 'underconfident'
  // Well calibrated: confidence tracks accuracy
  return 'well_calibrated'
}

// ── Overall Learner Profile ─────────────────────────────────────────────────

export function getOverallLearnerProfile(
  attempts?: RetrievalValidation[],
): LearnerProfile {
  const all = attempts ?? loadValidations()
  const now = new Date().toISOString()

  if (all.length === 0) {
    return {
      totalAttempts: 0, totalCorrect: 0, overallAccuracy: 0,
      delayedAccuracy: 0, averageConfidence: 0,
      confidenceCalibration: 'insufficient_data',
      averageLatencyMs: 0, falseRecallRate: 0,
      highConfidenceErrorRate: 0, repeatedErrorRate: 0,
      strategyRanking: [], strongestStrategy: null, weakestStrategy: null,
      subjectPerformance: [], weakSubjects: [], strongSubjects: [],
      factTypePerformance: [], profileVersion: 1, updatedAt: now,
    }
  }

  const correct = all.filter(a => a.isCorrect).length
  const delayed = all.filter(a => a.testType === 'delayed')
  const delayedCorrect = delayed.filter(a => a.isCorrect).length
  const falseRecalls = all.filter(a => a.falseRecall).length
  const highConfErrors = all.filter(a => !a.isCorrect && (a.confidence ?? 0) >= 4).length
  const confidences = all.filter(a => a.confidence != null).map(a => a.confidence!)
  const latencies = all.filter(a => a.responseTimeMs != null).map(a => a.responseTimeMs!)

  // Repeated errors: symbols with 2+ incorrect attempts
  const symbolErrors = new Map<string, { total: number; incorrect: number }>()
  for (const a of all) {
    const key = `${a.mnemonicId}::${a.symbolId}`
    if (!symbolErrors.has(key)) symbolErrors.set(key, { total: 0, incorrect: 0 })
    const e = symbolErrors.get(key)!
    e.total++
    if (!a.isCorrect) e.incorrect++
  }
  const repeatedErrorSymbols = Array.from(symbolErrors.values()).filter(e => e.incorrect >= 2).length
  const totalSymbols = symbolErrors.size

  const strategyRanking = getStrategyPerformance(all).filter(
    s => !s.subject && s.evidenceLevel !== 'insufficient'
  )
  const strongest = strategyRanking.length > 0 ? strategyRanking[0] : null
  const weakest = strategyRanking.length > 1 ? strategyRanking[strategyRanking.length - 1] : null

  const { weak, strong, all: subjAll } = getSubjectWeaknesses(all)

  return {
    totalAttempts: all.length,
    totalCorrect: correct,
    overallAccuracy: shrunkAccuracy(correct, all.length),
    delayedAccuracy: delayed.length > 0 ? shrunkAccuracy(delayedCorrect, delayed.length) : 0,
    averageConfidence: confidences.length > 0 ? confidences.reduce((a, b) => a + b, 0) / confidences.length : 0,
    confidenceCalibration: computeConfidenceCalibration(all),
    averageLatencyMs: latencies.length > 0 ? latencies.reduce((a, b) => a + b, 0) / latencies.length : 0,
    falseRecallRate: all.length > 0 ? falseRecalls / all.length : 0,
    highConfidenceErrorRate: all.length > 0 ? highConfErrors / all.length : 0,
    repeatedErrorRate: totalSymbols > 0 ? repeatedErrorSymbols / totalSymbols : 0,
    strategyRanking,
    strongestStrategy: strongest,
    weakestStrategy: weakest,
    subjectPerformance: subjAll,
    weakSubjects: weak,
    strongSubjects: strong,
    factTypePerformance: getFactTypePerformance(all),
    profileVersion: 1,
    updatedAt: now,
  }
}

// ── Compact Adaptive Signal ─────────────────────────────────────────────────

/**
 * Build a compact AdaptiveSignal from the learner profile — this is what
 * gets sent to the generation API. Never contains raw responses or full
 * retrieval history.
 */
export function buildAdaptiveSignal(profile: LearnerProfile): AdaptiveSignal | null {
  if (profile.totalAttempts < EVIDENCE_THRESHOLDS.MIN_ATTEMPTS) return null

  const strongest = profile.strategyRanking
    .filter(s => s.evidenceLevel !== 'insufficient')
    .slice(0, 3)
    .map(s => ({ strategy: s.strategy, accuracy: Math.round(s.accuracy * 100) / 100, evidenceLevel: s.evidenceLevel }))

  const weakest = profile.strategyRanking
    .filter(s => s.evidenceLevel !== 'insufficient')
    .slice(-2)
    .reverse()
    .map(s => ({ strategy: s.strategy, accuracy: Math.round(s.accuracy * 100) / 100, evidenceLevel: s.evidenceLevel }))

  const subjectSignals = profile.subjectPerformance
    .filter(s => s.attempts >= EVIDENCE_THRESHOLDS.MIN_ATTEMPTS)
    .map(s => ({ subject: s.subject, accuracy: Math.round(s.accuracy * 100) / 100, attempts: s.attempts }))

  const factTypeSignals = profile.factTypePerformance
    .filter(f => f.attempts >= EVIDENCE_THRESHOLDS.MIN_ATTEMPTS)
    .map(f => ({ factType: f.factType, accuracy: Math.round(f.accuracy * 100) / 100, attempts: f.attempts }))

  return {
    strongestStrategies: strongest.length > 0 ? strongest : undefined,
    weakestStrategies: weakest.length > 0 ? weakest : undefined,
    subjectSignals: subjectSignals.length > 0 ? subjectSignals : undefined,
    factTypeSignals: factTypeSignals.length > 0 ? factTypeSignals : undefined,
    confidenceCalibration: profile.confidenceCalibration !== 'insufficient_data' ? profile.confidenceCalibration : undefined,
    totalAttempts: profile.totalAttempts,
  }
}

/** Convenience: aggregate from localStorage and build the signal in one call. */
export function aggregateLearnerInsights(): { profile: LearnerProfile; signal: AdaptiveSignal | null } {
  const profile = getOverallLearnerProfile()
  const signal = buildAdaptiveSignal(profile)
  return { profile, signal }
}
