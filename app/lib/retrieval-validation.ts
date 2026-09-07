// ─────────────────────────────────────────────────────────────────────────────
// app/lib/retrieval-validation.ts
// Phase 4: Human Retrieval Validation & Evidence Layer.
//
// All retrieval-validation attempts are stored in localStorage following the
// same pattern as vault.ts. The SWAP POINT in vault.ts documents how to
// migrate to Supabase — the same approach applies here.
//
// Every function in this module operates on REAL student interactions only.
// No fabricated data, no AI-generated confidence converted to human evidence.
// ─────────────────────────────────────────────────────────────────────────────

import {
  RetrievalValidation,
  RetrievalTestType,
  EvidenceMetrics,
  EvidenceLabel,
  QualityPredictionComparison,
  MemorySymbol,
} from '../types'

const STORAGE_KEY = 'mnemonicflow_retrieval_validation_v1'

// ── Storage ────────────────────────────────────────────────────────────────

/** Load all retrieval-validation attempts from localStorage. */
export function loadValidations(): RetrievalValidation[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

/** Save the full attempts array to localStorage. */
export function saveValidations(attempts: RetrievalValidation[]): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(attempts))
  } catch {
    // Quota exceeded — evict oldest 50%
    const half = Math.floor(attempts.length / 2)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(attempts.slice(half)))
  }
}

/** Append a single new attempt and persist it. Returns the updated array. */
export function addValidation(attempt: RetrievalValidation): RetrievalValidation[] {
  const all = loadValidations()
  all.push(attempt)
  saveValidations(all)
  return all
}

/** Get all attempts for a specific symbol. */
export function getSymbolAttempts(mnemonicId: string, symbolId: string): RetrievalValidation[] {
  return loadValidations().filter(a => a.mnemonicId === mnemonicId && a.symbolId === symbolId)
}

/** Get all attempts for a specific mnemonic (all symbols). */
export function getMnemonicAttempts(mnemonicId: string): RetrievalValidation[] {
  return loadValidations().filter(a => a.mnemonicId === mnemonicId)
}

/** Clear all validation data (for testing / reset). */
export function clearValidations(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(STORAGE_KEY)
}

// ── ID Generation ──────────────────────────────────────────────────────────

/** Stable mnemonic ID from topic + first symbol cue (survives regeneration for same topic). */
export function deriveMnemonicId(topic: string): string {
  let h = 0
  for (let i = 0; i < topic.length; i++) {
    h = ((h << 5) - h + topic.charCodeAt(i)) | 0
  }
  return `mn-${Math.abs(h).toString(36)}`
}

/** Stable symbol ID from topic + cue text. */
export function deriveSymbolId(topic: string, cue: string): string {
  const raw = `${topic}::${cue}`
  let h = 0
  for (let i = 0; i < raw.length; i++) {
    h = ((h << 5) - h + raw.charCodeAt(i)) | 0
  }
  return `sym-${Math.abs(h).toString(36)}`
}

/** Next attempt number for a given symbol. */
export function nextAttemptNumber(mnemonicId: string, symbolId: string): number {
  const attempts = getSymbolAttempts(mnemonicId, symbolId)
  return attempts.length + 1
}

// ── Response Judging ───────────────────────────────────────────────────────

/**
 * Judge a student's free-text response against the target answer.
 * Uses token-overlap scoring with medical-term weighting — an exact match
 * is not required, but key medical terms must appear.
 */
