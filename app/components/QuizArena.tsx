'use client'

import { useState, useEffect } from 'react'
import { Target, Trophy, Timer, ArrowRight, RefreshCcw, Check, X, Info } from 'lucide-react'
import { cn } from '../lib/utils'
import { MnemonicOutput } from '../types'

export interface QuizQuestion {
  type: 'mcq' | 'clinical' | 'rapid' | 'blank'
  question: string
  options: string[]
  answerIndex: number
  explanation: string
  difficulty: 'Easy' | 'Medium' | 'Hard'
}

interface QuizArenaProps {
  questions: QuizQuestion[] | null
  onGoToGenerate: () => void
}

export default function QuizArena({ questions, onGoToGenerate }: QuizArenaProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedOption, setSelectedOption] = useState<number | null>(null)
  const [answered, setAnswered] = useState(false)
  const [score, setScore] = useState(0)
  const [isFinished, setIsFinished] = useState(false)
  const [startTime, setStartTime] = useState(Date.now())
  const [timeTaken, setTimeTaken] = useState(0)
  const [xp, setXp] = useState(0)

  useEffect(() => {
    setStartTime(Date.now())
  }, [currentIndex, isFinished])

  if (!questions || questions.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-8 max-w-md mx-auto space-y-6">
        <div className="w-16 h-16 rounded-full bg-neon-micro-dim border border-neon-micro/30 flex items-center justify-center animate-pulse">
          <Target className="w-8 h-8 text-neon-micro" />
        </div>
        <div>
          <h2 className="text-base sm:text-lg font-bold text-ink-primary font-display">No Practice Questions Loaded</h2>
          <p className="text-xs text-ink-tertiary mt-2 leading-relaxed">
            Practice questions are dynamically synthesized matching the clinical subjects you study. Generate a mnemonic to unlock your personalized quiz challenge!
          </p>
        </div>
        <button
          onClick={onGoToGenerate}
          className="px-5 py-3 rounded-xl bg-neon-green text-void font-bold text-xs shadow-glow-sm hover:brightness-110 active:scale-95 transition-all"
        >
          Generate a Mnemonic Now
        </button>
      </div>
    )
  }

  const handleOptionSelect = (index: number) => {
    if (answered) return
    setSelectedOption(index)
  }

  const handleCheckAnswer = () => {
    if (selectedOption === null || answered) return
    setAnswered(true)
    const currentQ = questions[currentIndex]
    if (selectedOption === currentQ.answerIndex) {
      setScore(s => s + 1)
      setXp(x => x + 25)
    }
  }

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(c => c + 1)
      setSelectedOption(null)
      setAnswered(false)
    } else {
      const duration = Math.round((Date.now() - startTime) / 1000)
      setTimeTaken(duration)
      setIsFinished(true)
    }
  }

  const handleRetry = () => {
    setCurrentIndex(0)
    setSelectedOption(null)
    setAnswered(false)
    setScore(0)
    setIsFinished(false)
    setXp(0)
    setStartTime(Date.now())
  }

  const currentQ = questions[currentIndex]
  const finalAccuracy = Math.round((score / questions.length) * 100)

  if (isFinished) {
    return (
      <div className="h-full flex items-center justify-center p-4">
        <div className="text-center py-8 sm:py-12 space-y-6 animate-fade-up max-w-md w-full">
          <div className="relative inline-flex items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-neon-green/10 blur-xl animate-pulse" />
            <div className="w-20 h-16 rounded-full bg-neon-green-dim border border-neon-green-border flex items-center justify-center shadow-glow-sm">
              <Trophy className="w-8 h-8 text-neon-green" />
            </div>
          </div>

          <div>
            <h3 className="text-lg sm:text-xl font-bold text-ink-primary font-display">Practice Completed!</h3>
            <p className="text-xs text-ink-tertiary mt-1">Excellent practice! Your long-term active recall is sharpening.</p>
          </div>

          <div className="grid grid-cols-2 gap-3.5 bg-void/40 p-4 rounded-2xl border border-border/40">
            <div className="text-center p-3 rounded-xl bg-card border border-border">
              <div className="text-xl font-bold font-mono text-neon-green">{score} / {questions.length}</div>
              <div className="text-[9px] text-ink-tertiary uppercase tracking-wider mt-1">Score</div>
            </div>
            <div className="text-center p-3 rounded-xl bg-card border border-border">
              <div className="text-xl font-bold font-mono text-neon-physio">{finalAccuracy}%</div>
              <div className="text-[9px] text-ink-tertiary uppercase tracking-wider mt-1">Accuracy</div>
            </div>
            <div className="text-center p-3 rounded-xl bg-card border border-border">
              <div className="text-xl font-bold font-mono text-neon-biochem">+{xp} XP</div>
              <div className="text-[9px] text-ink-tertiary uppercase tracking-wider mt-1">XP Earned</div>
            </div>
            <div className="text-center p-3 rounded-xl bg-card border border-border">
              <div className="text-xl font-bold font-mono text-neon-micro">{timeTaken}s</div>
              <div className="text-[9px] text-ink-tertiary uppercase tracking-wider mt-1">Time Taken</div>
            </div>
          </div>

          <button
            onClick={handleRetry}
            className="w-full flex items-center justify-center gap-1.5 py-3.5 rounded-xl text-xs sm:text-sm font-bold bg-neon-green text-void hover:brightness-110 active:scale-[0.97] transition-all shadow-glow-sm"
          >
            <RefreshCcw className="w-4 h-4" /> Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto scrollbar-none pb-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 animate-fade-up">
        {/* Brilliant Header Progress */}
        <div className="flex items-center gap-4 w-full pb-4 border-b border-border">
          <span className="text-[10px] text-ink-tertiary font-mono font-bold shrink-0">
            Question {currentIndex + 1} of {questions.length}
          </span>
          <div className="flex-1 h-2 bg-subtle/50 rounded-full overflow-hidden">
            <div
              className="h-full bg-neon-micro rounded-full transition-all duration-500 ease-out"
              style={{ width: `${((currentIndex + 1) / questions.length) * 100}%`, boxShadow: '0 0 8px rgba(0,180,216,0.4)' }}
            />
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-ink-tertiary font-mono shrink-0">
            <Timer className="w-3.5 h-3.5 text-neon-micro" />
            <span>Active Challenge</span>
          </div>
        </div>

        {/* Challenge Header / Badge */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className={cn(
              'text-[9px] px-2.5 py-0.5 rounded-full font-mono uppercase font-bold border',
              currentQ.difficulty === 'Easy' && 'text-neon-green bg-neon-green-dim border-neon-green-border',
              currentQ.difficulty === 'Medium' && 'text-neon-physio bg-neon-physio-dim border-neon-physio-border',
              currentQ.difficulty === 'Hard' && 'text-neon-danger bg-neon-danger-dim border-neon-danger/30'
            )}>
              {currentQ.difficulty} Challenge
            </span>
            <span className="text-[10px] font-mono text-ink-tertiary">Type: {currentQ.type.toUpperCase()}</span>
          </div>
          <h2 className="text-base sm:text-lg font-bold text-ink-primary leading-snug">
            {currentQ.question}
          </h2>
        </div>

        {/* Options */}
        <div className="grid grid-cols-1 gap-3">
          {currentQ.options.map((option, idx) => {
            const isSelected = selectedOption === idx
            const isCorrect = idx === currentQ.answerIndex
            const showSuccess = answered && isCorrect
            const showFailure = answered && isSelected && !isCorrect

            return (
              <button
                key={idx}
                type="button"
                disabled={answered}
                onClick={() => handleOptionSelect(idx)}
                className={cn(
                  'w-full flex items-center justify-between p-4 rounded-xl text-left transition-all duration-200 border',
                  'active:scale-[0.99] hover:bg-elevated/30',
                  isSelected
                    ? 'border-neon-micro bg-neon-micro-dim/10 shadow-glow-micro'
                    : 'border-border/60 bg-card/20',
                  showSuccess && 'border-neon-green bg-neon-green-dim/15 text-neon-green shadow-glow-sm',
                  showFailure && 'border-neon-danger bg-neon-danger-dim/10 text-neon-danger'
                )}
              >
                <div className="flex items-center gap-3">
                  <span className={cn(
                    'w-6 h-6 rounded-full border text-[10px] font-mono font-bold flex items-center justify-center transition-colors',
                    isSelected ? 'border-neon-micro text-neon-micro bg-elevated' : 'border-border text-ink-tertiary',
                    showSuccess && 'border-neon-green text-neon-green bg-elevated',
                    showFailure && 'border-neon-danger text-neon-danger bg-elevated'
                  )}>
                    {String.fromCharCode(65 + idx)}
                  </span>
                  <span className="text-xs sm:text-sm font-semibold transition-colors leading-relaxed">
                    {option}
                  </span>
                </div>
                {answered && isCorrect && <Check className="w-4.5 h-4.5 text-neon-green shrink-0 ml-2" />}
                {answered && isSelected && !isCorrect && <X className="w-4.5 h-4.5 text-neon-danger shrink-0 ml-2" />}
              </button>
            )
          })}
        </div>

        {/* Footer Submit/Next Navigation */}
        <div className="space-y-4 pt-2">
          {!answered ? (
            <button
              type="button"
              onClick={handleCheckAnswer}
              disabled={selectedOption === null}
              className="w-full flex items-center justify-center gap-1.5 py-3.5 rounded-xl text-xs sm:text-sm font-bold bg-neon-micro text-void hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-40 disabled:pointer-events-none shadow-glow-micro"
            >
              Check Answer <ArrowRight className="w-4.5 h-4.5" />
            </button>
          ) : (
            <div className="space-y-4 animate-fade-in">
              <div className={cn(
                'p-4 rounded-xl border flex gap-3',
                selectedOption === currentQ.answerIndex
                  ? 'bg-neon-green-dim border-neon-green-border/50 text-ink-primary'
                  : 'bg-neon-danger-dim border-neon-danger/30 text-ink-primary'
              )}>
                <Info className={cn('w-4.5 h-4.5 shrink-0 mt-0.5', selectedOption === currentQ.answerIndex ? 'text-neon-green' : 'text-neon-danger')} />
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider font-mono mb-1">
                    {selectedOption === currentQ.answerIndex ? 'Outstanding Recall!' : 'Learning Opportunity'}
                  </p>
                  <p className="text-xs leading-relaxed text-ink-secondary">
                    {currentQ.explanation}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleNext}
                className="w-full flex items-center justify-center gap-1.5 py-3.5 rounded-xl text-xs sm:text-sm font-bold bg-neon-green text-void hover:brightness-110 active:scale-[0.98] transition-all shadow-glow-sm"
              >
                {currentIndex < questions.length - 1 ? 'Next Question' : 'Complete Quiz'} <ArrowRight className="w-4.5 h-4.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export function generateDynamicQuiz(topic: string, result: MnemonicOutput): QuizQuestion[] {
  const m = result.mnemonic || ''
  const story = result.story || ''
  
  return [
    {
      type: 'mcq',
      difficulty: 'Easy',
      question: `Which of the following correct neural maps forms the foundation of the mnemonic: "${m}"?`,
      options: [
        `The characters and spatial triggers inside: "${m.substring(0, Math.min(30, m.length))}..."`,
        `Rote mechanical memory of raw scientific keywords`,
        `A standard clinical index with zero narrative link`,
        `Disconnected scientific jargon with no visual memory cues`
      ],
      answerIndex: 0,
      explanation: `Memory science confirms that narrative stories link concepts together in working memory up to 4.5x faster than standard rote memorization techniques.`,
    },
    {
      type: 'clinical',
      difficulty: 'Hard',
      question: `Clinical Application: A clinician preparing an intervention relating to "${topic || 'this concept'}" maps this storyline: "${story.substring(0, Math.min(45, story.length))}...". Why is this clinically relevant?`,
      options: [
        `The story acts as a logical bridge mapping biological pathways step-by-step`,
        `The narrative is purely for entertainment and holds no scientific relevance`,
        `The story overrides the clinical presentation entirely`,
        `Clinical scenarios ignore semantic memory cues`
      ],
      answerIndex: 0,
      explanation: `Clinical story style structures use clinical situations to anchor physiological concepts, aligning your study path with practical board exam styles.`,
    },
    {
      type: 'blank',
      difficulty: 'Medium',
      question: `Complete the core mnemonic phrase: "${m.slice(0, Math.floor(m.length / 2))} _________."`,
      options: [
        m.slice(Math.floor(m.length / 2)) || "The remaining physiological parts",
        "An unrelated pharmacological agent",
        "A generic anatomy distractor",
        "A clinical textbook citation keyword"
      ],
      answerIndex: 0,
      explanation: `The second half of your custom mnemonic provides the active recall prompt required to systematically unlock the full medical pathway under pressure.`,
    },
    {
      type: 'rapid',
      difficulty: 'Easy',
      question: `True or False: The visual prompts generated by MnemonicFlow map 1:1 onto spaced repetition systems?`,
      options: [
        "True — Flashcards can be exported directly into local Anki decks to activate SM-2 scheduling",
        "False — Visual layouts are single-use illustrations only"
      ],
      answerIndex: 0,
      explanation: `Each generation creates a fully formatted card that exports into Anki, integrating visual memory cues directly with spaced repetition databases.`,
    }
  ]
}
