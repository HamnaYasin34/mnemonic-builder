'use client'

import { useState, useEffect } from 'react'
import { Star, Bookmark, ThumbsDown, Meh, ThumbsUp, HelpCircle, Brain } from 'lucide-react'
import { ReviewQuality } from '../types'
import { cn } from '../lib/utils'

interface PremiumFlashcardProps {
  card: {
    id: string
    topic: string
    subject: string
    mnemonic: {
      mnemonic: string
      ankiFront: string
      ankiBack: string
      explanation: string
      question?: string
      answer?: string
    }
  }
  isFavorite: boolean
  onToggleFav: () => void
  onReview?: (quality: ReviewQuality) => void
  totalCards?: number
  currentIndex?: number
  /** When true, show mnemonic details on the back of the card */
  showMnemonic?: boolean
}

export default function PremiumFlashcard({
  card, isFavorite, onToggleFav, onReview, totalCards, currentIndex, showMnemonic = false
}: PremiumFlashcardProps) {
  const [flipped, setFlipped] = useState(false)
  const [isBookmarked, setIsBookmarked] = useState(false)

  // Backward compat: use question/answer if available, fall back to ankiFront/ankiBack
  const front = card.mnemonic.question || card.mnemonic.ankiFront || card.topic
  const back = card.mnemonic.answer || card.mnemonic.ankiBack || ''

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault()
        setFlipped(f => !f)
      } else if (e.key === '1' && onReview) {
        onReview(2) // Hard
      } else if (e.key === '2' && onReview) {
        onReview(4) // Good
      } else if (e.key === '3' && onReview) {
        onReview(5) // Easy
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onReview])

  return (
    <div className="space-y-4 w-full">
      {/* Keyboard Hints + Progress */}
      <div className="flex items-center justify-between text-[10px] font-mono text-ink-tertiary">
        <div className="flex items-center gap-1">
          <HelpCircle className="w-3 h-3 text-ink-muted" />
          <span>Shortcuts: [Space] flip, [1,2,3] rate</span>
        </div>
        {totalCards !== undefined && currentIndex !== undefined && (
          <span>Card {currentIndex + 1} of {totalCards}</span>
        )}
      </div>

      {/* 3D Flip Card */}
      <div
        onClick={() => setFlipped(f => !f)}
        className={cn('flip-card relative h-48 cursor-pointer select-none group w-full', flipped && 'is-flipped')}
        role="button"
        aria-label="Click to flip flashcard"
      >
        <div
          className={cn(
            'flip-card-inner w-full h-full shadow-card-lg rounded-2xl',
            flipped ? 'bg-ai/[0.06]' : 'bg-neon-green/[0.06]'
          )}
        >
          {/* ── FRONT: Question/Prompt ── */}
          <div className="flip-card-face absolute inset-0 p-5 rounded-2xl flex flex-col justify-between bg-card/20 backdrop-blur-md">
            <div className="flex items-center justify-between w-full">
              <span className="text-[9px] px-2.5 py-0.5 rounded-full font-mono bg-neon-green/[0.08] text-neon-green border border-neon-green/20 font-bold uppercase tracking-wider">
                Question
              </span>
              <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                <button
                  type="button"
                  onClick={onToggleFav}
                  className="p-1.5 rounded-lg hover:bg-subtle/50 text-ink-tertiary hover:text-neon-physio transition-all"
                >
                  <Star className={cn('w-4 h-4', isFavorite ? 'fill-neon-physio text-neon-physio' : 'text-ink-tertiary')} />
                </button>
                <button
                  type="button"
                  onClick={() => setIsBookmarked(b => !b)}
                  className="p-1.5 rounded-lg hover:bg-subtle/50 text-ink-tertiary hover:text-neon-cyan transition-all"
                >
                  <Bookmark className={cn('w-4 h-4', isBookmarked ? 'fill-neon-cyan text-neon-cyan' : 'text-ink-tertiary')} />
                </button>
              </div>
            </div>

            <p className="text-sm sm:text-base font-bold text-white leading-relaxed text-center my-auto px-2 text-balance">
              {front}
            </p>

            <div className="flex items-center justify-between text-[10px] text-ink-tertiary font-mono">
              <span className="truncate">Topic: {card.topic}</span>
              <span className="shrink-0 text-ink-muted">Tap to reveal answer →</span>
            </div>
          </div>

          {/* ── BACK: Answer + Explanation + Optional Mnemonic ── */}
          <div className="flip-card-face flip-card-back absolute inset-0 p-5 rounded-2xl flex flex-col justify-between bg-card/20 backdrop-blur-md">
            <div className="flex items-center justify-between w-full">
              <span className="text-[9px] px-2.5 py-0.5 rounded-full font-mono bg-ai/[0.08] text-ai border border-ai/20 font-bold uppercase tracking-wider">
                Answer
              </span>
              <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                <button
                  type="button"
                  onClick={onToggleFav}
                  className="p-1.5 rounded-lg hover:bg-subtle/50 text-ink-tertiary hover:text-neon-physio transition-all"
                >
                  <Star className={cn('w-4 h-4', isFavorite ? 'fill-neon-physio text-neon-physio' : 'text-ink-tertiary')} />
                </button>
              </div>
            </div>

            <div className="min-h-0 overflow-y-auto space-y-2 my-auto px-2 scrollbar-none">
              <p className="text-xs sm:text-sm font-bold text-white leading-relaxed text-center text-balance">
                {back}
              </p>
              {card.mnemonic.explanation && (
                <p className="text-[11px] text-ink-secondary leading-relaxed text-center whitespace-pre-line">
                  {card.mnemonic.explanation}
                </p>
              )}
              {showMnemonic && card.mnemonic.mnemonic && (
                <div className="mt-2 pt-2 border-t border-border/20">
                  <div className="flex items-center gap-1.5 text-[9px] text-neon-physio font-mono font-bold uppercase tracking-wider mb-1">
                    <Brain className="w-3 h-3" />
                    <span>Memory Aid</span>
                  </div>
                  <p className="text-[11px] text-ink-tertiary leading-relaxed italic">
                    {card.mnemonic.mnemonic}
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between text-[10px] text-ink-tertiary font-mono">
              <span className="truncate">Subject: {card.subject.toUpperCase()}</span>
              <span className="shrink-0 text-ink-muted">Tap to flip back</span>
            </div>
          </div>
        </div>
      </div>

      {/* Confidence rating */}
      {onReview && (
        <div className="pt-2 animate-fade-in space-y-2.5 bg-card p-4 rounded-xl shadow-card-sm">
          <p className="section-label text-ink-tertiary text-center">Rate recall difficulty to schedule review</p>
          <div className="flex gap-2">
            <button
              onClick={() => onReview(2)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-bold bg-card border border-border/60 text-ink-secondary hover:border-neon-danger/30 hover:bg-neon-danger/10 hover:text-neon-danger transition-all duration-200 active:scale-95"
            >
              <ThumbsDown className="w-3.5 h-3.5" /> Hard [1]
            </button>
            <button
              onClick={() => onReview(4)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-bold bg-card border border-border/60 text-ink-secondary hover:border-neon-physio/30 hover:bg-neon-physio/10 hover:text-neon-physio transition-all duration-200 active:scale-95"
            >
              <Meh className="w-3.5 h-3.5" /> Good [2]
            </button>
            <button
              onClick={() => onReview(5)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-bold bg-card border border-border/60 text-ink-secondary hover:border-neon-green/30 hover:bg-neon-green/10 hover:text-neon-green transition-all duration-200 active:scale-95"
            >
              <ThumbsUp className="w-3.5 h-3.5" /> Easy [3]
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