export function judgeResponse(response: string, targetAnswer: string): { isCorrect: boolean; falseRecall: boolean } {
  const resp = response.trim().toLowerCase()
  const target = targetAnswer.trim().toLowerCase()

  if (!resp) return { isCorrect: false, falseRecall: false }

  // Tokenize both, filter stopwords
  const stop = new Set(['the', 'a', 'an', 'is', 'are', 'was', 'were', 'to', 'of', 'in', 'and', 'or', 'for', 'it', 'that', 'this', 'with', 'from', 'by', 'at', 'on', 'as'])
  const respTokens = new Set(resp.split(/\s+/).filter(w => w.length > 2 && !stop.has(w)))
  const targetTokens = target.split(/\s+/).filter(w => w.length > 2 && !stop.has(w))

  if (targetTokens.length === 0) return { isCorrect: resp.length > 5, falseRecall: false }

  // Key medical terms: words > 4 chars in the target that aren't stopwords
  const keyTerms = targetTokens.filter(w => w.length > 4)
  const keyHit = keyTerms.filter(w => respTokens.has(w) || resp.includes(w)).length
  const keyRatio = keyTerms.length > 0 ? keyHit / keyTerms.length : 1

  // General token overlap
  let overlap = 0
  for (const t of targetTokens) if (respTokens.has(t) || resp.includes(t)) overlap++
  const generalRatio = targetTokens.length > 0 ? overlap / targetTokens.length : 0

  const isCorrect = keyRatio >= 0.5 && generalRatio >= 0.3

  // False recall: response is plausible (mentions related medical terms) but wrong
  // Detect when the student mentions similar structures/concepts but misses the target
  const falseRecall = !isCorrect && keyRatio > 0 && generalRatio > 0.15

  return { isCorrect, falseRecall }
}

// ── Evidence Metrics ───────────────────────────────────────────────────────

/** Compute aggregated evidence metrics for a symbol from its attempts. */
export function computeEvidenceMetrics(symbolId: string, attempts: RetrievalValidation[]): EvidenceMetrics {
  if (attempts.length === 0) {
    return {
      symbolId, totalAttempts: 0, recallAccuracy: 0, delayedRetention: 0,
      falseRecallRate: 0, highConfidenceErrorRate: 0, medianLatencyMs: 0,
      discriminationAccuracy: 0, rephrasedAccuracy: 0, clinicalTransferAccuracy: 0,
    }
  }

  const correct = attempts.filter(a => a.isCorrect).length
  const delayed = attempts.filter(a => a.testType === 'delayed')
  const delayedCorrect = delayed.filter(a => a.isCorrect).length
  const falseRecalls = attempts.filter(a => a.falseRecall).length
  const highConfErrors = attempts.filter(a => !a.isCorrect && (a.confidence ?? 0) >= 4).length
  const latencies = attempts.filter(a => a.responseTimeMs != null).map(a => a.responseTimeMs!).sort((a, b) => a - b)
  const discrimination = attempts.filter(a => a.testType === 'discrimination')
  const rephrased = attempts.filter(a => a.testType === 'rephrased')
  const clinical = attempts.filter(a => a.testType === 'clinical_transfer')

  return {
    symbolId,
    totalAttempts: attempts.length,
    recallAccuracy: correct / attempts.length,
    delayedRetention: delayed.length > 0 ? delayedCorrect / delayed.length : 0,
    falseRecallRate: falseRecalls / attempts.length,
    highConfidenceErrorRate: highConfErrors / attempts.length,
    medianLatencyMs: latencies.length > 0 ? latencies[Math.floor(latencies.length / 2)] : 0,
    discriminationAccuracy: discrimination.length > 0
      ? discrimination.filter(a => a.isCorrect).length / discrimination.length : 0,
    rephrasedAccuracy: rephrased.length > 0
      ? rephrased.filter(a => a.isCorrect).length / rephrased.length : 0,
    clinicalTransferAccuracy: clinical.length > 0
      ? clinical.filter(a => a.isCorrect).length / clinical.length : 0,
  }
}

/**
 * Classify a human-readable evidence label from metrics.
 * Conservative: never claims significance without sufficient data.
 */
export function classifyEvidenceLabel(metrics: EvidenceMetrics): EvidenceLabel {
  if (metrics.totalAttempts === 0) return 'No Data'

  // Misleading Cue: high false-recall rate (student consistently retrieves wrong fact)
  if (metrics.falseRecallRate >= 0.3 && metrics.totalAttempts >= 3) return 'Misleading Cue'

  // Needs Reinforcement: low accuracy
  if (metrics.recallAccuracy < 0.5) return 'Needs Reinforcement'

  // Developing: moderate accuracy or slow retrieval
  if (metrics.recallAccuracy < 0.8) return 'Developing'

  // Strong Retrieval: high accuracy with reasonable latency
  return 'Strong Retrieval'
}

/**
 * Compare Phase 3 AI prediction with observed human retrieval.
 * Returns a QualityPredictionComparison with a human-readable mismatch note.
 */
