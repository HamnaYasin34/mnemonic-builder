'use client'

import { useState, useMemo } from 'react'
import { Search, Star, X, Trash2, ChevronDown, BookOpen, Eye, CreditCard, Sparkles, ThumbsDown, Meh, ThumbsUp } from 'lucide-react'
import { Flashcard, VaultFilter, ReviewQuality } from '../types'
import { getSubject } from '../lib/subjects'
import { formatRelativeTime, truncate, cn } from '../lib/utils'
import { isDue } from '../lib/vault'

interface VaultPanelProps {
  cards: Flashcard[]
  onDelete: (id: string) => void
  onToggleFav: (id: string) => void
  onReview?: (id: string, quality: ReviewQuality) => void
  isOpen: boolean
  onClose: () => void
  /** 'drawer' (default) = fixed slide-over used on mobile/tablet.
   *  'rail' = static flex child used on desktop, sized by its parent. */
  variant?: 'drawer' | 'rail'
  filter?: VaultFilter
  onFilterChange?: (filter: VaultFilter) => void
}

// Difficulty badge derived from SM-2 ease factor — display only, doesn't affect scheduling.
function difficultyLabel(easeFactor: number): { label: string; className: string } {
  if (easeFactor >= 2.5) return { label: 'Easy', className: 'text-neon-green bg-neon-green-dim border-neon-green-border' }
  if (easeFactor >= 2.0) return { label: 'Medium', className: 'text-neon-physio bg-neon-physio-dim border-neon-physio-border' }
  return { label: 'Hard', className: 'text-neon-danger bg-neon-danger-dim border-neon-danger/30' }
}

