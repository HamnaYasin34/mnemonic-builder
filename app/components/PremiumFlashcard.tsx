'use client'

import { useState, useEffect } from 'react'
import { Star, Bookmark, ThumbsDown, Meh, ThumbsUp, HelpCircle } from 'lucide-react'
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
    }
  }
  isFavorite: boolean
  onToggleFav: () => void
  onReview?: (quality: ReviewQuality) => void
  totalCards?: number
  currentIndex?: number
}

export default function PremiumFlashcard({
  card, isFavorite, onToggleFav, onReview, totalCards, currentIndex
}: PremiumFlashcardProps) {
  const [flipped, setFlipped] = useState(false)
  const [isBookmarked, setIsBookmarked] = useState(false)

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
    };
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onReview])

  return (
    <div className="space-y-4 w-full">
      {/* Upper Progress Indicator & Difficulty Badge */}
      <div className="flex items-center justify-between text-[10px] font-mono text-ink-tertiary">
        <div className="flex items-center gap-1">
          <HelpCircle className="w-3 h-3 text-neon-green" />
          <span>Shortcuts: [Space] to flip, [1, 2, 3] to rate</span>
        </div>
        {totalCards !== undefined && currentIndex !== undefined && (
          <span>Card {currentIndex + 1} of {totalCards}</span>
        )}
      </div>

      {/* Premium 3D Flip Card Container */}
      <div
        onClick={() => setFlipped(f => !f)}
        className="relative h-44 cursor-pointer select-none perspective-1000 group w-full"
        role="button"
        aria-label="Click to flip flashcard"
      >
        <div
          className={cn(
            'relative w-full h-full transition-transform duration-500 transform-style-3d shadow-card-lg rounded-2xl border',
            flipped ? 'rotate-y-180 border-neon-biochem-border bg-neon-biochem-dim/15' : 'border-neon-green-border bg-neon-green-dim/15'
          )}
        >
          {/* Card Front face */}
          <div className="absolute inset-0 p-5 rounded-2xl backface-hidden flex flex-col justify-between bg-card/10 backdrop-blur-md">
            <div className="flex items-center justify-between w-full">
              <span className="text-[9px] px-2.5 py-0.5 rounded-full font-mono bg-neon-green-dim border border-neon-green-border text-neon-green font-bold uppercase tracking-wider">
                Mnemonic Anchor
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

            <p className="text-sm sm:text-base font-bold text-white leading-relaxed text-center my-auto px-2">
              {card.mnemonic.mnemonic}
            </p>

            <div className="flex items-center justify-between text-[10px] text-ink-tertiary font-mono">
              <span className="truncate">Topic: {card.topic}</span>
              <span className="shrink-0 text-neon-green/80 hover:underline">Click card to reveal answer →</span>
            </div>
          </div>

          {/* Card Back face */}
          <div className="absolute inset-0 p-5 rounded-2xl backface-hidden rotate-y-180 flex flex-col justify-between bg-card/10 backdrop-blur-md">
            <div className="flex items-center justify-between w-full">
              <span className="text-[9px] px-2.5 py-0.5 rounded-full font-mono bg-neon-biochem-dim border border-neon-biochem-border text-neon-biochem font-bold uppercase tracking-wider">
                Anki Flashcard Back
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

            <div className="min-h-0 overflow-y-auto space-y-2 text-center my-auto px-2 scrollbar-none">
              <p className="text-xs sm:text-sm font-bold text-white leading-relaxed">
                Q: {card.mnemonic.ankiFront}
              </p>
              <p className="text-xs text-ink-secondary leading-relaxed whitespace-pre-line">
                {card.mnemonic.ankiBack}
              </p>
            </div>

            <div className="flex items-center justify-between text-[10px] text-ink-tertiary font-mono">
              <span className="truncate">Subject: {card.subject.toUpperCase()}</span>
              <span className="shrink-0 text-neon-biochem/80">Click card to flip back</span>
            </div>
          </div>
        </div>
      </div>

      {/* Confidence rating and quality selectors (Anki RemNote Quizlet styled) */}
      {onReview && (
        <div className="pt-2 animate-fade-in space-y-2.5 bg-card/25 p-4 rounded-2xl border border-border/40">
          <p className="text-[10px] font-bold uppercase tracking-widest font-mono text-ink-tertiary text-center">Rate recall difficulty to schedule review</p>
          <div className="flex gap-2">
            <button
              onClick={() => onReview(2)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold border border-border bg-card hover:border-neon-danger hover:text-neon-danger transition-all active:scale-95 duration-200"
            >
              <ThumbsDown className="w-3.5 h-3.5" /> Hard [1]
            </button>
            <button
              onClick={() => onReview(4)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold border border-border bg-card hover:border-neon-physio hover:text-neon-physio transition-all active:scale-95 duration-200"
            >
              <Meh className="w-3.5 h-3.5" /> Good [2]
            </button>
            <button
              onClick={() => onReview(5)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold border border-border bg-card hover:border-neon-green hover:text-neon-green transition-all active:scale-95 duration-200"
            >
              <ThumbsUp className="w-3.5 h-3.5" /> Easy [3]
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