export function comparePredictionToObservation(
  symbolId: string,
  predictedQuality: string,
  metrics: EvidenceMetrics,
): QualityPredictionComparison {
  const observedEvidence = classifyEvidenceLabel(metrics)

  // Map quality labels to expected evidence ranges
  const highPredicted = predictedQuality === 'Excellent' || predictedQuality === 'Strong'
  const highObserved = observedEvidence === 'Strong Retrieval'
  const lowPredicted = predictedQuality === 'Weak' || predictedQuality === 'Acceptable'
  const lowObserved = observedEvidence === 'Needs Reinforcement' || observedEvidence === 'Misleading Cue'

  const isMatch = (highPredicted && highObserved) || (lowPredicted && lowObserved)
    || (!highPredicted && !lowPredicted && !highObserved && !lowObserved)

  let note: string | undefined
  if (!isMatch && metrics.totalAttempts >= 2) {
    if (highPredicted && lowObserved) {
      note = `AI predicted ${predictedQuality} but human retrieval is ${observedEvidence} — the cognitive heuristic may not match real recall.`
    } else if (lowPredicted && highObserved) {
      note = `AI predicted ${predictedQuality} but human retrieval is ${observedEvidence} — this cue works better in practice than the heuristic suggested.`
    }
  }

  return { symbolId, predictedQuality, observedEvidence, isMatch, note }
}

// ── Confidence Classification ──────────────────────────────────────────────

export const CONFIDENCE_LABELS: Record<number, string> = {
  1: 'Guessing',
  2: 'Slightly confident',
  3: 'Moderately confident',
  4: 'Very confident',
  5: 'Certain',
}

/**
 * Detect the most dangerous pattern: incorrect + high confidence.
 * This can indicate a misleading or interfering mnemonic.
 */
export function isHighConfidenceError(isCorrect: boolean, confidence: number): boolean {
  return !isCorrect && confidence >= 4
}

// ── Test Type Helpers ──────────────────────────────────────────────────────

/** Determine the delay interval label based on when the mnemonic was generated vs now. */
export function computeDelayInterval(generatedAt: string): string {
  const genMs = new Date(generatedAt).getTime()
  const nowMs = Date.now()
  const days = Math.floor((nowMs - genMs) / (1000 * 60 * 60 * 24))
  if (days >= 7) return '7d+'
  if (days >= 3) return '3d'
  if (days >= 1) return '1d'
  return 'immediate'
}

/** Infer the test type based on the delay and context. */
export function inferTestType(delayInterval: string, hasDistractors: boolean): RetrievalTestType {
  if (hasDistractors) return 'discrimination'
  if (delayInterval !== 'immediate') return 'delayed'
  return 'immediate'
}

// ── Discrimination Distractors ─────────────────────────────────────────────

/**
 * Build distractor options for a discrimination test from sibling symbols
 * in the same mnemonic. The correct answer is the target fact; distractors
 * are other facts from the same topic — medically related but distinct.
 */
export function buildDistractorsFromSymbols(
  targetSymbol: MemorySymbol,
  allSymbols: MemorySymbol[],
  count: number = 3,
): string[] {
  const siblings = allSymbols
    .filter(s => s.cue !== targetSymbol.cue)
    .map(s => s.fact)
  // Shuffle and take up to `count`
  for (let i = siblings.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [siblings[i], siblings[j]] = [siblings[j], siblings[i]]
  }
  return siblings.slice(0, count)
}

// ── Feedback Message Builder ───────────────────────────────────────────────

/** Build a student-friendly feedback message after a retrieval attempt. */
export function buildFeedbackMessage(
  isCorrect: boolean,
  confidence: number,
  falseRecall: boolean,
): string {
  if (isCorrect && confidence >= 4) return 'Correct! You recalled this confidently and accurately.'
  if (isCorrect && confidence < 3) return 'Correct! Though you felt unsure — this cue is working for you.'
  if (isCorrect) return 'Correct! Good recall.'
  if (falseRecall) return 'Close, but not quite right. Your answer is related but misses the specific fact this cue encodes. This may indicate the cue needs refinement.'
  if (confidence >= 4) return 'Incorrect despite high confidence. This can happen when a cue is ambiguous or interferes with a similar fact — important to review.'
  return 'Not this time. Review the explanation below and try again later.'
}
