'use client'

import { useState, useMemo } from 'react'
import { Search, Star, X, Trash2, ChevronDown, BookOpen, Target, FileText, Filter, Download } from 'lucide-react'
import { Flashcard, VaultFilter, SubjectId } from '../types'
import { getSubject, SUBJECTS } from '../lib/subjects'
import { formatRelativeTime, truncate, cn } from '../lib/utils'
import { isDue } from '../lib/vault'

interface VaultPanelProps {
  cards: Flashcard[]
  onDelete: (id: string) => void
  onToggleFav: (id: string) => void
  isOpen: boolean
  onClose: () => void
  /** 'drawer' (default) = fixed slide-over used on mobile/tablet.
   *  'rail' = static flex child used on desktop, sized by its parent. */
  variant?: 'drawer' | 'rail'
  filter?: VaultFilter
  onFilterChange?: (filter: VaultFilter) => void
  onQuizFromVault?: (topic: string, subject: SubjectId) => void
  onNotesFromVault?: (topic: string, subject: SubjectId) => void
  onExport?: () => void
}

// Difficulty badge derived from SM-2 ease factor — display only, doesn't affect scheduling.
function difficultyLabel(easeFactor: number): { label: string; className: string } {
  if (easeFactor >= 2.5) return { label: 'Easy', className: 'text-neon-green bg-neon-green/[0.08] border border-neon-green/20' }
  if (easeFactor >= 2.0) return { label: 'Medium', className: 'text-neon-physio bg-neon-physio/[0.08] border border-neon-physio/20' }
  return { label: 'Hard', className: 'text-neon-danger bg-neon-danger/[0.08] border border-neon-danger/20' }
}

