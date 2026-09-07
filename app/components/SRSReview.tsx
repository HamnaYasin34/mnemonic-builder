'use client'

// ─────────────────────────────────────────────────────────────────────────────
// app/components/SRSReview.tsx  —  Dedicated Spaced Repetition review session
// Shows only due cards with flip-card interface and recall rating.
// Separate from flashcard browsing/management (VaultPanel).
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useCallback, useMemo } from 'react'
import {
  Brain, ArrowLeft, RotateCcw, CheckCircle2, Trophy, Zap, AlertTriangle,
} from 'lucide-react'
import { Flashcard, ReviewQuality } from '../types'
import { getSubject } from '../lib/subjects'
import { cn } from '../lib/utils'
import PremiumFlashcard from './PremiumFlashcard'
import { analytics } from '../lib/analytics'
import { prioritizeCards, computeEvidencePriority, evidencePriorityLabel } from '../lib/vault'

interface SRSReviewProps {
  cards: Flashcard[]
  onReview: (id: string, quality: ReviewQuality) => void
  onNavigateBack?: () => void
}

export default function SRSReview({ cards, onReview, onNavigateBack }: SRSReviewProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [showMnemonic, setShowMnemonic] = useState(false)
  const [sessionStats, setSessionStats] = useState({ reviewed: 0, totalQuality: 0 })
  const [sessionComplete, setSessionComplete] = useState(false)

  const dueCards = useMemo(() => prioritizeCards(cards), [cards])
  const currentCard = dueCards[currentIndex]
  const remaining = dueCards.length - currentIndex
  const progress = dueCards.length > 0 ? ((currentIndex) / dueCards.length) * 100 : 0

  const handleRate = useCallback((quality: ReviewQuality) => {
    if (!currentCard) return
    onReview(currentCard.id, quality)
    setSessionStats(prev => ({
      reviewed: prev.reviewed + 1,
      totalQuality: prev.totalQuality + quality,
    }))
    analytics.log('flashcard_reviewed', currentCard.topic, currentCard.subject, { quality })

    if (currentIndex + 1 >= dueCards.length) {
      setSessionComplete(true)
      analytics.log('srs_session_completed', undefined, undefined, {
        reviewed: sessionStats.reviewed + 1,
        totalCards: dueCards.length,
      })
    } else {
      setCurrentIndex(i => i + 1)
    }
  }, [currentCard, currentIndex, dueCards.length, onReview])

  const resetSession = useCallback(() => {
    setCurrentIndex(0)
    setSessionStats({ reviewed: 0, totalQuality: 0 })
    setSessionComplete(false)
  }, [])

  // Empty state — no due cards
  if (dueCards.length === 0) {
    return (
      <div className="view-container">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-6 animate-fade-up">
          <div className="flex items-center gap-3">
            <button onClick={onNavigateBack} className="p-2.5 rounded-lg hover:bg-elevated/60 text-ink-tertiary hover:text-ink-secondary transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-neon-biochem/10 flex items-center justify-center">
                <Brain className="w-5 h-5 text-neon-biochem" />
              </div>
              <div>
                <h1 className="text-lg font-bold font-display text-ink-primary">SRS Review</h1>
                <p className="text-[10px] text-ink-tertiary">Spaced Repetition</p>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-xl shadow-card p-8 sm:p-12 text-center space-y-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-neon-green/10">
              <CheckCircle2 className="w-8 h-8 text-neon-green" />
            </div>
            <div>
              <h2 className="text-base font-bold font-display text-ink-primary">All caught up!</h2>
              <p className="text-xs text-ink-tertiary mt-1 max-w-xs mx-auto leading-relaxed">
                No cards are due for review right now. Generate more mnemonics or check back later when your scheduled reviews are ready.
              </p>
            </div>
            <button onClick={onNavigateBack} className="btn-secondary mt-2">
              <Zap className="w-3.5 h-3.5" /> Generate Mnemonics
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Session complete
  if (sessionComplete) {
    const avgQuality = sessionStats.reviewed > 0
      ? (sessionStats.totalQuality / sessionStats.reviewed).toFixed(1)
      : '0'
    const avgPercent = sessionStats.reviewed > 0
      ? Math.round((sessionStats.totalQuality / sessionStats.reviewed / 5) * 100)
      : 0

    return (
      <div className="view-container">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-6 animate-fade-up">
          <div className="flex items-center gap-3">
            <button onClick={onNavigateBack} className="p-2.5 rounded-lg hover:bg-elevated/60 text-ink-tertiary hover:text-ink-secondary transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-neon-green/10 flex items-center justify-center">
                <Trophy className="w-5 h-5 text-neon-green" />
              </div>
              <div>
                <h1 className="text-lg font-bold font-display text-ink-primary">Session Complete</h1>
                <p className="text-[10px] text-ink-tertiary">Great work!</p>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-xl shadow-card p-6 space-y-5">
            {/* Score */}
            <div className="text-center space-y-2">
              <div className="text-4xl font-bold font-mono text-neon-green">{avgPercent}%</div>
              <p className="text-xs text-ink-tertiary">Average recall quality</p>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-elevated/60 rounded-xl p-3 text-center">
                <div className="text-lg font-bold font-mono text-ink-primary">{sessionStats.reviewed}</div>
                <div className="text-[9px] text-ink-tertiary uppercase tracking-wider mt-0.5">Reviewed</div>
              </div>
              <div className="bg-elevated/60 rounded-xl p-3 text-center">
                <div className="text-lg font-bold font-mono text-ink-primary">{avgQuality}</div>
                <div className="text-[9px] text-ink-tertiary uppercase tracking-wider mt-0.5">Avg Quality</div>
              </div>
              <div className="bg-elevated/60 rounded-xl p-3 text-center">
                <div className="text-lg font-bold font-mono text-ink-primary">{remaining}</div>
                <div className="text-[9px] text-ink-tertiary uppercase tracking-wider mt-0.5">Remaining</div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button onClick={resetSession} className="btn-secondary flex-1">
                <RotateCcw className="w-3.5 h-3.5" /> Review Again
              </button>
              <button onClick={onNavigateBack} className="btn-primary flex-1">
                Done
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Active review session
  return (
    <div className="view-container">
      <div className="max-w-xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={onNavigateBack} className="p-2 rounded-lg hover:bg-elevated/60 text-ink-tertiary hover:text-ink-secondary transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2">
              <Brain className="w-4 h-4 text-neon-biochem" />
              <span className="text-xs font-bold font-display text-ink-primary">SRS Review</span>
            </div>
          </div>
          <div className="text-[10px] font-mono text-ink-tertiary">
            {currentIndex + 1} / {dueCards.length}
          </div>
        </div>

        {/* Progress bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-[9px] text-ink-tertiary font-mono">
            <span>{remaining} card{remaining !== 1 ? 's' : ''} remaining</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="h-1.5 bg-elevated rounded-full overflow-hidden">
            <div
              className="h-full bg-neon-green rounded-full transition-all duration-300 progress-bar-animated"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Current card */}
        {currentCard && (
          <div className="animate-fade-in">
            {/* Subject badge + evidence priority indicator */}
            <div className="flex items-center gap-2 mb-3">
              {(() => {
                const subject = getSubject(currentCard.subject)
                const eScore = computeEvidencePriority(currentCard)
                const eLabel = evidencePriorityLabel(eScore)
                return (
                  <>
                    <span
                      className="text-[9px] px-2 py-0.5 rounded-full font-mono font-bold"
                      style={{ background: `${subject.accent}1a`, color: subject.accent }}
                    >
                      {subject.icon} {subject.label}
                    </span>
                    {eLabel && (
                      <span className={cn(
                        'text-[9px] px-2 py-0.5 rounded-full font-mono font-bold flex items-center gap-1',
                        eScore >= 5 ? 'bg-amber-500/15 text-amber-400 border border-amber-500/25' : 'bg-neon-cyan/15 text-neon-cyan border border-neon-cyan/25'
                      )}>
                        <AlertTriangle className="w-2.5 h-2.5" />
                        {eLabel}
                      </span>
                    )}
                  </>
                )
              })()}
            </div>

            <PremiumFlashcard
              card={{
                id: currentCard.id,
                topic: currentCard.topic,
                subject: currentCard.subject,
                mnemonic: {
                  mnemonic: currentCard.mnemonic.mnemonic,
                  ankiFront: currentCard.mnemonic.ankiFront,
                  ankiBack: currentCard.mnemonic.ankiBack,
                  explanation: currentCard.mnemonic.explanation,
                },
              }}
              isFavorite={currentCard.isFavorite}
              onToggleFav={() => {}}
              onReview={handleRate}
              showMnemonic={showMnemonic}
              totalCards={dueCards.length}
              currentIndex={currentIndex}
            />
          </div>
        )}

        {/* Mnemonic toggle */}
        <div className="flex justify-center">
          <button
            onClick={() => setShowMnemonic(m => !m)}
            className={cn(
              'text-[10px] font-mono px-3 py-1.5 rounded-lg transition-all',
              showMnemonic
                ? 'bg-neon-physio/[0.08] text-neon-physio border border-neon-physio/20'
                : 'bg-card/40 border border-transparent text-ink-tertiary hover:text-ink-secondary hover:bg-card/60 hover:border-border/50',
            )}
          >
            {showMnemonic ? 'Mnemonic: Visible' : 'Mnemonic: Hidden'}
          </button>
        </div>
      </div>
    </div>
  )
}
