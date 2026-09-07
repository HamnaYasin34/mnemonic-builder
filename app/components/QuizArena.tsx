'use client'

// ─────────────────────────────────────────────────────────────────────────────
// app/components/QuizArena.tsx  —  Phase 2: Medical Quiz Library + MCQ Arena
// Browse curated + cached quiz sets, proper medical MCQs with explanations,
// per-question bookmarks, and on-demand quiz generation.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Target, Search, Star, Sparkles, ArrowLeft, ArrowRight,
  Check, X, Trophy, RefreshCcw, Loader2, Zap,
  CheckCircle2, Heart,
} from 'lucide-react'
import { Discipline, SubjectId, QuizSet, MedicalMCQ } from '../types'
import { getSubjectsByDiscipline } from '../lib/subjects'
import { cn } from '../lib/utils'
import { ALL_QUIZZES, searchAllQuizzes } from '../lib/curated-data'
import { getAllCachedQuizzes, getCachedQuiz, setCachedQuiz } from '../lib/cache'
import { bookmarks } from '../lib/bookmarks'
import { analytics } from '../lib/analytics'

interface QuizArenaProps {
  discipline: Discipline
  onGenerateFromMnemonic: (topic: string) => void
  pendingQuiz?: { topic: string; subject: SubjectId } | null
  onPendingQuizConsumed?: () => void
  onNavigateBack?: () => void
  currentTopic?: string | null
}

// ── Fisher-Yates shuffle producing index mapping ──
function shuffleIndices(length: number): number[] {
  const indices = Array.from({ length }, (_, i) => i)
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[indices[i], indices[j]] = [indices[j], indices[i]]
  }
  return indices
}

interface PreparedQuestion {
  mcq: MedicalMCQ
  shuffledOptions: string[]
  shuffledCorrectIdx: number
  // Maps shuffled position → wrong explanation text (only for wrong options)
  shuffledWrongExpl: Map<number, string>
}

function prepareQuestion(mcq: MedicalMCQ): PreparedQuestion {
  const originalOptions = mcq.options
  const originalCorrect = mcq.correctIndex
  const shuffledIndices = shuffleIndices(4)

  const shuffledOptions = shuffledIndices.map(i => originalOptions[i])
  const shuffledCorrectIdx = shuffledIndices.indexOf(originalCorrect)

  // Build wrong-explanations map: for each shuffled position that is NOT correct,
  // find its original index and look up the corresponding wrong explanation.
  // wrongExplanations[0] = first wrong option in original order, etc.
  let wrongCounter = 0
  const originalWrongExplMap = new Map<number, string>()
  for (let i = 0; i < 4; i++) {
    if (i !== originalCorrect) {
      if (mcq.wrongExplanations[wrongCounter]) {
        originalWrongExplMap.set(i, mcq.wrongExplanations[wrongCounter])
      }
      wrongCounter++
    }
  }

  const shuffledWrongExpl = new Map<number, string>()
  for (let si = 0; si < 4; si++) {
    const origIdx = shuffledIndices[si]
    if (origIdx !== originalCorrect) {
      const expl = originalWrongExplMap.get(origIdx)
      if (expl) shuffledWrongExpl.set(si, expl)
    }
  }

  return { mcq, shuffledOptions, shuffledCorrectIdx, shuffledWrongExpl }
}

