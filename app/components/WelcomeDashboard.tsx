'use client'

// ─────────────────────────────────────────────────────────────────────────────
// app/components/WelcomeDashboard.tsx
// Spatial composition dashboard — 3D hero, asymmetric metrics, activity feed,
// and differentiated practice tiles. No card grids, no boxed metrics.
// ─────────────────────────────────────────────────────────────────────────────

import { useMemo, useState, useEffect, useRef } from 'react'
import {
  Search, Zap, ArrowRight, Sparkles,
  CheckCircle2, Timer, Target, Stethoscope,
  FlaskConical, Layers, Download,
} from 'lucide-react'
import { Flashcard } from '../types'
import { getSubject } from '../lib/subjects'
import { isDue } from '../lib/vault'
import { formatRelativeTime, truncate, cn } from '../lib/utils'
import Logo from './Logo'

/* ── Animated counter — counts up when first visible ─────────────────────── */
function AnimatedCounter({ target, duration = 1200 }: { target: number; duration?: number }) {
  const [count, setCount] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)
  const hasAnimated = useRef(false)

  useEffect(() => {
    const el = ref.current
    if (!el || hasAnimated.current) return
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true
          const start = performance.now()
          const step = (now: number) => {
            const progress = Math.min((now - start) / duration, 1)
            // Ease-out cubic
            const eased = 1 - Math.pow(1 - progress, 3)
            setCount(Math.round(eased * target))
            if (progress < 1) requestAnimationFrame(step)
          }
          requestAnimationFrame(step)
          obs.unobserve(el)
        }
      },
      { threshold: 0.3 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [target, duration])

  return <span ref={ref}>{count}</span>
}

/* ── Scroll-reveal hook ───────────────────────────────────────────────────── */
function useScrollReveal() {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.style.opacity = '1'
          el.style.transform = 'translateY(0)'
          obs.unobserve(el)
        }
      },
      { threshold: 0.12 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])
  return ref
}

function RevealSection({ children, className, delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = useScrollReveal()
  return (
    <div ref={ref} className={className}
      style={{ opacity: 0, transform: 'translateY(24px)', transition: `opacity 0.6s ease-out ${delay}s, transform 0.6s ease-out ${delay}s` }}>
      {children}
    </div>
  )
}

interface WelcomeDashboardProps {
  userName:        string
  cards:           Flashcard[]
  dueCount:        number
  onQuickGenerate: (topic?: string) => void
  onContinue:      () => void
  onOpenVault:     () => void
  onExport?:       () => void
  profileComplete?: boolean
  onCompleteProfile?: () => void
}

function computeStreak(cards: Flashcard[]): number {
  const days = new Set<string>()
  cards.forEach(c => { days.add(new Date(c.lastReview ?? c.createdAt).toDateString()) })
  let streak = 0
  const cursor = new Date()
  while (days.has(cursor.toDateString())) { streak += 1; cursor.setDate(cursor.getDate() - 1) }
  return streak
}

function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'GOOD MORNING'
  if (h < 17) return 'GOOD AFTERNOON'
  return 'GOOD EVENING'
}

