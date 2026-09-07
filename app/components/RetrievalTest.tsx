'use client'

// ─────────────────────────────────────────────────────────────────────────────
// app/components/RetrievalTest.tsx
// Phase 4: Human Retrieval Validation — interactive retrieval test that
// measures whether a mnemonic cue actually helps a student retrieve the fact.
//
// Flow: Show cue → student types answer → judge → show confidence slider →
// reveal correct answer + feedback → persist attempt → show evidence label.
//
// Supports: immediate, cue_only, discrimination (multiple-choice), and
// evidence tracking across attempts.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useRef, useCallback, useEffect } from 'react'
import {
  Play, Check, X, Clock, AlertTriangle, Brain, ChevronRight,
  BarChart3, RotateCcw, RefreshCcw, Lightbulb,
} from 'lucide-react'
import { MemorySymbol, MnemonicOutput, RetrievalTestType, SubjectId, FactType, MAX_ADAPTIVE_REGENERATIONS, FailureDiagnosis, StoryBeat } from '../types'
import { cn } from '../lib/utils'
import {
  deriveMnemonicId,
  deriveSymbolId,
  nextAttemptNumber,
  judgeResponse,
  addValidation,
  getSymbolAttempts,
  computeEvidenceMetrics,
  classifyEvidenceLabel,
  comparePredictionToObservation,
  buildFeedbackMessage,
  buildDistractorsFromSymbols,
  computeDelayInterval,
  inferTestType,
  CONFIDENCE_LABELS,
  isHighConfidenceError,
} from '../lib/retrieval-validation'
import { saveRetrievalAttempt, persistLearnerProfile } from '../lib/persistence'
import { classifyFactType } from '../lib/fact-type'
import { shouldTriggerAlternative } from '../lib/adaptive-strategy'
import { analytics } from '../lib/analytics'
import { aggregateLearnerInsights } from '../lib/learner-profile'

interface RetrievalTestProps {
  topic: string
  result: MnemonicOutput
  generatedAt?: string
  /** FIX 15: subject from Workspace so attempts carry subject metadata */
  subject?: SubjectId
  /** FIX 7: callback when failure-driven regeneration is requested */
  onRegenerateAlternative?: (diagnosis: FailureDiagnosis) => void
}

type TestPhase = 'idle' | 'testing' | 'confidence' | 'revealed' | 'complete'

const EVIDENCE_COLORS: Record<string, string> = {
  'Strong Retrieval': 'text-neon-green bg-neon-green/[0.08] border border-neon-green/20',
  'Developing': 'text-neon-physio bg-neon-physio/[0.08] border border-neon-physio/20',
  'Needs Reinforcement': 'text-neon-danger bg-neon-danger/[0.08] border border-neon-danger/20',
  'Misleading Cue': 'text-neon-danger bg-neon-danger/[0.08] border border-neon-danger/20',
  'No Data': 'text-ink-tertiary bg-card/40 border border-border/40',
}

/**
 * Find the story beat that involves this symbol's cue, so retrieval prompts
 * reuse the story's own visual elements ("the golden river reaching the upper
 * tower") instead of introducing terminology unrelated to the visual the
 * learner just studied. Best content-word overlap wins; no match → undefined.
 */
function storyContextFor(cue: string, beats?: StoryBeat[]): StoryBeat | undefined {
  if (!beats?.length) return undefined
  const cueWords = new Set(cue.toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length > 3))
  let best: StoryBeat | undefined
  let bestOverlap = 0
  for (const beat of beats) {
    let overlap = 0
    for (const w of beat.object.toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length > 3)) {
      if (cueWords.has(w)) overlap++
    }
    if (overlap > bestOverlap) { bestOverlap = overlap; best = beat }
  }
  return bestOverlap > 0 ? best : undefined
}