export default function VaultPanel({ cards, onDelete, onToggleFav, isOpen, onClose, variant = 'drawer', filter: propFilter, onFilterChange, onQuizFromVault, onNotesFromVault, onExport }: VaultPanelProps) {
  const isRail = variant === 'rail'
  const [localFilter, setLocalFilter] = useState<VaultFilter>('all')
  const filter = propFilter ?? localFilter
  const setFilter = onFilterChange ?? setLocalFilter
  const [search, setSearch] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

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
            ? 'relative w-full bg-surface'
            : cn(
                'fixed top-0 right-0 w-80 max-w-[88vw] z-50 bg-surface/95 backdrop-blur-xl',
                'transition-transform duration-300 ease-out',
                isOpen ? 'translate-x-0' : 'translate-x-full',
              ),
        )}
      >
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between px-4 py-3.5">
          <div className="min-w-0">
            <h2 className="text-sm font-bold font-display text-ink-primary truncate">Vault</h2>
            <p className="text-[10px] text-ink-secondary mt-0.5">{cards.length} cards saved</p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {onExport && cards.length > 0 && (
              <button
                onClick={onExport}
                title="Download Anki CSV"
                className="p-2 rounded-lg text-ink-tertiary hover:text-neon-pharma hover:bg-neon-pharma/8 transition-colors"
                aria-label="Export Anki CSV"
              >
                <Download className="w-4 h-4" />
              </button>
            )}
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
        </div>

        {/* Search */}
        <div className="shrink-0 px-3 py-2.5">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-tertiary" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search vault..."
              className="input-neon w-full bg-surface border-b border-subtle/50 rounded-none pl-8 pr-3 py-2 text-xs text-ink-primary placeholder:text-ink-muted/70 transition-all focus:border-neon-green/40"
            />
          </div>

          <div className="flex gap-1 mt-2">
            {[
              { key: 'all' as VaultFilter, label: `All (${cards.length})` },
              { key: 'favorites' as VaultFilter, label: `Favs (${favCount})` },
            ].map(f => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={cn(
                  'flex-1 min-w-0 truncate text-[9px] font-semibold py-1.5 px-1 rounded-md transition-all duration-200',
                  filter === f.key ? 'bg-neon-green/[0.08] text-neon-green border border-neon-green/25' : 'bg-card/40 border border-transparent text-ink-tertiary hover:text-ink-secondary hover:bg-card/60 hover:border-border/50',
                )}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Subject filter chips */}
          <div className="flex gap-1 mt-1.5 flex-wrap">
            {Array.from(new Set(cards.map(c => c.subject))).map(sid => {
              const s = getSubject(sid)
              const count = cards.filter(c => c.subject === sid).length
              return (
                <button
                  key={sid}
                  onClick={() => setFilter(filter === sid ? 'all' : sid)}
                  className={cn(
                    'text-[8px] font-semibold py-1 px-1.5 rounded-full transition-all duration-200 border',
                    filter === sid
                      ? 'border-neon-green/30 bg-neon-green/10 text-neon-green'
                      : 'border-transparent bg-card/30 text-ink-tertiary hover:text-ink-secondary hover:bg-card/50'
                  )}
                >
                  {s.icon} {s.label} ({count})
                </button>
              )
            })}
          </div>
        </div>

        {/* Cards list */}
        <div className="flex-1 overflow-y-auto px-2.5 py-2.5 space-y-2 scrollbar-none">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-12 px-4">
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-neon-green/5 blur-xl w-12 h-12" />
                <div className="w-12 h-12 rounded-xl bg-card/60 flex items-center justify-center mb-3 relative border border-border/30">
                  <BookOpen className="w-5 h-5 text-ink-secondary" />
                </div>
              </div>
              <p className="text-sm text-ink-primary font-semibold">Vault is empty</p>
              <p className="text-[11px] text-ink-secondary mt-1 max-w-[200px]">Generate your first mnemonic to start building your card library</p>
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
                  className="bg-card rounded-xl shadow-card-sm overflow-hidden transition-all duration-200 hover:shadow-card animate-fade-in border border-border/20"
                >
                  <button
                    onClick={() => setExpandedId(expanded ? null : card.id)}
                    aria-expanded={expanded}
                    className="w-full flex items-start gap-2.5 p-3 text-left"
                  >
                    <span className="text-base shrink-0 mt-0.5">{subject.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-semibold text-ink-primary truncate">{truncate(card.topic, 28)}</p>
                        {due && <span className="w-1.5 h-1.5 rounded-full bg-neon-review shrink-0" title="Due for review" />}
                      </div>
                      <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full font-mono" style={{ background: `${subject.accent}1a`, color: subject.accent }}>
                          {subject.label}
                        </span>
                        <span className={cn('text-[9px] px-1.5 py-0.5 rounded-full font-mono', difficulty.className)}>
                          {difficulty.label}
                        </span>
                        <span className="text-[9px] text-ink-secondary">{formatRelativeTime(card.nextReview)}</span>
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
                    <div className="px-2.5 pb-2.5 pt-1 space-y-2.5 animate-fade-in">
                      {/* Flip card: front (mnemonic) / back (Anki front+back) */}
                      <FlipPreview card={card} onToggleFav={() => onToggleFav(card.id)} />

                      <div className="flex items-center justify-between text-[10px] text-ink-secondary font-mono pt-1">
                        <span>{card.repetitions} review{card.repetitions !== 1 ? 's' : ''} · interval {card.interval}d</span>
                        <button
                          onClick={() => onDelete(card.id)}
                          className="flex items-center gap-1 text-[10px] text-neon-danger hover:bg-neon-danger/10 px-2 py-1 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-3 h-3" /> Delete
                        </button>
                      </div>
                      {/* Quick actions: Quiz + Notes */}
                      {(onQuizFromVault || onNotesFromVault) && (
                        <div className="flex gap-1.5 pt-1">
                          {onQuizFromVault && (
                            <button
                              onClick={() => onQuizFromVault(card.topic, card.subject)}
                              className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[9px] font-bold bg-neon-green/[0.08] border border-neon-green/25 text-neon-green hover:bg-neon-green/[0.14] transition-colors"
                            >
                              <Target className="w-3 h-3" /> Quiz
                            </button>
                          )}
                          {onNotesFromVault && (
                            <button
                              onClick={() => onNotesFromVault(card.topic, card.subject)}
                              className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[9px] font-bold bg-card border border-border/50 text-ink-secondary hover:bg-elevated hover:border-border transition-colors"
                            >
                              <FileText className="w-3 h-3" /> Notes
                            </button>
                          )}
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

// ── Flip-card preview: front = question, back = answer + mnemonic ──────
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
          question: card.mnemonic.question,
          answer: card.mnemonic.answer,
        }
      }}
      isFavorite={card.isFavorite}
      onToggleFav={onToggleFav}
      showMnemonic
    />
  )
}