export default function WelcomeDashboard({
  userName, cards, dueCount, onQuickGenerate, onContinue, onOpenVault, onExport,
  profileComplete = true, onCompleteProfile,
}: WelcomeDashboardProps) {
  const [topic, setTopic] = useState('')
  const favCount = useMemo(() => cards.filter(c => c.isFavorite).length, [cards])
  const streak = useMemo(() => computeStreak(cards), [cards])
  const recent = useMemo(
    () => [...cards].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, 5),
    [cards],
  )
  const reviewsDone = useMemo(() => cards.reduce((n, c) => n + c.repetitions, 0), [cards])
  const latestCard = recent.length > 0 ? recent[0] : null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (topic.trim()) onQuickGenerate(topic.trim())
  }

  return (
    <div className="h-full overflow-y-auto scrollbar-none">
      <div className="w-full max-w-5xl mx-auto px-6 lg:px-10 py-8 sm:py-12 space-y-16">

        {/* ── HERO ── */}
        <section className="relative" style={{ animation: 'fade-in-up 0.6s ease-out both' }}>
          <div className="max-w-xl space-y-5">
              {/* Logo + greeting row */}
              <div className="flex items-center gap-3">
                <Logo showText={false} size="sm" />
                <p className="text-[11px] font-bold font-mono uppercase tracking-[0.18em] text-ink-secondary">
                  {getGreeting()}, {userName}
                </p>
              </div>

              <h1 className="font-display font-extrabold text-ink-primary leading-[1.05] tracking-tight text-[clamp(2rem,5vw,3.25rem)]" style={{ animation: 'fade-in-up 0.5s ease-out 0.15s both' }}>
                Master what{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-green to-neon-cyan/80">
                  you learn.
                </span>
              </h1>

              <p className="text-ink-secondary text-[13px] max-w-md leading-relaxed" style={{ animation: 'fade-in-up 0.5s ease-out 0.25s both' }}>
                AI-generated mnemonics, visual stories, and Anki flashcards for every medical subject.
              </p>

              {!profileComplete && (
                <button onClick={onCompleteProfile}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-neon-physio/[0.08] border border-neon-physio/20 text-neon-physio text-xs font-bold hover:bg-neon-physio/[0.14] transition-all duration-200 active:scale-95">
                  <span className="w-1.5 h-1.5 rounded-full bg-neon-physio" />
                  Complete Your Profile
                </button>
              )}

              <div className="flex flex-wrap gap-2.5 pt-2" style={{ animation: 'fade-in-up 0.5s ease-out 0.35s both' }}>
                <button type="button" onClick={() => onQuickGenerate()}
                  className="flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-bold bg-neon-green text-[#050505] hover:brightness-110 transition-all duration-200 active:scale-[0.97]">
                  <Zap className="w-4 h-4" /> Generate Mnemonic
                </button>
                {cards.length > 0 && (
                  <button onClick={onContinue}
                    className="glow-btn-soft flex items-center gap-2 px-4 py-3 rounded-xl text-xs font-semibold text-ink-secondary hover:text-ink-primary bg-elevated/40 hover:bg-elevated/60 border border-border/40">
                    <ArrowRight className="w-3.5 h-3.5" /> Continue Learning
                  </button>
                )}
                {cards.length > 0 && onExport && (
                  <button onClick={onExport}
                    className="glow-btn-soft flex items-center gap-2 px-4 py-3 rounded-xl text-xs font-semibold text-ink-tertiary hover:text-ink-secondary hover:bg-elevated/40 border border-border/30">
                    <Download className="w-3.5 h-3.5" /> Anki Export
                  </button>
                )}
              </div>
          </div>
        </section>

        {/* ── QUICK TOPIC — minimal input, no border ── */}
        <div>
          <form onSubmit={handleSubmit} className="max-w-xl">
            <div className="relative group">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-tertiary group-focus-within:text-neon-green transition-colors" />
              <input
                type="text"
                value={topic}
                onChange={e => setTopic(e.target.value)}
                placeholder="What do you want to remember?"
                className="w-full bg-transparent border-b border-subtle/50 pl-10 pr-28 py-3.5 text-sm text-ink-primary placeholder:text-ink-muted/80 outline-none focus:border-neon-green/50 transition-all duration-300 input-focus-glow"
              />
              <button type="submit" disabled={!topic.trim()}
                className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold bg-neon-green text-[#050505] hover:brightness-110 transition-all duration-200 active:scale-[0.97] disabled:opacity-20 disabled:pointer-events-none">
                <Zap className="w-3.5 h-3.5" />
                <span>Generate</span>
              </button>
            </div>
          </form>
        </div>

        {/* ── CONTINUE LEARNING — immersive single block ── */}
        {latestCard && (
          <RevealSection delay={0.1}>
            <p className="text-[10px] font-bold font-mono uppercase tracking-[0.18em] text-ink-tertiary mb-5">Continue Learning</p>
            <button onClick={onContinue}
              className="group w-full flex items-center gap-6 p-6 rounded-xl bg-card/60 hover:bg-elevated/40 transition-all duration-200 text-left depth-card border border-border/30">
              <span className="text-4xl p-3 rounded-xl bg-surface/80 group-hover:scale-105 transition-transform shrink-0">
                {getSubject(latestCard.subject).icon}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-lg font-bold text-ink-primary truncate group-hover:text-white transition-colors">
                  {truncate(latestCard.topic, 50)}
                </p>
                <p className="text-xs text-ink-secondary mt-1 truncate">
                  {getSubject(latestCard.subject).label}
                </p>
              </div>
              <ArrowRight className="w-5 h-5 text-ink-secondary group-hover:text-neon-green group-hover:translate-x-1 transition-all shrink-0" />
            </button>
          </RevealSection>
        )}

        {/* ── LEARNING INTELLIGENCE — asymmetric typography, no cards ── */}
        <RevealSection delay={0.1}>
          <p className="text-[10px] font-bold font-mono uppercase tracking-[0.18em] text-ink-tertiary mb-8">Learning Intelligence</p>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
            <div>
              <div className="text-3xl lg:text-4xl font-extrabold font-mono text-ink-primary leading-none"><AnimatedCounter target={cards.length} /></div>
              <div className="text-[10px] text-ink-secondary uppercase tracking-widest font-bold mt-2">Memories</div>
            </div>
            <div>
              <div className={cn('text-3xl lg:text-4xl font-extrabold font-mono leading-none', dueCount > 0 ? 'text-neon-review' : 'text-ink-primary')}><AnimatedCounter target={dueCount} /></div>
              <div className="text-[10px] text-ink-secondary uppercase tracking-widest font-bold mt-2">Due</div>
            </div>
            <div>
              <div className="text-3xl lg:text-4xl font-extrabold font-mono text-ink-primary leading-none"><AnimatedCounter target={streak} /></div>
              <div className="text-[10px] text-ink-secondary uppercase tracking-widest font-bold mt-2">Day Streak</div>
            </div>
            <div>
              <div className="text-3xl lg:text-4xl font-extrabold font-mono text-ink-primary leading-none"><AnimatedCounter target={reviewsDone} /></div>
              <div className="text-[10px] text-ink-secondary uppercase tracking-widest font-bold mt-2">Reviews</div>
            </div>
          </div>
        </RevealSection>

        {/* ── RECENT ACTIVITY — clean row feed ── */}
        <RevealSection delay={0.1}>
          <div className="flex items-center justify-between mb-5">
            <p className="text-[10px] font-bold font-mono uppercase tracking-[0.18em] text-ink-tertiary">Recent Activity</p>
            {cards.length > 0 && (
              <button onClick={onOpenVault} className="text-[11px] font-bold text-neon-green hover:underline">View All</button>
            )}
          </div>

          {recent.length === 0 ? (
            <div className="view-empty py-20">
              <div className="w-14 h-14 rounded-2xl bg-card/60 flex items-center justify-center mb-4">
                <Sparkles className="w-6 h-6 text-ink-secondary" />
              </div>
              <p className="text-sm text-ink-primary font-semibold">Your memory vault is empty.</p>
              <p className="text-[11px] text-ink-secondary mt-1.5 leading-relaxed max-w-xs">
                Start building your first memory artifact.
              </p>
              <button type="button" onClick={() => onQuickGenerate()}
                className="mt-4 flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-[11px] font-bold bg-neon-green text-[#050505] hover:brightness-110 transition-all duration-200 active:scale-[0.97]">
                <Sparkles className="w-3 h-3" /> Generate Mnemonic
              </button>
            </div>
          ) : (
            <div className="divide-y divide-border/40">
              {recent.map(card => {
                const subject = getSubject(card.subject)
                const due = isDue(card)
                return (
                  <button key={card.id} onClick={onContinue}
                    className="group w-full flex items-center gap-4 py-4 hover:translate-x-1 transition-all duration-200 text-left">
                    <span className="text-lg shrink-0">{subject.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-xs sm:text-sm font-semibold text-ink-primary truncate group-hover:text-white transition-colors">
                          {truncate(card.topic, 40)}
                        </p>
                        <span className="text-[9px] px-2 py-0.5 rounded-full font-mono font-bold uppercase tracking-wider shrink-0"
                          style={{ backgroundColor: `${subject.accent}15`, color: subject.accent }}>
                          {subject.label}
                        </span>
                      </div>
                      <p className="text-[10px] text-ink-secondary mt-1 font-mono flex items-center gap-1">
                        <Timer className="w-3 h-3" /> {formatRelativeTime(card.nextReview)}
                      </p>
                    </div>
                    {due ? (
                      <span className="text-[9px] px-2 py-1 rounded-full bg-neon-review/10 text-neon-review border border-neon-review/20 font-bold">Due</span>
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-ink-secondary" />
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </RevealSection>

        {/* ── PRACTICE — interactive tiles with depth ── */}
        <RevealSection delay={0.15} className="pb-8">
          <p className="text-[10px] font-bold font-mono uppercase tracking-[0.18em] text-ink-tertiary mb-5">Practice</p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <PracticeTile icon={Target} label="Quiz Arena" desc="Test recall" />
            <PracticeTile icon={Stethoscope} label="AI Examiner" desc="Clinical viva" />
            <PracticeTile icon={FlaskConical} label="Simulation" desc="Clinical cases" />
            <PracticeTile icon={Layers} label="Flashcards" desc="Spaced review" />
          </div>
        </RevealSection>

      </div>
    </div>
  )
}

// ── Practice tile — subtle lift + shadow ────────────────────────────────────────
function PracticeTile({
  icon: Icon, label, desc,
}: {
  icon: typeof Target
  label: string
  desc: string
}) {
  return (
    <div className="card-hover-glow group relative p-5 rounded-xl bg-card/50 cursor-pointer border border-border/30 overflow-hidden">
      <div className="relative z-10">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 bg-subtle/40 text-ink-secondary group-hover:text-neon-green group-hover:scale-110 transition-all duration-300">
          <Icon className="w-4.5 h-4.5" />
        </div>
        <p className="text-xs font-bold text-ink-primary">{label}</p>
        <p className="text-[10px] text-ink-secondary mt-0.5">{desc}</p>
      </div>
    </div>
  )
}