export default function VaultPanel({ cards, onDelete, onToggleFav, onReview, isOpen, onClose, variant = 'drawer', filter: propFilter, onFilterChange }: VaultPanelProps) {
  const isRail = variant === 'rail'
  const [localFilter, setLocalFilter] = useState<VaultFilter>('all')
  const filter = propFilter ?? localFilter
  const setFilter = onFilterChange ?? setLocalFilter
  const [search, setSearch] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const dueCount = useMemo(() => cards.filter(isDue).length, [cards])
  const favCount = useMemo(() => cards.filter(c => c.isFavorite).length, [cards])

  const filtered = useMemo(() => {
    let result = cards
    if (filter === 'due') result = result.filter(isDue)
    else if (filter === 'favorites') result = result.filter(c => c.isFavorite)
    else if (filter !== 'all') result = result.filter(c => c.subject === filter)

    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(c => c.topic.toLowerCase().includes(q))
    }
    return result
  }, [cards, filter, search])

  return (
    <>
      {!isRail && isOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 animate-fade-in"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          'h-full flex flex-col',
          isRail
            ? 'relative w-full bg-[rgba(9,9,9,0.9)] backdrop-blur-xl border-l border-border'
            : cn(
                'fixed top-0 right-0 w-80 max-w-[88vw] z-50 bg-[rgba(9,9,9,0.97)] backdrop-blur-xl',
                'border-l border-border transition-transform duration-300 ease-out',
                isOpen ? 'translate-x-0' : 'translate-x-full',
              ),
        )}
      >
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between px-4 sm:px-5 py-4 sm:py-5 border-b border-border">
          <div className="min-w-0">
            <h2 className="text-sm font-bold font-display text-ink-primary truncate">Recent Vault</h2>
            <p className="text-[10px] text-ink-tertiary mt-0.5">{cards.length} cards saved</p>
          </div>
          {!isRail && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-ink-tertiary hover:text-ink-primary hover:bg-elevated transition-colors shrink-0"
              aria-label="Close vault"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Search */}
        <div className="shrink-0 px-4 py-3 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-tertiary" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search vault..."
              className="w-full bg-elevated border border-border rounded-xl pl-9 pr-3 py-2 text-xs text-ink-primary placeholder:text-ink-tertiary outline-none focus:border-neon-green-border transition-all"
            />
          </div>

          <div className="flex gap-1.5 mt-3">
            {[
              { key: 'all' as VaultFilter, label: `All (${cards.length})` },
              { key: 'due' as VaultFilter, label: `Due (${dueCount})` },
              { key: 'favorites' as VaultFilter, label: `Favs (${favCount})` },
            ].map(f => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={cn(
                  'flex-1 min-w-0 truncate text-[10px] font-medium py-1.5 px-1 rounded-lg transition-all',
                  filter === f.key ? 'bg-neon-green-dim text-neon-green border border-neon-green-border' : 'bg-elevated text-ink-tertiary hover:text-ink-secondary border border-border',
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Cards list */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2.5 scrollbar-none">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-12 px-4">
              <div className="w-12 h-12 rounded-full bg-elevated border border-border flex items-center justify-center mb-3">
                <BookOpen className="w-5 h-5 text-ink-tertiary" />
              </div>
              <p className="text-xs text-ink-secondary font-medium">Vault is empty</p>
              <p className="text-[10px] text-ink-tertiary mt-1">Generate your first mnemonic →</p>
            </div>
          ) : (
            filtered.map(card => {
              const subject = getSubject(card.subject)
              const due = isDue(card)
              const expanded = expandedId === card.id
              const difficulty = difficultyLabel(card.easeFactor)

              return (
                <div
                  key={card.id}
                  className="bg-elevated border border-border rounded-xl overflow-hidden transition-all hover:border-subtle animate-fade-in"
                >
                  <button
                    onClick={() => setExpandedId(expanded ? null : card.id)}
                    aria-expanded={expanded}
                    className="w-full flex items-start gap-2.5 p-3 text-left"
                  >
                    <span className="text-sm shrink-0 mt-0.5">{subject.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-semibold text-ink-primary truncate">{truncate(card.topic, 28)}</p>
                        {due && <span className="w-1.5 h-1.5 rounded-full bg-neon-review shrink-0" title="Due for review" />}
                      </div>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full font-mono" style={{ background: `${subject.accent}1a`, color: subject.accent }}>
                          {subject.label}
                        </span>
                        <span className={cn('text-[9px] px-1.5 py-0.5 rounded-full font-mono border', difficulty.className)}>
                          {difficulty.label}
                        </span>
                        <span className="text-[9px] text-ink-tertiary">{formatRelativeTime(card.nextReview)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={e => { e.stopPropagation(); onToggleFav(card.id) }}
                        className="p-1 rounded-md hover:bg-subtle transition-colors"
                        aria-label="Toggle favorite"
                      >
                        <Star className={cn('w-3.5 h-3.5', card.isFavorite ? 'fill-neon-physio text-neon-physio' : 'text-ink-tertiary')} />
                      </button>
                      <ChevronDown className={cn('w-3.5 h-3.5 text-ink-tertiary transition-transform', expanded && 'rotate-180')} />
                    </div>
                  </button>

                  {expanded && (
                    <div className="px-3 pb-3 pt-1 space-y-3 animate-fade-in border-t border-border">
                      {/* Flip card: front (mnemonic) / back (Anki front+back) */}
                      <FlipPreview card={card} onToggleFav={() => onToggleFav(card.id)} />

                      <div className="flex items-center justify-between text-[9px] text-ink-muted font-mono pt-1">
                        <span>{card.repetitions} review{card.repetitions !== 1 ? 's' : ''} · interval {card.interval}d</span>
                        <button
                          onClick={() => onDelete(card.id)}
                          className="flex items-center gap-1 text-[10px] text-neon-danger hover:bg-neon-danger-dim px-2 py-1 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-3 h-3" /> Delete
                        </button>
                      </div>

                      {onReview && (
                        <div className="pt-1">
                          <p className="text-[9px] font-bold uppercase tracking-widest font-mono text-ink-tertiary mb-1.5">Rate recall to reschedule</p>
                          <div className="flex gap-1.5">
                            {([
                              { q: 2 as ReviewQuality, label: 'Hard', icon: <ThumbsDown className="w-3 h-3" />, active: 'bg-neon-danger-dim border-neon-danger/40 text-neon-danger' },
                              { q: 4 as ReviewQuality, label: 'Good', icon: <Meh className="w-3 h-3" />, active: 'bg-neon-physio-dim border-neon-physio-border text-neon-physio' },
                              { q: 5 as ReviewQuality, label: 'Easy', icon: <ThumbsUp className="w-3 h-3" />, active: 'bg-neon-green-dim border-neon-green-border text-neon-green' },
                            ]).map(opt => (
                              <button
                                key={opt.label}
                                onClick={() => onReview(card.id, opt.q)}
                                className={cn(
                                  'flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[10px] font-medium border',
                                  'transition-all duration-200 active:scale-95',
                                  'bg-card border-border text-ink-tertiary hover:text-ink-secondary hover:border-subtle',
                                )}
                              >
                                {opt.icon} {opt.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </aside>
    </>
  )
}

import PremiumFlashcard from './PremiumFlashcard'

// ── Flip-card preview: front shows the mnemonic, back shows the Anki Q/A ──────
function FlipPreview({ card, onToggleFav }: { card: Flashcard; onToggleFav: () => void }) {
  return (
    <PremiumFlashcard
      card={{
        id: card.id,
        topic: card.topic,
        subject: card.subject,
        mnemonic: {
          mnemonic: card.mnemonic.mnemonic,
          ankiFront: card.mnemonic.ankiFront,
          ankiBack: card.mnemonic.ankiBack,
          explanation: card.mnemonic.explanation,
        }
      }}
      isFavorite={card.isFavorite}
      onToggleFav={onToggleFav}
    />
  )
}