export default function RetrievalTest({ topic, result, generatedAt, subject, onRegenerateAlternative }: RetrievalTestProps) {
  const symbols = result.symbols ?? []
  const [currentIdx, setCurrentIdx] = useState(0)
  const [phase, setPhase] = useState<TestPhase>('idle')
  const [response, setResponse] = useState('')
  const [confidence, setConfidence] = useState(3)
  const [startTime, setStartTime] = useState(0)
  const [responseTimeMs, setResponseTimeMs] = useState(0)
  const [isCorrect, setIsCorrect] = useState(false)
  const [falseRecall, setFalseRecall] = useState(false)
  const [feedbackMsg, setFeedbackMsg] = useState('')
  const [mode, setMode] = useState<'freetext' | 'discrimination'>('freetext')
  const [distractors, setDistractors] = useState<string[]>([])
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [allOptions, setAllOptions] = useState<string[]>([])
  const [evidenceLabels, setEvidenceLabels] = useState<Record<string, string>>({})
  const [failureDiagnosis, setFailureDiagnosis] = useState<FailureDiagnosis | null>(null)

  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Load existing evidence labels on mount
  useEffect(() => {
    const mnId = deriveMnemonicId(topic)
    const labels: Record<string, string> = {}
    for (const sym of symbols) {
      const symId = deriveSymbolId(topic, sym.cue)
      const attempts = getSymbolAttempts(mnId, symId)
      if (attempts.length > 0) {
        const metrics = computeEvidenceMetrics(symId, attempts)
        labels[sym.cue] = classifyEvidenceLabel(metrics)
      }
    }
    setEvidenceLabels(labels)
  }, [topic, symbols])

  const currentSymbol = symbols[currentIdx]
  if (!currentSymbol || symbols.length === 0) return null

  const startTest = useCallback((testMode: 'freetext' | 'discrimination') => {
    setMode(testMode)
    setPhase('testing')
    setResponse('')
    setSelectedOption(null)
    setConfidence(3)
    setStartTime(Date.now())
    analytics.log('retrieval_test_started', topic, undefined, {
      mode: testMode,
      symbolIndex: currentIdx,
      totalSymbols: symbols.length,
    })

    if (testMode === 'discrimination') {
      const distracts = buildDistractorsFromSymbols(currentSymbol, symbols, 3)
      const options = [currentSymbol.fact, ...distracts]
      // Shuffle options
      for (let i = options.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [options[i], options[j]] = [options[j], options[i]]
      }
      setDistractors(distracts)
      setAllOptions(options)
    }
  }, [currentSymbol, symbols])

  const submitResponse = useCallback(() => {
    const elapsed = Date.now() - startTime
    setResponseTimeMs(elapsed)

    let judgeResult: { isCorrect: boolean; falseRecall: boolean }

    if (mode === 'discrimination' && selectedOption) {
      judgeResult = { isCorrect: selectedOption === currentSymbol.fact, falseRecall: false }
      setResponse(selectedOption)
    } else {
      judgeResult = judgeResponse(response, currentSymbol.fact)
    }

    setIsCorrect(judgeResult.isCorrect)
    setFalseRecall(judgeResult.falseRecall)
    setPhase('confidence')
  }, [startTime, mode, selectedOption, response, currentSymbol])

  const submitConfidence = useCallback(() => {
    const mnId = deriveMnemonicId(topic)
    const symId = deriveSymbolId(topic, currentSymbol.cue)
    const delayInterval = generatedAt ? computeDelayInterval(generatedAt) : 'immediate'
    const testType = inferTestType(delayInterval, mode === 'discrimination')

    // FIX 3: classify fact type from topic + symbols + subject
    const factType: FactType = classifyFactType(topic, symbols, subject)

    const attempt = {
      mnemonicId: mnId,
      symbolId: symId,
      targetFact: currentSymbol.fact,
      targetAnswer: currentSymbol.fact,
      retrievalPrompt: currentSymbol.cue,
      cueShown: mode === 'discrimination' ? `${allOptions.length} options` : 'cue only',
      response: mode === 'discrimination' ? (selectedOption ?? '') : response,
      isCorrect,
      responseTimeMs,
      confidence,
      falseRecall,
      attemptNumber: nextAttemptNumber(mnId, symId),
      testedAt: new Date().toISOString(),
      delayInterval: delayInterval === 'immediate' ? undefined : delayInterval,
      testType,
      distractors: mode === 'discrimination' ? distractors : undefined,
    }

    // Phase 4: always save locally (preserves existing behavior)
    addValidation(attempt)

    // FIX 1: persist to Supabase via abstraction layer (fire-and-forget)
    saveRetrievalAttempt({
      ...attempt,
      subject: subject ?? undefined,
      architecture: result.architecture ?? undefined,
      memoryProblem: currentSymbol.memoryProblem ?? undefined,
      representationType: currentSymbol.type ?? undefined,
      factType,
    }).then(() => {
      // FIX 13: after attempt saved, recompute and persist learner profile
      const { profile, signal } = aggregateLearnerInsights()
      persistLearnerProfile(profile, signal).catch(() => {})
    }).catch(() => { /* graceful — localStorage already saved */ })

    // Phase 5: emit retrieval analytics events
    analytics.log(isCorrect ? 'retrieval_correct' : 'retrieval_incorrect', topic, subject, {
      testType,
      confidence,
      responseTimeMs,
    })
    analytics.log('retrieval_test_completed', topic, subject, {
      testType,
      isCorrect,
      symbolIndex: currentIdx,
    })
    if (isHighConfidenceError(isCorrect, confidence)) {
      analytics.log('high_confidence_error', topic, subject, { confidence, testType })
    }
    if (falseRecall) {
      analytics.log('false_recall_detected', topic, subject, { confidence, testType })
    }

    // Update evidence labels
    const attempts = getSymbolAttempts(mnId, symId)
    const metrics = computeEvidenceMetrics(symId, attempts)
    const label = classifyEvidenceLabel(metrics)
    setEvidenceLabels(prev => ({ ...prev, [currentSymbol.cue]: label }))

    // FIX 7: check for failure-driven regeneration
    const diagnosis = shouldTriggerAlternative(attempts, result.architecture)
    if (diagnosis) {
      // Check loop safety: count how many alternative versions exist
      // The parent mnemonic's ID is stable; regenerated ones get a suffix
      const allMnemonicAttempts = getSymbolAttempts(mnId, symId)
      const alternativeCount = allMnemonicAttempts.filter(
        a => a.testType === 'immediate' && !a.isCorrect
      ).length
      if (alternativeCount <= MAX_ADAPTIVE_REGENERATIONS) {
        setFailureDiagnosis(diagnosis)
      }
    } else {
      setFailureDiagnosis(null)
    }

    setFeedbackMsg(buildFeedbackMessage(isCorrect, confidence, falseRecall))
    setPhase('revealed')
  }, [topic, currentSymbol, mode, allOptions, selectedOption, response, isCorrect, responseTimeMs, confidence, falseRecall, distractors, generatedAt, subject, result.architecture, symbols])

  const goToNext = useCallback(() => {
    if (currentIdx < symbols.length - 1) {
      setCurrentIdx(i => i + 1)
      setPhase('idle')
    } else {
      setPhase('complete')
    }
  }, [currentIdx, symbols.length])

  const resetAll = useCallback(() => {
    setCurrentIdx(0)
    setPhase('idle')
  }, [])

  return (
    <div className="space-y-4">
      {/* Progress indicator */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1.5">
          {symbols.map((_, i) => (
            <div
              key={i}
              className={cn(
                'h-1.5 rounded-full transition-all duration-200',
                i < currentIdx ? 'w-6 bg-neon-green' :
                i === currentIdx ? 'w-6 bg-neon-green/50' :
                'w-3 bg-card/40'
              )}
            />
          ))}
        </div>
        <span className="text-[10px] text-ink-tertiary font-mono">
          {currentIdx + 1}/{symbols.length}
        </span>
      </div>

      {/* Evidence label badge for current symbol (from previous attempts) */}
      {evidenceLabels[currentSymbol.cue] && (
        <div className="flex items-center gap-2">
          <span className={cn(
            'text-[9px] px-2 py-0.5 rounded-full font-bold',
            EVIDENCE_COLORS[evidenceLabels[currentSymbol.cue]] ?? EVIDENCE_COLORS['No Data']
          )}>
            {evidenceLabels[currentSymbol.cue]}
          </span>
          <span className="text-[9px] text-ink-muted font-mono">from previous attempts</span>
        </div>
      )}

      {/* IDLE — mode selection */}
      {phase === 'idle' && (
        <div className="space-y-3">
          <div className="p-4 rounded-xl bg-card/20 border border-card/30">
            <p className="text-[10px] text-ink-tertiary uppercase tracking-wider font-mono mb-2">Memory Cue</p>
            <p className="text-sm font-semibold text-white leading-relaxed">{currentSymbol.cue}</p>
            {currentSymbol.location && (
              <p className="text-[10px] text-ink-tertiary mt-1.5 font-mono">Location: {currentSymbol.location}</p>
            )}
            {(() => {
              const beat = storyContextFor(currentSymbol.cue, result.storyBeats)
              return beat ? (
                <p className="text-[10px] text-ink-secondary mt-2 italic leading-relaxed">
                  From your story: “{beat.character ? `${beat.character} ` : ''}{beat.action} {beat.object}”
                </p>
              ) : null
            })()}
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => startTest('freetext')}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold bg-neon-green/[0.08] border border-neon-green/25 text-neon-green hover:bg-neon-green/[0.14] transition-all duration-200 active:scale-95"
            >
              <Play className="w-3.5 h-3.5" />
              Type Your Recall
            </button>
            <button
              onClick={() => startTest('discrimination')}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold bg-card/30 border border-border/40 text-ink-secondary hover:bg-card/50 hover:border-border/60 transition-all duration-200 active:scale-95"
            >
              <Brain className="w-3.5 h-3.5" />
              Multiple Choice
            </button>
          </div>
        </div>
      )}

      {/* TESTING — answer input or option selection */}
      {phase === 'testing' && (
        <div className="space-y-3">
          <div className="p-4 rounded-xl bg-card/20 border border-card/30">
            <p className="text-[10px] text-ink-tertiary uppercase tracking-wider font-mono mb-2">Memory Cue</p>
            <p className="text-sm font-semibold text-white leading-relaxed">{currentSymbol.cue}</p>
            {currentSymbol.location && (
              <p className="text-[10px] text-ink-tertiary mt-1.5 font-mono">Location: {currentSymbol.location}</p>
            )}
            {(() => {
              const beat = storyContextFor(currentSymbol.cue, result.storyBeats)
              return beat ? (
                <p className="text-[10px] text-ink-secondary mt-2 italic leading-relaxed">
                  From your story: “{beat.character ? `${beat.character} ` : ''}{beat.action} {beat.object}”
                </p>
              ) : null
            })()}
          </div>

          {mode === 'freetext' ? (
            <div>
              <p className="text-[10px] text-ink-tertiary font-mono mb-1.5">
                {storyContextFor(currentSymbol.cue, result.storyBeats)
                  ? 'What does this represent in your story?'
                  : 'What medical fact does this cue encode?'}
              </p>
              <textarea
                ref={inputRef}
                value={response}
                onChange={e => setResponse(e.target.value)}
                placeholder="Type what you remember..."
                rows={3}
                className="w-full px-3 py-2.5 rounded-xl bg-card/30 border border-card/40 text-sm text-white placeholder:text-ink-muted focus:outline-none focus:ring-1 focus:ring-neon-green/50 resize-none"
                autoFocus
              />
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-[10px] text-ink-tertiary font-mono mb-1.5">Which fact does this cue represent?</p>
              {allOptions.map((opt, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedOption(opt)}
                  className={cn(
                    'w-full text-left px-3 py-2.5 rounded-xl text-xs transition-all',
                    selectedOption === opt
                      ? 'bg-neon-green/[0.08] border border-neon-green/30 text-white'
                      : 'bg-card/20 border border-border/30 text-ink-primary hover:bg-card/40 hover:border-border/50'
                  )}
                >
                  <span className="font-mono text-ink-tertiary mr-2">{String.fromCharCode(65 + i)}.</span>
                  {opt}
                </button>
              ))}
            </div>
          )}

          <button
            onClick={submitResponse}
            disabled={mode === 'freetext' ? response.trim().length < 3 : !selectedOption}
            className={cn(
              'flex items-center justify-center gap-2 w-full py-3 rounded-xl text-xs font-bold transition-all active:scale-95',
              (mode === 'freetext' ? response.trim().length >= 3 : !!selectedOption)
                ? 'bg-neon-green/15 text-neon-green hover:bg-neon-green/25'
                : 'bg-card/20 text-ink-muted cursor-not-allowed'
            )}
          >
            <Check className="w-3.5 h-3.5" />
            Submit Answer
          </button>
        </div>
      )}

      {/* CONFIDENCE — rate confidence after answering */}
      {phase === 'confidence' && (
        <div className="space-y-3">
          <div className={cn(
            'p-3 rounded-xl border-l-2',
            isCorrect ? 'bg-neon-green/5 border-neon-green' : 'bg-neon-danger/5 border-neon-danger'
          )}>
            <div className="flex items-center gap-2 mb-1">
              {isCorrect ? <Check className="w-4 h-4 text-neon-green" /> : <X className="w-4 h-4 text-neon-danger" />}
              <span className={cn('text-xs font-bold', isCorrect ? 'text-neon-green' : 'text-neon-danger')}>
                {isCorrect ? 'Correct' : 'Incorrect'}
              </span>
              {responseTimeMs > 0 && (
                <span className="text-[9px] text-ink-tertiary font-mono flex items-center gap-1 ml-auto">
                  <Clock className="w-3 h-3" />
                  {(responseTimeMs / 1000).toFixed(1)}s
                </span>
              )}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-card/20">
            <p className="text-[10px] text-ink-tertiary font-mono mb-2">How confident were you?</p>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map(n => (
                <button
                  key={n}
                  onClick={() => setConfidence(n)}
                  className={cn(
                    'flex-1 py-2 rounded-lg text-[10px] font-bold transition-all',
                    confidence === n
                      ? 'bg-neon-green/15 text-neon-green ring-1 ring-neon-green/30'
                      : 'bg-card/30 text-ink-tertiary hover:bg-card/50'
                  )}
                >
                  {n}
                </button>
              ))}
            </div>
            <p className="text-[9px] text-ink-muted mt-1.5 text-center">{CONFIDENCE_LABELS[confidence]}</p>

            {isHighConfidenceError(isCorrect, confidence) && (
              <div className="mt-2 p-2 rounded-lg bg-neon-danger/10 border border-neon-danger/20">
                <p className="text-[9px] text-neon-danger flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  High confidence but incorrect — this cue may be misleading.
                </p>
              </div>
            )}

            <button
              onClick={submitConfidence}
              className="w-full mt-3 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold bg-neon-green/15 text-neon-green hover:bg-neon-green/25 transition-all active:scale-95"
            >
              <ChevronRight className="w-3.5 h-3.5" />
              See Explanation
            </button>
          </div>
        </div>
      )}

      {/* REVEALED — correct answer + feedback + explanation */}
      {phase === 'revealed' && (
        <div className="space-y-3">
          {/* Correct answer */}
          <div className="p-3 rounded-xl bg-neon-green/5 border-l-2 border-neon-green">
            <p className="text-[10px] text-neon-green font-mono mb-1">Correct Answer</p>
            <p className="text-xs text-white leading-relaxed">{currentSymbol.fact}</p>
          </div>

          {/* Feedback message */}
          <div className={cn(
            'p-3 rounded-xl border-l-2',
            isCorrect ? 'bg-card/20 border-neon-green/30' : 'bg-card/20 border-neon-danger/30'
          )}>
            <p className="text-[10px] text-ink-secondary leading-relaxed">{feedbackMsg}</p>
          </div>

          {/* Why the cue works */}
          <div className="p-3 rounded-xl bg-card/15">
            <p className="text-[10px] text-ink-tertiary font-mono mb-1">Why this cue</p>
            <p className="text-[10px] text-ink-secondary leading-relaxed">
              <span className="text-neon-green font-semibold">{currentSymbol.cue}</span>
              {currentSymbol.type && <span className="text-ink-tertiary"> ({currentSymbol.type} encoding)</span>}
              {(() => {
                const beat = storyContextFor(currentSymbol.cue, result.storyBeats)
                return beat ? (
                  <span className="block mt-1 text-ink-secondary">
                    Story moment: “{beat.character ? `${beat.character} ` : ''}{beat.action} {beat.object}”
                    {beat.medicalMeaning ? ` — ${beat.medicalMeaning}` : ''}
                  </span>
                ) : null
              })()}
              {currentSymbol.retrievalTrigger && (
                <span className="block mt-1 text-ink-tertiary italic">
                  Recall trigger: <span className="text-neon-green/70 not-italic font-mono">{currentSymbol.retrievalTrigger}</span>
                </span>
              )}
            </p>
          </div>

          {/* Evidence label update */}
          {evidenceLabels[currentSymbol.cue] && (
            <div className="flex items-center gap-2">
              <BarChart3 className="w-3 h-3 text-ink-tertiary" />
              <span className={cn(
                'text-[9px] px-2 py-0.5 rounded-full font-bold',
                EVIDENCE_COLORS[evidenceLabels[currentSymbol.cue]] ?? EVIDENCE_COLORS['No Data']
              )}>
                {evidenceLabels[currentSymbol.cue]}
              </span>
            </div>
          )}

          {/* FIX 7: Failure-driven regeneration offer */}
          {failureDiagnosis && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <div className="flex items-start gap-2 mb-2">
                <Lightbulb className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[10px] font-bold text-amber-400">This cue may not be working well for you.</p>
                  <p className="text-[9px] text-ink-tertiary mt-0.5">{failureDiagnosis.note}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  analytics.log('alternative_mnemonic_generated', topic, subject, {
                    reason: failureDiagnosis.reason,
                    currentStrategy: failureDiagnosis.currentStrategy,
                    suggestedAlternatives: failureDiagnosis.suggestedAlternatives.join(','),
                  })
                  onRegenerateAlternative?.(failureDiagnosis)
                  setFailureDiagnosis(null)
                }}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-[10px] font-bold bg-amber-500/15 text-amber-400 hover:bg-amber-500/25 transition-all active:scale-95"
              >
                <RefreshCcw className="w-3 h-3" />
                Try a different memory approach
              </button>
            </div>
          )}

          <button
            onClick={goToNext}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold bg-neon-green/15 text-neon-green hover:bg-neon-green/25 transition-all active:scale-95"
          >
            {currentIdx < symbols.length - 1 ? (
              <>
                <ChevronRight className="w-3.5 h-3.5" />
                Next Symbol
              </>
            ) : (
              <>
                <Check className="w-3.5 h-3.5" />
                Finish Test
              </>
            )}
          </button>
        </div>
      )}

      {/* COMPLETE — summary */}
      {phase === 'complete' && (
        <div className="space-y-3">
          <div className="p-4 rounded-xl bg-card/20 border border-card/30 text-center">
            <Brain className="w-6 h-6 text-neon-green mx-auto mb-2" />
            <p className="text-sm font-bold text-white">Retrieval Test Complete</p>
            <p className="text-[10px] text-ink-tertiary mt-1">
              Tested {symbols.length} symbol{symbols.length !== 1 ? 's' : ''} for {topic}
            </p>
          </div>

          {/* Evidence summary per symbol */}
          <div className="space-y-1.5">
            {symbols.map((sym, i) => {
              const label = evidenceLabels[sym.cue] ?? 'No Data'
              return (
                <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-card/15">
                  <span className={cn(
                    'text-[8px] px-1.5 py-0.5 rounded-full font-bold shrink-0',
                    EVIDENCE_COLORS[label] ?? EVIDENCE_COLORS['No Data']
                  )}>
                    {label}
                  </span>
                  <span className="text-[10px] text-ink-primary truncate">{sym.cue}</span>
                  <span className="text-[10px] text-ink-muted truncate ml-auto">→ {sym.fact.substring(0, 40)}...</span>
                </div>
              )
            })}
          </div>

          <button
            onClick={resetAll}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold bg-card/30 text-ink-secondary hover:bg-card/50 transition-all active:scale-95"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Test Again
          </button>
        </div>
      )}
    </div>
  )
}
