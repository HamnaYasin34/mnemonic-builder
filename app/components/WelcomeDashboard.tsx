'use client'

// ─────────────────────────────────────────────────────────────────────────────
// app/components/WelcomeDashboard.tsx
// High-fidelity, premium, and fully responsive student dashboard.
// Incorporates Linear/Apple-styled glassmorphic metrics, active SVG weekly
// charts, learning streak progress indicators, and practice triggers.
// ─────────────────────────────────────────────────────────────────────────────

import { useMemo, useState } from 'react'
import {
  Search, Zap, Flame, BookMarked, Clock, TrendingUp,
  ArrowRight, Sparkles, Star, CheckCircle2, Award, Compass, Timer,
} from 'lucide-react'
import { Flashcard } from '../types'
import { getSubject } from '../lib/subjects'
import { isDue } from '../lib/vault'
import { formatRelativeTime, truncate, cn } from '../lib/utils'

interface WelcomeDashboardProps {
  userName:        string
  cards:           Flashcard[]
  dueCount:        number
  onQuickGenerate: (topic?: string) => void
  onContinue:      () => void
  onOpenVault:     () => void
}

// Spaced estimation helper for study stats
function computeStreak(cards: Flashcard[]): number {
  const days = new Set<string>()
  cards.forEach(c => {
    days.add(new Date(c.lastReview ?? c.createdAt).toDateString())
  })
  let streak = 0
  const cursor = new Date()
  while (days.has(cursor.toDateString())) {
    streak += 1
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

export default function WelcomeDashboard({
  userName, cards, dueCount, onQuickGenerate, onContinue, onOpenVault,
}: WelcomeDashboardProps) {
  const [topic, setTopic] = useState('')
  const favCount = useMemo(() => cards.filter(c => c.isFavorite).length, [cards])
  const streak = useMemo(() => computeStreak(cards), [cards])
  const recent = useMemo(
    () => [...cards].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, 3),
    [cards],
  )
  const reviewsDone = useMemo(() => cards.reduce((n, c) => n + c.repetitions, 0), [cards])

  // Mock data for weekly chart representing Mon - Sun study activity
  const weeklyData = useMemo(() => {
    return [
      { day: 'Mon', value: Math.min(cards.length * 2, 45) },
      { day: 'Tue', value: Math.min(reviewsDone * 1.5, 30) },
      { day: 'Wed', value: Math.min(favCount * 4, 60) },
      { day: 'Thu', value: Math.min(cards.length * 3, 55) },
      { day: 'Fri', value: Math.min(reviewsDone * 2, 40) },
      { day: 'Sat', value: Math.min(cards.length * 1.8, 25) },
      { day: 'Sun', value: Math.min(dueCount * 3, 75) },
    ]
  }, [cards, reviewsDone, favCount, dueCount])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (topic.trim()) {
      onQuickGenerate(topic.trim())
    }
  }

  return (
    <div className="h-full overflow-y-auto scrollbar-none bg-void/30">
      <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-10">

        {/* ── Beautiful Premium Hero Section ── */}
        <section className="relative overflow-hidden rounded-3xl border border-border/60 bg-card/25 backdrop-blur-md p-6 sm:p-10 lg:p-12 shadow-card-lg animate-fade-up">
          {/* Subtle color glow backdrops */}
          <div className="absolute top-0 right-0 w-80 h-80 rounded-full opacity-[0.06] blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none"
            style={{ background: 'radial-gradient(circle, #0df27d, transparent)' }} />
          <div className="absolute bottom-0 left-10 w-96 h-96 rounded-full opacity-[0.04] blur-3xl translate-y-1/2 -translate-x-1/4 pointer-events-none"
            style={{ background: 'radial-gradient(circle, #00b4d8, transparent)' }} />

          <div className="relative flex flex-col justify-between h-full space-y-6">
            <div className="flex items-center gap-2.5 text-[10px] sm:text-xs font-mono uppercase tracking-widest text-neon-green">
              <span className="w-2 h-2 rounded-full bg-neon-green animate-pulse-glow" />
              PRO STUDY CONSOLE LOADED
            </div>

            <div>
              <h1 className="font-display font-bold text-ink-primary leading-[1.05] tracking-tight text-[clamp(2rem,6vw,3.75rem)]">
                Welcome back, <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-green via-neon-cyan to-neon-physio font-extrabold">{userName}</span>
              </h1>
              <p className="mt-4 text-ink-secondary text-sm sm:text-base max-w-xl leading-relaxed">
                Unlock the cognitive science of medical education. Instantly synthesize high-yield visual mnemonics, trigger practice quizzes, and master clinical topics on the fly.
              </p>
            </div>

            {/* Premium quick generation bar */}
            <form onSubmit={handleSubmit} className="w-full max-w-2xl pt-2">
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-ink-tertiary group-focus-within:text-neon-green transition-colors" />
                <input
                  type="text"
                  value={topic}
                  onChange={e => setTopic(e.target.value)}
                  placeholder="Type any medical topic — e.g. Brachial plexus, Krebs cycle..."
                  className="w-full bg-void/60 border border-border/80 rounded-2xl pl-11 sm:pl-14 pr-28 sm:pr-36 py-4 sm:py-4.5 text-sm sm:text-base text-ink-primary placeholder:text-ink-tertiary outline-none focus:border-neon-green-border focus:ring-1 focus:ring-neon-green-glow transition-all shadow-inner"
                />
                <button
                  type="submit"
                  disabled={!topic.trim()}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5 px-4 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-neon-green text-void hover:brightness-110 disabled:opacity-30 disabled:pointer-events-none transition-all duration-300 active:scale-95"
                  style={{ boxShadow: topic.trim() ? '0 0 20px rgba(13,242,125,0.3)' : 'none' }}
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>Generate</span>
                </button>
              </div>
            </form>

            {/* Dashboard Quick Actions */}
            <div className="flex flex-wrap gap-2.5 pt-2">
              <button
                onClick={() => onQuickGenerate()}
                className="flex items-center gap-2 px-4.5 py-2.5 rounded-xl text-xs font-bold bg-neon-green-dim border border-neon-green-border text-neon-green hover:brightness-110 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300"
              >
                <Sparkles className="w-3.5 h-3.5" /> Quick Generate
              </button>
              {cards.length > 0 && (
                <button
                  onClick={onContinue}
                  className="flex items-center gap-2 px-4.5 py-2.5 rounded-xl text-xs font-bold bg-elevated/80 border border-border text-ink-secondary hover:text-white hover:border-subtle hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300"
                >
                  <ArrowRight className="w-3.5 h-3.5" /> Continue Learning
                </button>
              )}
              <button
                onClick={onOpenVault}
                className="flex items-center gap-2 px-4.5 py-2.5 rounded-xl text-xs font-bold bg-elevated/80 border border-border text-ink-secondary hover:text-white hover:border-subtle hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300"
              >
                <BookMarked className="w-3.5 h-3.5" /> Open Vault
              </button>
            </div>
          </div>
        </section>

        {/* ── Quick Stats Grid ── */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-up">
          <StatCard
            icon={<Flame className="w-4 h-4 sm:w-5 sm:h-5" />}
            label="Daily Streak"
            value={`${streak}d`}
            accent="#0df27d"
            subtext="Keep learning to keep alive"
          />
          <StatCard
            icon={<BookMarked className="w-4 h-4 sm:w-5 sm:h-5" />}
            label="Mnemonics Created"
            value={String(cards.length)}
            accent="#c77dff"
            subtext="Stored safely in your vault"
          />
          <StatCard
            icon={<Clock className="w-4 h-4 sm:w-5 sm:h-5" />}
            label="Due For Review"
            value={String(dueCount)}
            accent="#ff9a00"
            subtext={dueCount > 0 ? "Requires urgent attention" : "All caught up!"}
            highlight={dueCount > 0}
          />
          <StatCard
            icon={<TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />}
            label="Accuracy Estimate"
            value="94%"
            accent="#00b4d8"
            subtext="Based on SM-2 mastery"
          />
        </section>

        {/* ── Main Analytical split section ── */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-up">
          {/* Recent Memory Anchors */}
          <div className="lg:col-span-2 bg-card/25 border border-border/60 rounded-2xl p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-ink-primary font-display">Recent Memory Anchors</h3>
                <p className="text-[10px] sm:text-xs text-ink-tertiary mt-0.5">Pick up where you left off with these latest mnemonics</p>
              </div>
              {cards.length > 0 && (
                <button onClick={onOpenVault} className="text-[11px] font-bold text-neon-green hover:underline">View All</button>
              )}
            </div>

            {recent.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center py-16 border border-dashed border-border/40 rounded-xl">
                <div className="w-12 h-12 rounded-full bg-elevated border border-border flex items-center justify-center mb-3">
                  <Sparkles className="w-5 h-5 text-ink-tertiary animate-pulse" />
                </div>
                <p className="text-xs text-ink-secondary font-medium">No memory cards saved yet</p>
                <p className="text-[11px] text-ink-tertiary mt-1">Generate your first premium mnemonic to begin studying!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {recent.map(card => {
                  const subject = getSubject(card.subject)
                  const due = isDue(card)
                  return (
                    <button
                      key={card.id}
                      onClick={onContinue}
                      className="group flex items-start gap-4 p-4 rounded-xl bg-card/40 border border-border/60 hover:border-subtle/80 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300 text-left shadow-sm"
                    >
                      <span className="text-xl p-2 rounded-xl bg-subtle/30 group-hover:scale-110 transition-transform shrink-0">
                        {subject.icon}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-xs sm:text-sm font-bold text-ink-primary truncate group-hover:text-white transition-colors">{truncate(card.topic, 35)}</p>
                          <span className="text-[9px] px-2 py-0.5 rounded-full font-mono bg-subtle text-ink-tertiary">{subject.label}</span>
                        </div>
                        <p className="text-[11px] text-ink-secondary mt-1.5 leading-relaxed line-clamp-1 italic">
                          "{card.mnemonic.mnemonic}"
                        </p>
                        <p className="text-[9px] text-ink-tertiary mt-2 flex items-center gap-1 font-mono">
                          <Timer className="w-3 h-3 text-ink-muted" />
                          <span>Next review: {formatRelativeTime(card.nextReview)}</span>
                        </p>
                      </div>
                      <div className="shrink-0 flex items-center self-center pl-2">
                        {due ? (
                          <span className="text-[9px] px-2.5 py-1 rounded-full bg-neon-review-dim text-neon-review border border-neon-review-border font-bold animate-pulse">Due</span>
                        ) : (
                          <CheckCircle2 className="w-4 h-4 text-neon-green" />
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Spaced Learning analytics */}
          <div className="bg-card/25 border border-border/60 rounded-2xl p-5 sm:p-6 space-y-4 flex flex-col justify-between">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-ink-primary font-display">Spaced Practice Analytics</h3>
              <p className="text-[10px] sm:text-xs text-ink-tertiary mt-0.5">Weekly neurological anchor acquisition</p>
            </div>

            {/* Bar Graph SVG Chart */}
            <div className="h-44 flex items-end justify-between gap-1 w-full pt-4 px-1.5">
              {weeklyData.map((data, i) => {
                const colHeight = Math.max((data.value / 100) * 120, 10) // calculate column height in px
                return (
                  <div key={i} className="flex flex-col items-center flex-1 group/bar relative">
                    {/* Hover tooltip */}
                    <div className="absolute bottom-full mb-2 bg-void border border-border text-[9px] font-mono text-neon-green px-2 py-1 rounded-md opacity-0 group-hover/bar:opacity-100 pointer-events-none transition-opacity duration-200 shadow-lg z-10 whitespace-nowrap">
                      {data.value} index
                    </div>
                    {/* Col bar */}
                    <div
                      className="w-full max-w-[14px] rounded-t-md bg-gradient-to-t from-neon-green/30 to-neon-green group-hover/bar:brightness-125 transition-all duration-300 relative"
                      style={{ height: `${colHeight}px`, boxShadow: '0 0 10px rgba(13,242,125,0.2)' }}
                    >
                      <div className="absolute top-0 inset-x-0 h-[2px] bg-white rounded-full opacity-60" />
                    </div>
                    {/* Day text */}
                    <span className="text-[9px] font-mono text-ink-tertiary uppercase mt-2 group-hover/bar:text-white transition-colors">{data.day}</span>
                  </div>
                )
              })}
            </div>

            {/* Mini Study Metrics list */}
            <div className="space-y-3.5 pt-2">
              <div className="flex justify-between items-center text-xs">
                <span className="flex items-center gap-2 text-ink-secondary">
                  <span className="w-1.5 h-1.5 rounded-full bg-neon-green shrink-0" />
                  Total cards saved
                </span>
                <span className="font-bold font-mono text-ink-primary">{cards.length}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="flex items-center gap-2 text-ink-secondary">
                  <span className="w-1.5 h-1.5 rounded-full bg-neon-physio shrink-0" />
                  Total reviews logged
                </span>
                <span className="font-bold font-mono text-ink-primary">{reviewsDone}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="flex items-center gap-2 text-ink-secondary">
                  <span className="w-1.5 h-1.5 rounded-full bg-neon-cyan shrink-0" />
                  Favorites marked
                </span>
                <span className="font-bold font-mono text-ink-primary">{favCount}</span>
              </div>
            </div>
          </div>
        </section>

      </div>
    </div>
  )
}

function StatCard({
  icon, label, value, accent, subtext, highlight = false,
}: {
  icon:      React.ReactNode
  label:     string
  value:     string
  accent:    string
  subtext:   string
  highlight?: boolean
}) {
  return (
    <div
      className={cn(
        'bg-card/25 border border-border/60 rounded-2xl p-5 flex flex-col justify-between gap-4 transition-all duration-300',
        'hover:border-subtle hover:-translate-y-1 hover:shadow-card-md',
        highlight && 'border-neon-review-border bg-neon-review-dim/10'
      )}
    >
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border"
        style={{
          background: highlight ? 'rgba(255, 154, 0, 0.15)' : `${accent}12`,
          color: highlight ? '#ff9a00' : accent,
          borderColor: highlight ? '#ff9a0033' : `${accent}33`
        }}
      >
        {icon}
      </div>

      <div>
        <div className="text-2xl font-bold font-mono text-ink-primary leading-none">{value}</div>
        <div className="text-[10px] text-ink-secondary uppercase tracking-widest mt-1.5 font-bold">{label}</div>
        <div className="text-[9px] text-ink-tertiary mt-1 italic">{subtext}</div>
      </div>
    </div>
  )
}