export default function QuizArena({ discipline, onGenerateFromMnemonic, pendingQuiz, onPendingQuizConsumed, onNavigateBack, currentTopic }: QuizArenaProps) {
  // Library state
  const [search, setSearch] = useState('')
  const [subjectFilter, setSubjectFilter] = useState<SubjectId | 'all'>('all')
  const [bookmarkedOnly, setBookmarkedOnly] = useState(false)
  const [allQuizzes, setAllQuizzes] = useState<QuizSet[]>([])

  // Session state
  const [activeQuiz, setActiveQuiz] = useState<QuizSet | null>(null)
  const [preparedQuestions, setPreparedQuestions] = useState<PreparedQuestion[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedOption, setSelectedOption] = useState<number | null>(null)
  const [answered, setAnswered] = useState(false)
  const [score, setScore] = useState(0)
  const [isFinished, setIsFinished] = useState(false)

  // Generate state
  const [showGenerate, setShowGenerate] = useState(false)
  const [generateTopic, setGenerateTopic] = useState('')
  const [generating, setGenerating] = useState(false)
  const [generateError, setGenerateError] = useState('')
  const [quizCount, setQuizCount] = useState(5)
  const [showCustomCount, setShowCustomCount] = useState(false)
  const COUNT_PRESETS = [5, 10, 15, 20] as const

  // Bookmark review state
  const [showBookmarkReview, setShowBookmarkReview] = useState(false)
  const [bookmarkMcqs, setBookmarkMcqs] = useState<PreparedQuestion[]>([])

  // Load quizzes: curated + cached
  useEffect(() => {
    const curated = ALL_QUIZZES
    const cached = getAllCachedQuizzes()
    const curatedIds = new Set(curated.map(q => q.id))
    const merged = [...curated, ...cached.filter(q => !curatedIds.has(q.id))]
    setAllQuizzes(merged)
  }, [])

  // Filter quizzes for library
  const filteredQuizzes = useMemo(() => {
    let quizzes = allQuizzes
    if (search.trim()) {
      quizzes = searchAllQuizzes(search)
      const cached = getAllCachedQuizzes()
      const q = search.trim().toLowerCase()
      const cachedResults = cached.filter(qz =>
        qz.topic.toLowerCase().includes(q) || qz.subject.toLowerCase().includes(q)
      )
      const ids = new Set(quizzes.map(qz => qz.id))
      quizzes = [...quizzes, ...cachedResults.filter(qz => !ids.has(qz.id))]
    }
    if (discipline) {
      quizzes = quizzes.filter(qz => qz.discipline === discipline)
    }
    if (subjectFilter !== 'all') {
      quizzes = quizzes.filter(qz => qz.subject === subjectFilter)
    }
    if (bookmarkedOnly) {
      quizzes = quizzes.filter(qz => bookmarks.isBookmarked('quiz', qz.id))
    }
    return quizzes
  }, [allQuizzes, search, discipline, subjectFilter, bookmarkedOnly])

  const subjects = getSubjectsByDiscipline(discipline)

  // Start a quiz session
  const startSession = useCallback((quiz: QuizSet) => {
    const prepared = quiz.questions.map(q => prepareQuestion(q))
    setActiveQuiz(quiz)
    setPreparedQuestions(prepared)
    setCurrentIndex(0)
    setSelectedOption(null)
    setAnswered(false)
    setScore(0)
    setIsFinished(false)
    setShowBookmarkReview(false)
    analytics.log('quiz_started', quiz.topic, quiz.subject)
  }, [])

  // Start bookmark review
  const startBookmarkReview = useCallback(() => {
    const mcqBookmarks = bookmarks.query({ type: 'mcq' })
    const allMcqs: MedicalMCQ[] = []
    const seenIds = new Set<string>()

    // Collect from all quizzes
    for (const quiz of allQuizzes) {
      for (const q of quiz.questions) {
        if (mcqBookmarks.some(bm => bm.itemId === q.id) && !seenIds.has(q.id)) {
          allMcqs.push(q)
          seenIds.add(q.id)
        }
      }
    }
    // Also check cached quizzes
    for (const quiz of getAllCachedQuizzes()) {
      for (const q of quiz.questions) {
        if (mcqBookmarks.some(bm => bm.itemId === q.id) && !seenIds.has(q.id)) {
          allMcqs.push(q)
          seenIds.add(q.id)
        }
      }
    }

    if (allMcqs.length === 0) return
    const prepared = allMcqs.map(q => prepareQuestion(q))
    setBookmarkMcqs(prepared)
    setPreparedQuestions(prepared)
    setActiveQuiz(null)
    setCurrentIndex(0)
    setSelectedOption(null)
    setAnswered(false)
    setScore(0)
    setIsFinished(false)
    setShowBookmarkReview(true)
  }, [allQuizzes])

  const backToLibrary = useCallback(() => {
    setActiveQuiz(null)
    setShowBookmarkReview(false)
    setIsFinished(false)
    onNavigateBack?.()
  }, [onNavigateBack])

  const handleOptionSelect = (idx: number) => {
    if (answered) return
    setSelectedOption(idx)
  }

  const handleCheckAnswer = () => {
    if (selectedOption === null || answered) return
    setAnswered(true)
    const pq = preparedQuestions[currentIndex]
    if (selectedOption === pq.shuffledCorrectIdx) {
      setScore(s => s + 1)
    }
    analytics.log('mcq_answered', activeQuiz?.topic, activeQuiz?.subject, {
      correct: selectedOption === pq.shuffledCorrectIdx,
      questionIndex: currentIndex,
    })
  }

  const handleNext = () => {
    if (currentIndex < preparedQuestions.length - 1) {
      setCurrentIndex(c => c + 1)
      setSelectedOption(null)
      setAnswered(false)
    } else {
      setIsFinished(true)
      analytics.log('quiz_completed', activeQuiz?.topic, activeQuiz?.subject, {
        score: score + (selectedOption === preparedQuestions[currentIndex]?.shuffledCorrectIdx ? 1 : 0),
        total: preparedQuestions.length,
      })
    }
  }

  const handleRetry = () => {
    // Re-shuffle for a fresh experience
    if (activeQuiz) {
      startSession(activeQuiz)
    } else if (showBookmarkReview) {
      startBookmarkReview()
    }
  }

  const handleToggleQuizBookmark = useCallback((quiz: QuizSet) => {
    bookmarks.toggle('quiz', quiz.id, quiz.topic, quiz.subject)
    setAllQuizzes(prev => [...prev])
  }, [])

  const handleToggleMcqBookmark = useCallback((mcq: MedicalMCQ) => {
    bookmarks.toggle('mcq', mcq.id, mcq.topic, mcq.subject)
    // Force re-render for star state
    setAllQuizzes(prev => [...prev])
  }, [])

  const handleGenerateQuiz = useCallback(async () => {
    if (!generateTopic.trim() || generating) return
    const topic = generateTopic.trim()
    const count = quizCount

    // Check curated first (only for default counts)
    const curated = allQuizzes.find(q => q.topic.toLowerCase() === topic.toLowerCase())
    if (curated) {
      startSession(curated)
      setShowGenerate(false)
      setGenerateTopic('')
      return
    }

    // Check cache
    const cached = getCachedQuiz(topic)
    if (cached) {
      startSession(cached)
      setShowGenerate(false)
      setGenerateTopic('')
      return
    }

    // Generate via API — batch for counts > 15
    setGenerating(true)
    setGenerateError('')
    try {
      const batchSize = 15
      const batches = Math.ceil(count / batchSize)
      const allQuestions: any[] = []

      for (let b = 0; b < batches; b++) {
        const batchCount = b < batches - 1 ? batchSize : count - b * batchSize
        const res = await fetch('/api/quiz', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            topic,
            subject: subjectFilter !== 'all' ? subjectFilter : 'medicine',
            count: batchCount,
          }),
        })
        const data = await res.json()
        if (!data.success) {
          setGenerateError('We could not generate this quiz right now. Please try again.')
          if (allQuestions.length === 0) return
          break
        }
        allQuestions.push(...(data.data.questions || []))
      }

      if (allQuestions.length === 0) {
        setGenerateError('No questions could be generated. Try a different topic.')
        return
      }

      const subjId = (subjectFilter !== 'all' ? subjectFilter : 'medicine') as SubjectId
      const quizSet: QuizSet = {
        id: `gen_quiz_${Date.now()}`,
        topic,
        subject: subjId,
        discipline,
        questions: allQuestions.map((q: any, i: number) => {
          // Stable ID from topic + stem so bookmarks persist across regenerations
          const stemText = q.stem || ''
          let hash = 0
          for (let j = 0; j < stemText.length; j++) { hash = ((hash << 5) - hash + stemText.charCodeAt(j)) | 0 }
          const stableId = `mcq_${topic.toLowerCase().replace(/\s+/g, '_')}_${(hash >>> 0).toString(36)}`
          return {
          id: stableId,
          topic,
          subject: subjId,
          stem: q.stem || '',
          options: q.options || [],
          correctIndex: q.correctIndex ?? 0,
          explanation: q.explanation || '',
          wrongExplanations: q.wrongExplanations || [],
          highYieldTakeaway: q.highYieldTakeaway || '',
          difficulty: q.difficulty || 'Medium',
          category: q.category || 'general',
        }}),
        isCurated: false,
        createdAt: new Date().toISOString(),
      }
      setCachedQuiz(topic, quizSet)
      setAllQuizzes(prev => [quizSet, ...prev])
      startSession(quizSet)
      setShowGenerate(false)
      setGenerateTopic('')
    } catch {
      setGenerateError('Could not connect. Please check your connection and try again.')
    } finally {
      setGenerating(false)
    }
  }, [generateTopic, generating, quizCount, allQuizzes, subjectFilter, discipline, startSession])

  // Count bookmarked MCQs
  const bookmarkedMcqCount = useMemo(() => bookmarks.query({ type: 'mcq' }).length, [allQuizzes])

  // Consume pendingQuiz on mount — auto-generate a quiz when navigated from another view
  useEffect(() => {
    if (pendingQuiz && allQuizzes.length > 0) {
      const { topic, subject } = pendingQuiz
      // Check cached first
      const cached = getCachedQuiz(topic)
      if (cached) {
        startSession(cached)
      } else {
        // Set up for generation
        setGenerateTopic(topic)
        setSubjectFilter(subject)
        setShowGenerate(true)
      }
      onPendingQuizConsumed?.()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingQuiz, allQuizzes.length])

  // ── QUIZ SESSION VIEW ──
  if (preparedQuestions.length > 0 && !isFinished) {
    const pq = preparedQuestions[currentIndex]
    const { mcq, shuffledOptions, shuffledCorrectIdx, shuffledWrongExpl } = pq
    const isMcqBookmarked = bookmarks.isBookmarked('mcq', mcq.id)
    const progress = ((currentIndex + 1) / preparedQuestions.length) * 100

    return (
      <div className="view-container">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-5 animate-fade-up">
          {/* Session Header */}
          <div className="flex items-center gap-3 pb-3">
            <button onClick={backToLibrary} className="p-2.5 rounded-lg hover:bg-elevated/60 text-ink-tertiary hover:text-ink-secondary transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-ink-tertiary font-bold">
                  {currentIndex + 1}/{preparedQuestions.length}
                </span>
                <div className="flex-1 h-2 bg-subtle/40 rounded-full overflow-hidden max-w-[240px]">
                  <div className="h-full bg-neon-green rounded-full transition-all duration-300 ease-out progress-bar-animated" style={{ width: `${progress}%` }} />
                </div>
              </div>
              {activeQuiz && (
                <h2 className="text-xs text-ink-tertiary truncate mt-0.5">{activeQuiz.topic}</h2>
              )}
              {!activeQuiz && currentTopic && (
                <h2 className="text-xs text-ink-tertiary truncate mt-0.5">{currentTopic}</h2>
              )}
              {showBookmarkReview && (
                <h2 className="text-xs text-ink-tertiary mt-0.5">Bookmarked Questions</h2>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-neon-green font-bold">{score} correct</span>
              <button
                onClick={() => handleToggleMcqBookmark(mcq)}
                className={cn('p-2.5 rounded-lg transition-all min-w-[44px] min-h-[44px] flex items-center justify-center', isMcqBookmarked ? 'text-neon-physio bg-neon-physio/[0.08]' : 'text-ink-tertiary hover:text-ink-secondary hover:bg-elevated/60')}
              >
                <Heart className={cn('w-4 h-4', isMcqBookmarked && 'fill-neon-physio')} />
              </button>
            </div>
          </div>

          {/* Question Badge */}
          <div className="flex items-center gap-2">
            <span className={cn(
              'text-[9px] px-2.5 py-0.5 rounded-full font-mono uppercase font-bold',
              mcq.difficulty === 'Easy' && 'text-neon-green bg-neon-green/[0.08] border border-neon-green/20',
              mcq.difficulty === 'Medium' && 'text-neon-physio bg-neon-physio/[0.08] border border-neon-physio/20',
              mcq.difficulty === 'Hard' && 'text-neon-danger bg-neon-danger/[0.08] border border-neon-danger/20',
            )}>
              {mcq.difficulty}
            </span>
            <span className="text-[9px] px-2 py-0.5 rounded-full font-mono bg-card/40 text-ink-tertiary uppercase font-bold">
              {mcq.category}
            </span>
          </div>

          {/* Question Stem */}
          <h2 className="text-sm sm:text-base font-bold text-ink-primary leading-relaxed">
            {mcq.stem}
          </h2>

          {/* Options */}
          <div className="grid grid-cols-1 gap-2.5">
            {shuffledOptions.map((option, idx) => {
              const isSelected = selectedOption === idx
              const isCorrect = idx === shuffledCorrectIdx
              const showSuccess = answered && isCorrect
              const showFailure = answered && isSelected && !isCorrect

              return (
                <button
                  key={idx}
                  type="button"
                  disabled={answered}
                  onClick={() => handleOptionSelect(idx)}
                  className={cn(
                    'w-full flex items-center justify-between p-3.5 rounded-xl text-left border transition-all duration-200',
                    'active:scale-[0.99]',
                    !answered && 'hover:bg-elevated/50 hover:translate-x-0.5',
                    isSelected
                      ? 'bg-neon-micro/[0.08] border-neon-micro/30'
                      : 'bg-card/20 border-transparent',
                    showSuccess && 'bg-neon-green/[0.08] border-neon-green/30',
                    showFailure && 'bg-neon-danger/[0.08] border-neon-danger/30',
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={cn(
                      'w-6 h-6 rounded-full text-[10px] font-mono font-bold flex items-center justify-center shrink-0 transition-colors',
                      isSelected ? 'text-neon-micro bg-elevated' : 'text-ink-tertiary',
                      showSuccess && 'text-neon-green bg-elevated',
                      showFailure && 'text-neon-danger bg-elevated',
                    )}>
                      {String.fromCharCode(65 + idx)}
                    </span>
                    <span className="text-xs sm:text-sm font-semibold text-ink-primary leading-relaxed">{option}</span>
                  </div>
                  {answered && isCorrect && <Check className="w-4 h-4 text-neon-green shrink-0 ml-2" />}
                  {answered && isSelected && !isCorrect && <X className="w-4 h-4 text-neon-danger shrink-0 ml-2" />}
                </button>
              )
            })}
          </div>

          {/* Answer / Next */}
          <div className="space-y-4 pt-1">
            {!answered ? (
              <button
                onClick={handleCheckAnswer}
                disabled={selectedOption === null}
                className="glow-btn btn-ripple w-full flex items-center justify-center gap-1.5 py-3 rounded-lg text-xs font-bold bg-neon-green text-void disabled:opacity-40 disabled:pointer-events-none"
              >
                Check Answer <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <div className="space-y-3 animate-fade-in">
                {/* Correct answer explanation */}
                {selectedOption === shuffledCorrectIdx ? (
                  <div className="p-4 rounded-xl bg-neon-green/8">
                    <div className="flex gap-3">
                      <CheckCircle2 className="w-4 h-4 text-neon-green shrink-0 mt-0.5" />
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider font-mono text-neon-green mb-1">Correct!</p>
                        <p className="text-xs text-ink-secondary leading-relaxed">{mcq.explanation}</p>
                        {mcq.highYieldTakeaway && (
                          <p className="text-xs text-neon-green mt-2 font-semibold flex items-start gap-1.5">
                            <Star className="w-3 h-3 fill-neon-green shrink-0 mt-0.5" />
                            {mcq.highYieldTakeaway}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {/* Why your choice is wrong */}
                    {selectedOption !== null && shuffledWrongExpl.has(selectedOption) && (
                      <div className="p-4 rounded-xl bg-neon-danger/8">
                        <div className="flex gap-3">
                          <X className="w-4 h-4 text-neon-danger shrink-0 mt-0.5" />
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-wider font-mono text-neon-danger mb-1">
                              Why {String.fromCharCode(65 + selectedOption)} is wrong
                            </p>
                            <p className="text-xs text-ink-secondary leading-relaxed">{shuffledWrongExpl.get(selectedOption)}</p>
                          </div>
                        </div>
                      </div>
                    )}
                    {/* Why correct answer is right */}
                    <div className="p-4 rounded-xl bg-neon-green/8">
                      <div className="flex gap-3">
                        <CheckCircle2 className="w-4 h-4 text-neon-green shrink-0 mt-0.5" />
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider font-mono text-neon-green mb-1">
                            Why {String.fromCharCode(65 + shuffledCorrectIdx)} is correct
                          </p>
                          <p className="text-xs text-ink-secondary leading-relaxed">{mcq.explanation}</p>
                          {mcq.highYieldTakeaway && (
                            <p className="text-xs text-neon-green mt-2 font-semibold flex items-start gap-1.5">
                              <Star className="w-3 h-3 fill-neon-green shrink-0 mt-0.5" />
                              {mcq.highYieldTakeaway}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                    {/* Other wrong-option explanations */}
                    {shuffledOptions.map((_, idx) => {
                      if (idx === shuffledCorrectIdx || idx === selectedOption) return null
                      const expl = shuffledWrongExpl.get(idx)
                      if (!expl) return null
                      return (
                        <div key={idx} className="p-3 rounded-lg bg-card/40">
                          <p className="text-[10px] text-ink-tertiary leading-relaxed">
                            <span className="font-bold font-mono">{String.fromCharCode(65 + idx)}:</span> {expl}
                          </p>
                        </div>
                      )
                    })}
                  </div>
                )}

                <button
                  onClick={handleNext}
                  className="glow-btn btn-ripple w-full flex items-center justify-center gap-1.5 py-3 rounded-lg text-xs font-bold bg-neon-green text-void shadow-card-sm"
                >
                  {currentIndex < preparedQuestions.length - 1 ? 'Next Question' : 'Complete Quiz'} <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ── COMPLETION SCREEN ──
  if (isFinished && preparedQuestions.length > 0) {
    const total = preparedQuestions.length
    const accuracy = Math.round((score / total) * 100)
    const xp = score * 25

    return (
      <div className="h-full flex items-center justify-center p-4">
        <div className="text-center py-8 space-y-5 animate-fade-up max-w-sm w-full">
          <div className="relative inline-flex items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-neon-green/10 blur-xl" />
            <div className="w-16 h-14 rounded-2xl bg-neon-green/10 flex items-center justify-center shadow-card-sm">
              <Trophy className="w-7 h-7 text-neon-green" />
            </div>
          </div>

          <div>
            <h3 className="text-lg font-bold text-ink-primary font-display">
              {accuracy >= 80 ? 'Outstanding!' : accuracy >= 60 ? 'Good Effort!' : 'Keep Studying!'}
            </h3>
            <p className="text-[11px] text-ink-tertiary mt-1">
              {activeQuiz ? activeQuiz.topic : 'Bookmarked Questions'} — {accuracy >= 80 ? 'Excellent recall.' : 'Review the explanations to strengthen your understanding.'}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2.5 p-3">
            <div className="text-center p-3 rounded-lg bg-card/40">
              <div className="text-lg font-bold font-mono text-neon-green">{score} / {total}</div>
              <div className="text-[9px] text-ink-tertiary uppercase tracking-wider mt-0.5">Score</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-card/40">
              <div className="text-lg font-bold font-mono text-ink-primary">{accuracy}%</div>
              <div className="text-[9px] text-ink-tertiary uppercase tracking-wider mt-0.5">Accuracy</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-card/40">
              <div className="text-lg font-bold font-mono text-ink-primary">+{xp} XP</div>
              <div className="text-[9px] text-ink-tertiary uppercase tracking-wider mt-0.5">XP Earned</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-card/40">
              <div className="text-lg font-bold font-mono text-ink-primary">{total}</div>
              <div className="text-[9px] text-ink-tertiary uppercase tracking-wider mt-0.5">Questions</div>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleRetry}
              className="glow-btn btn-ripple flex-1 flex items-center justify-center gap-1.5 py-3 rounded-lg text-xs font-bold bg-neon-green text-void shadow-card-sm"
            >
              <RefreshCcw className="w-4 h-4" /> Retry
            </button>
            <button
              onClick={backToLibrary}
              className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-lg text-xs font-bold bg-card/40 text-ink-secondary hover:text-ink-primary hover:bg-elevated/60 transition-all min-h-[44px]"
            >
              <ArrowLeft className="w-4 h-4" /> Library
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── QUIZ LIBRARY HOME ──
  return (
    <div className="view-container">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-5 animate-fade-up">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold font-display text-ink-primary">Quiz Arena</h1>
            <p className="text-[11px] text-ink-tertiary mt-0.5">Medical MCQs with detailed explanations across MBBS & BDS subjects</p>
          </div>
          <div className="flex gap-2">
            {bookmarkedMcqCount > 0 && (
              <button
                onClick={startBookmarkReview}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-neon-physio/[0.08] border border-neon-physio/25 text-neon-physio font-bold text-[11px] hover:bg-neon-physio/[0.14] active:scale-95 transition-all"
              >
                <Heart className="w-3.5 h-3.5 fill-neon-physio" /> Saved ({bookmarkedMcqCount})
              </button>
            )}
            <button
              onClick={() => setShowGenerate(s => !s)}
              className="glow-btn flex items-center gap-1.5 px-3 py-2 rounded-lg bg-neon-green text-void font-bold text-[11px] shadow-card-sm"
            >
              <Sparkles className="w-3.5 h-3.5" /> Generate
            </button>
          </div>
        </div>

        {/* Generate Inline */}
        {showGenerate && (
          <div className="p-4 rounded-xl bg-card/40 space-y-3 animate-fade-in">
            <div className="flex gap-2">
              <input
                type="text"
                value={generateTopic}
                onChange={e => setGenerateTopic(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleGenerateQuiz()}
                placeholder="Enter any medical topic (e.g. Heart Failure)"
                className="flex-1 bg-void/60 rounded-lg px-3 py-2 text-sm text-ink-primary placeholder:text-ink-tertiary/50 focus:outline-none focus:ring-1 focus:ring-neon-green/20"
              />
              <button
                onClick={handleGenerateQuiz}
                disabled={!generateTopic.trim() || generating}
                className="glow-btn px-4 py-2 rounded-lg bg-neon-green text-void font-bold text-xs disabled:opacity-40 flex items-center gap-1.5"
              >
                {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                Quiz
              </button>
              <button
                onClick={() => { if (generateTopic.trim()) onGenerateFromMnemonic(generateTopic.trim()) }}
                disabled={!generateTopic.trim()}
                className="px-4 py-2 rounded-lg bg-neon-physio/[0.08] border border-neon-physio/25 text-neon-physio font-bold text-xs disabled:opacity-40 hover:bg-neon-physio/[0.14] active:scale-95 transition-all flex items-center gap-1.5"
              >
                <Zap className="w-3.5 h-3.5" /> With Mnemonic
              </button>
            </div>

            {/* Question count selector */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-ink-tertiary font-bold uppercase tracking-wider shrink-0">Questions:</span>
              <div className="flex items-center gap-1 bg-void/40 rounded-lg p-0.5">
                {COUNT_PRESETS.map(n => (
                  <button
                    key={n}
                    onClick={() => { setQuizCount(n); setShowCustomCount(false) }}
                    className={cn(
                      'px-3 py-1 rounded-md text-[11px] font-mono font-bold transition-all',
                      quizCount === n && !showCustomCount
                        ? 'bg-neon-green/[0.12] text-neon-green'
                        : 'text-ink-tertiary hover:text-ink-secondary hover:bg-elevated/40',
                    )}
                  >
                    {n}
                  </button>
                ))}
                <button
                  onClick={() => setShowCustomCount(s => !s)}
                  className={cn(
                    'px-3 py-1 rounded-md text-[11px] font-mono font-bold transition-all',
                    showCustomCount
                      ? 'bg-neon-green/[0.12] text-neon-green'
                      : 'text-ink-tertiary hover:text-ink-secondary hover:bg-elevated/40',
                  )}
                >
                  Custom
                </button>
              </div>
              {showCustomCount && (
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={quizCount}
                  onChange={e => {
                    const v = Math.min(Math.max(Number(e.target.value) || 1, 1), 50)
                    setQuizCount(v)
                  }}
                  className="w-16 bg-void/60 rounded-md px-2 py-1 text-[11px] font-mono text-ink-primary focus:outline-none focus:ring-1 focus:ring-neon-green/20"
                />
              )}
            </div>

            {generating && quizCount > 15 && (
              <p className="text-[10px] text-ink-tertiary animate-pulse">
                Building your clinical questions…
              </p>
            )}
            {generateError && <p className="text-[11px] text-neon-danger">{generateError}</p>}
          </div>
        )}

        {/* Search & Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-tertiary" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search quiz topics..."
              className="w-full bg-card/40 rounded-lg pl-9 pr-3 py-2 text-xs text-ink-primary placeholder:text-ink-tertiary/50 input-neon"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={subjectFilter}
              onChange={e => setSubjectFilter(e.target.value as SubjectId | 'all')}
              className="bg-card/40 rounded-lg px-3 py-2 text-xs text-ink-secondary focus:outline-none focus:ring-1 focus:ring-neon-green/20 appearance-none cursor-pointer min-w-[120px]"
            >
              <option value="all">All Subjects</option>
              {subjects.map(s => (
                <option key={s.id} value={s.id}>{s.icon} {s.label}</option>
              ))}
            </select>
            <button
              onClick={() => setBookmarkedOnly(b => !b)}
              className={cn(
                'px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5',
                bookmarkedOnly
                  ? 'bg-neon-physio/[0.08] text-neon-physio border border-neon-physio/20'
                  : 'bg-card/40 border border-transparent text-ink-tertiary hover:text-ink-secondary hover:border-border/50',
              )}
            >
              <Star className={cn('w-3.5 h-3.5', bookmarkedOnly && 'fill-neon-physio')} />
              Saved
            </button>
          </div>
        </div>

        {/* Quiz Cards Grid */}
        {filteredQuizzes.length === 0 ? (
          <div className="view-empty space-y-4">
            <div className="relative inline-flex items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-neon-micro/5 blur-xl w-16 h-16" />
              <Target className="w-12 h-12 text-ink-tertiary/30 relative" />
            </div>
            <div>
              <p className="text-sm font-semibold text-ink-secondary">No quiz sets found</p>
              <p className="text-[11px] text-ink-tertiary/60 mt-1">Try a different search or generate a new quiz</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredQuizzes.map(quiz => {
              const isBm = bookmarks.isBookmarked('quiz', quiz.id)
              const easyCount = quiz.questions.filter(q => q.difficulty === 'Easy').length
              const medCount = quiz.questions.filter(q => q.difficulty === 'Medium').length
              const hardCount = quiz.questions.filter(q => q.difficulty === 'Hard').length

              return (
                <div key={quiz.id} className="group bg-card/40 hover:bg-card/60 transition-all duration-200 rounded-xl overflow-hidden border border-border/30 hover:border-border/50">
                  <button
                    onClick={() => startSession(quiz)}
                    className="w-full text-left p-4"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <span className="text-[9px] px-2 py-0.5 rounded-full font-mono bg-neon-micro/[0.08] border border-neon-micro/20 text-neon-micro uppercase font-bold tracking-wider">
                        {quiz.subject}
                      </span>
                      <div className="flex items-center gap-1">
                        {quiz.isCurated && (
                          <span className="text-[8px] px-1.5 py-0.5 rounded-full font-mono bg-neon-green/[0.08] border border-neon-green/20 text-neon-green font-bold">
                            CURATED
                          </span>
                        )}
                        {isBm && <Star className="w-3 h-3 fill-neon-physio text-neon-physio" />}
                      </div>
                    </div>
                    <h3 className="text-sm font-bold text-ink-primary group-hover:text-white transition-colors mb-1.5">{quiz.topic}</h3>
                    <div className="flex items-center gap-3 text-[10px] text-ink-tertiary font-mono">
                      <span>{quiz.questions.length} Qs</span>
                      {easyCount > 0 && <span className="text-neon-green">{easyCount}E</span>}
                      {medCount > 0 && <span className="text-neon-physio">{medCount}M</span>}
                      {hardCount > 0 && <span className="text-neon-danger">{hardCount}H</span>}
                    </div>
                  </button>
                  {/* Difficulty distribution bar */}
                  <div className="px-4 pb-1">
                    <div className="flex h-1 rounded-full overflow-hidden gap-px">
                      {easyCount > 0 && <div className="bg-neon-green/60 rounded-l-full" style={{ width: `${(easyCount / quiz.questions.length) * 100}%` }} />}
                      {medCount > 0 && <div className="bg-neon-physio/60" style={{ width: `${(medCount / quiz.questions.length) * 100}%` }} />}
                      {hardCount > 0 && <div className="bg-neon-danger/60 rounded-r-full" style={{ width: `${(hardCount / quiz.questions.length) * 100}%` }} />}
                    </div>
                  </div>
                  <div className="px-4 pb-3 pt-2 flex items-center justify-between">
                    <button
                      onClick={() => handleToggleQuizBookmark(quiz)}
                      className={cn('p-1.5 rounded-lg transition-all', isBm ? 'text-neon-physio' : 'text-ink-tertiary/50 hover:text-ink-tertiary')}
                    >
                      <Star className={cn('w-3.5 h-3.5', isBm && 'fill-neon-physio')} />
                    </button>
                    <button
                      onClick={() => startSession(quiz)}
                      className="text-[10px] font-bold text-neon-micro hover:text-neon-green transition-colors flex items-center gap-1"
                    >
                      Start <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// Keep the old export for backward compatibility during migration
export type { QuizArenaProps }
