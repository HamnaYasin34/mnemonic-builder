'use client'

// ─────────────────────────────────────────────────────────────────────────────
// app/landing/page.tsx — Premium public landing page
// Cinematic medical AI landing with knowledge network, ECG, DNA, features, CTA
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import {
  Zap, Brain, Download, Stethoscope,
  FlaskConical, BookOpen, ArrowRight, Sparkles, Target,
  Layers, Check,
} from 'lucide-react'
import Logo from '../components/Logo'

/* ── Scroll reveal ──────────────────────────────────────────────────────────── */
function useReveal() {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { el.style.opacity = '1'; el.style.transform = 'translateY(0)'; obs.unobserve(el) } },
      { threshold: 0.1 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])
  return ref
}

function Reveal({ children, className = '', delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = useReveal()
  return (
    <div ref={ref} className={className}
      style={{ opacity: 0, transform: 'translateY(28px)', transition: `opacity 0.7s ease-out ${delay}s, transform 0.7s ease-out ${delay}s` }}>
      {children}
    </div>
  )
}

/* ── Knowledge Network SVG ──────────────────────────────────────────────────── */
function KnowledgeNetwork() {
  return (
    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 500" fill="none" aria-hidden="true">
      <line x1="100" y1="250" x2="250" y2="140" stroke="rgba(13,242,125,0.12)" strokeWidth="1" strokeDasharray="6 6" className="knowledge-connection" />
      <line x1="250" y1="140" x2="400" y2="280" stroke="rgba(34,211,238,0.10)" strokeWidth="1" strokeDasharray="6 6" className="knowledge-connection" style={{ animationDelay: '0.5s' }} />
      <line x1="400" y1="280" x2="560" y2="160" stroke="rgba(13,242,125,0.12)" strokeWidth="1" strokeDasharray="6 6" className="knowledge-connection" style={{ animationDelay: '1s' }} />
      <line x1="560" y1="160" x2="700" y2="240" stroke="rgba(124,92,252,0.10)" strokeWidth="1" strokeDasharray="6 6" className="knowledge-connection" style={{ animationDelay: '1.5s' }} />
      <line x1="250" y1="140" x2="400" y2="80" stroke="rgba(13,242,125,0.08)" strokeWidth="0.8" strokeDasharray="4 8" className="knowledge-connection" style={{ animationDelay: '2s' }} />
      <line x1="560" y1="160" x2="650" y2="360" stroke="rgba(34,211,238,0.08)" strokeWidth="0.8" strokeDasharray="4 8" className="knowledge-connection" style={{ animationDelay: '2.5s' }} />
      <line x1="100" y1="250" x2="200" y2="380" stroke="rgba(124,92,252,0.08)" strokeWidth="0.8" strokeDasharray="4 8" className="knowledge-connection" style={{ animationDelay: '0.8s' }} />
      <line x1="400" y1="280" x2="350" y2="400" stroke="rgba(13,242,125,0.06)" strokeWidth="0.8" strokeDasharray="4 8" className="knowledge-connection" style={{ animationDelay: '1.8s' }} />
      <circle cx="100" cy="250" r="4" fill="rgba(13,242,125,0.5)" className="knowledge-node" />
      <circle cx="250" cy="140" r="5" fill="rgba(34,211,238,0.5)" className="knowledge-node" style={{ animationDelay: '0.8s' }} />
      <circle cx="400" cy="280" r="4" fill="rgba(13,242,125,0.5)" className="knowledge-node" style={{ animationDelay: '1.6s' }} />
      <circle cx="560" cy="160" r="5" fill="rgba(124,92,252,0.5)" className="knowledge-node" style={{ animationDelay: '2.4s' }} />
      <circle cx="700" cy="240" r="4" fill="rgba(13,242,125,0.5)" className="knowledge-node" style={{ animationDelay: '3.2s' }} />
      <circle cx="400" cy="80" r="3" fill="rgba(34,211,238,0.3)" className="knowledge-node" style={{ animationDelay: '1.2s' }} />
      <circle cx="650" cy="360" r="3" fill="rgba(13,242,125,0.3)" className="knowledge-node" style={{ animationDelay: '2s' }} />
      <circle cx="200" cy="380" r="3" fill="rgba(124,92,252,0.3)" className="knowledge-node" style={{ animationDelay: '0.4s' }} />
      <circle cx="350" cy="400" r="3" fill="rgba(34,211,238,0.25)" className="knowledge-node" style={{ animationDelay: '2.8s' }} />
      <circle cx="250" cy="140" r="16" fill="rgba(34,211,238,0.04)" className="knowledge-node" style={{ animationDelay: '0.8s' }} />
      <circle cx="560" cy="160" r="16" fill="rgba(124,92,252,0.04)" className="knowledge-node" style={{ animationDelay: '2.4s' }} />
      <circle cx="400" cy="280" r="14" fill="rgba(13,242,125,0.03)" className="knowledge-node" style={{ animationDelay: '1.6s' }} />
    </svg>
  )
}

/* ── ECG Waveform ───────────────────────────────────────────────────────────── */
function ECGWaveform() {
  const pattern = "M0 50 L150 50 L170 50 L180 15 L190 85 L200 30 L210 70 L220 50 L400 50 L420 50 L430 15 L440 85 L450 30 L460 70 L470 50 L650 50 L670 50 L680 15 L690 85 L700 30 L710 70 L720 50 L900 50"
  return (
    <div className="absolute bottom-0 left-0 w-full h-20 overflow-hidden opacity-[0.06]" aria-hidden="true">
      <svg className="w-[200%] h-full" viewBox="0 0 900 100" preserveAspectRatio="none" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d={pattern} className="text-neon-green ecg-animate" />
      </svg>
    </div>
  )
}

/* ── Floating Medical Elements ──────────────────────────────────────────────── */
function MedicalFloats() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <svg className="absolute top-[15%] right-[8%] w-7 h-14 text-neon-cyan/[0.05]" style={{ animation: 'float-drift 12s ease-in-out infinite' }} viewBox="0 0 24 40" fill="none" stroke="currentColor" strokeWidth="0.8">
        <path d="M6 0c0 8 12 8 12 16s-12 8-12 16" /><path d="M18 0c0 8-12 8-12 16s12 8 12 16"/>
        <line x1="8" y1="6" x2="16" y2="6" /><line x1="8" y1="14" x2="16" y2="14"/><line x1="8" y1="22" x2="16" y2="22"/>
      </svg>
      <svg className="absolute bottom-[30%] left-[5%] w-10 h-10 text-neon-green/[0.04]" style={{ animation: 'float-drift-reverse 10s ease-in-out infinite 2s' }} viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="0.8">
        <circle cx="20" cy="20" r="4" /><circle cx="8" cy="8" r="2.5" /><circle cx="32" cy="8" r="2.5" /><circle cx="8" cy="32" r="2.5" /><circle cx="32" cy="32" r="2.5" />
        <line x1="17" y1="17" x2="10" y2="10" /><line x1="23" y1="17" x2="30" y2="10" /><line x1="17" y1="23" x2="10" y2="30" /><line x1="23" y1="23" x2="30" y2="30" />
      </svg>
      <svg className="absolute top-[25%] left-[10%] w-8 h-8 text-neon-green/[0.04]" style={{ animation: 'float-drift 9s ease-in-out infinite 1s' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
        <path d="M12 2a5 5 0 0 1 4.5 2.8A4 4 0 0 1 20 9a4 4 0 0 1-1.5 3.1A5 5 0 0 1 12 22a5 5 0 0 1-6.5-9.9A4 4 0 0 1 4 9a4 4 0 0 1 3.5-4.2A5 5 0 0 1 12 2z"/><path d="M12 2v20"/>
      </svg>
      <svg className="absolute bottom-[20%] right-[12%] w-5 h-9 text-neon-biochem/[0.04]" style={{ animation: 'float-drift-reverse 8s ease-in-out infinite 3s' }} viewBox="0 0 16 28" fill="none" stroke="currentColor" strokeWidth="1">
        <rect x="2" y="2" width="12" height="24" rx="6"/><line x1="2" y1="14" x2="14" y2="14"/>
      </svg>
    </div>
  )
}

/* ── Data ───────────────────────────────────────────────────────────────────── */
const FEATURES = [
  { icon: Brain, title: 'Story-Based Mnemonics', desc: 'AI crafts vivid narratives that link medical concepts to unforgettable visual stories.', color: 'text-neon-green' },
  { icon: Sparkles, title: 'Visual Memory Anchors', desc: 'AI-generated images create powerful dual-coding reinforcement for every concept.', color: 'text-neon-cyan' },
  { icon: Target, title: 'Adaptive Retrieval Tests', desc: 'Smart quizzes that target your weak spots using spaced repetition algorithms.', color: 'text-neon-physio' },
  { icon: Stethoscope, title: 'AI Clinical Examiner', desc: 'Practice clinical viva with an AI that asks follow-up questions like a real examiner.', color: 'text-neon-review' },
  { icon: FlaskConical, title: 'Clinical Simulations', desc: 'Work through realistic patient cases and build diagnostic reasoning skills.', color: 'text-neon-biochem' },
  { icon: Download, title: 'Anki Export', desc: 'Seamlessly export your flashcards to Anki for cross-platform spaced repetition.', color: 'text-neon-green' },
]

const STEPS = [
  { num: '01', title: 'Enter a Topic', desc: 'Type any medical concept \u2014 from cranial nerves to drug mechanisms.' },
  { num: '02', title: 'AI Generates', desc: 'Our AI crafts a story mnemonic, visual anchor, and flashcards in seconds.' },
  { num: '03', title: 'Learn & Recall', desc: 'Study with spaced repetition, retrieval tests, and clinical simulations.' },
]

/* ── Landing Page ───────────────────────────────────────────────────────────── */
export default function LandingPage() {
  const [scrollY, setScrollY] = useState(0)
  useEffect(() => {
    const h = () => setScrollY(window.scrollY)
    window.addEventListener('scroll', h, { passive: true })
    return () => window.removeEventListener('scroll', h)
  }, [])

  return (
    <div className="min-h-screen bg-void text-ink-primary overflow-x-hidden">
      {/* NAV */}
      <nav className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
        style={{ backgroundColor: scrollY > 50 ? 'rgba(5,5,5,0.85)' : 'transparent', backdropFilter: scrollY > 50 ? 'blur(20px)' : 'none' }}>
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Logo size="sm" />
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-xs font-semibold text-ink-secondary hover:text-ink-primary px-4 py-2 rounded-lg hover:bg-elevated/40 transition-all duration-200">Log In</Link>
            <Link href="/signup" className="glow-btn inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-xs font-bold bg-neon-green text-void">
              Get Started <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="relative min-h-screen flex items-center justify-center pt-20 pb-32">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full orb-1" style={{ background: 'radial-gradient(circle, rgba(13,242,125,0.06) 0%, transparent 70%)', filter: 'blur(60px)' }} />
          <div className="absolute bottom-1/3 right-1/4 w-[400px] h-[400px] rounded-full orb-2" style={{ background: 'radial-gradient(circle, rgba(124,92,252,0.05) 0%, transparent 70%)', filter: 'blur(60px)' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(34,211,238,0.03) 0%, transparent 60%)', filter: 'blur(80px)' }} />
          <div className="absolute inset-0 opacity-60"><KnowledgeNetwork /></div>
          <MedicalFloats />
          <ECGWaveform />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
          <div style={{ animation: 'fade-in-up 0.5s ease-out both' }}>
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-bold font-mono uppercase tracking-widest bg-neon-green/[0.06] text-neon-green border border-neon-green/15">
              <span className="w-1.5 h-1.5 rounded-full bg-neon-green animate-pulse" />
              AI-Powered Medical Learning
            </span>
          </div>

          <h1 className="mt-8 text-[clamp(2.5rem,7vw,5rem)] font-display font-extrabold leading-[1.05] tracking-tight" style={{ animation: 'fade-in-up 0.6s ease-out 0.15s both' }}>
            <span className="text-ink-primary">Don&apos;t just study.</span><br />
            <span className="text-gradient-medical animate-gradient-shift">Never forget.</span>
          </h1>

          <p className="mt-6 text-base sm:text-lg text-ink-secondary max-w-2xl mx-auto leading-relaxed" style={{ animation: 'fade-in-up 0.6s ease-out 0.3s both' }}>
            MnemonicFlow transforms complex medical concepts into unforgettable stories, visual anchors, and adaptive flashcards \u2014 powered by AI that understands how you learn.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4" style={{ animation: 'fade-in-up 0.6s ease-out 0.45s both' }}>
            <Link href="/signup" className="glow-btn inline-flex items-center gap-2 px-8 py-4 rounded-xl text-sm font-bold bg-neon-green text-void">
              <Zap className="w-4 h-4" /> Start Learning Free
            </Link>
            <a href="#how-it-works" className="glow-btn-soft inline-flex items-center gap-2 px-6 py-4 rounded-xl text-sm font-semibold text-ink-secondary border border-border/40 hover:text-ink-primary">
              See How It Works <ArrowRight className="w-4 h-4" />
            </a>
          </div>

          <div className="mt-16 flex flex-wrap items-center justify-center gap-6 sm:gap-10" style={{ animation: 'fade-in 0.6s ease-out 0.7s both' }}>
            {['MBBS & BDS Coverage', 'AI-Generated Content', 'Spaced Repetition', 'Anki Compatible'].map(t => (
              <div key={t} className="flex items-center gap-2 text-[11px] text-ink-tertiary font-mono">
                <Check className="w-3 h-3 text-neon-green" /><span>{t}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="relative py-24 sm:py-32">
        <div className="max-w-6xl mx-auto px-6">
          <Reveal>
            <div className="text-center mb-16">
              <p className="text-[10px] font-bold font-mono uppercase tracking-[0.2em] text-neon-green mb-4">Features</p>
              <h2 className="text-3xl sm:text-4xl font-display font-extrabold text-ink-primary tracking-tight">
                Everything you need to{' '}<span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-green to-neon-cyan">remember</span>
              </h2>
            </div>
          </Reveal>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f, i) => {
              const Icon = f.icon
              return (
                <Reveal key={f.title} delay={i * 0.08}>
                  <div className="card-hover-glow group relative p-6 rounded-2xl bg-card/50 border border-border/20 cursor-default">
                    <div className="relative z-10">
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 bg-subtle/30 ${f.color} group-hover:scale-110 transition-transform duration-300`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <h3 className="text-sm font-bold text-ink-primary mb-2">{f.title}</h3>
                      <p className="text-xs text-ink-secondary leading-relaxed">{f.desc}</p>
                    </div>
                  </div>
                </Reveal>
              )
            })}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="relative py-24 sm:py-32">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] rounded-full" style={{ background: 'radial-gradient(ellipse, rgba(13,242,125,0.02) 0%, transparent 70%)' }} />
        </div>
        <div className="relative max-w-5xl mx-auto px-6">
          <Reveal>
            <div className="text-center mb-16">
              <p className="text-[10px] font-bold font-mono uppercase tracking-[0.2em] text-neon-cyan mb-4">How It Works</p>
              <h2 className="text-3xl sm:text-4xl font-display font-extrabold text-ink-primary tracking-tight">
                Three steps to{' '}<span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-cyan to-neon-green">mastery</span>
              </h2>
            </div>
          </Reveal>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {STEPS.map((step, i) => (
              <Reveal key={step.num} delay={i * 0.12}>
                <div className="relative p-6 rounded-2xl bg-card/30 border border-border/15">
                  <span className="text-5xl font-extrabold font-mono text-neon-green/[0.08] absolute top-4 right-5">{step.num}</span>
                  <div className="relative z-10">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 bg-neon-green/[0.06] text-neon-green">
                      {i === 0 && <BookOpen className="w-5 h-5" />}
                      {i === 1 && <Sparkles className="w-5 h-5" />}
                      {i === 2 && <Layers className="w-5 h-5" />}
                    </div>
                    <h3 className="text-sm font-bold text-ink-primary mb-2">{step.title}</h3>
                    <p className="text-xs text-ink-secondary leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* SUBJECTS */}
      <section className="relative py-24 sm:py-32">
        <div className="max-w-5xl mx-auto px-6">
          <Reveal>
            <div className="text-center mb-12">
              <p className="text-[10px] font-bold font-mono uppercase tracking-[0.2em] text-neon-physio mb-4">Comprehensive Coverage</p>
              <h2 className="text-3xl sm:text-4xl font-display font-extrabold text-ink-primary tracking-tight">Every subject. Every system.</h2>
              <p className="mt-4 text-sm text-ink-secondary max-w-lg mx-auto">From Anatomy to Psychiatry, Pharmacology to Surgery \u2014 MnemonicFlow covers your entire MBBS and BDS curriculum.</p>
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="flex flex-wrap justify-center gap-3">
              {[
                { icon: '\u{1FAC0}', label: 'Anatomy' }, { icon: '\u{2697}\u{FE0F}', label: 'Pharmacology' },
                { icon: '\u{1F9EC}', label: 'Biochemistry' }, { icon: '\u{1F52C}', label: 'Pathology' },
                { icon: '\u{1F9A0}', label: 'Microbiology' }, { icon: '\u{1FAC1}', label: 'Physiology' },
                { icon: '\u{1F3E5}', label: 'Surgery' }, { icon: '\u{1F48A}', label: 'Medicine' },
                { icon: '\u{1F476}', label: 'Pediatrics' }, { icon: '\u{1F9E0}', label: 'Psychiatry' },
                { icon: '\u{1F9B7}', label: 'Dental Surgery' }, { icon: '\u{1F441}\u{FE0F}', label: 'Ophthalmology' },
              ].map(s => (
                <div key={s.label} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-card/40 border border-border/20 text-xs font-medium text-ink-secondary hover:border-neon-green/20 hover:text-ink-primary transition-all duration-200">
                  <span>{s.icon}</span><span>{s.label}</span>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* CTA */}
      <section className="relative py-24 sm:py-32">
        <div className="max-w-3xl mx-auto px-6 text-center relative">
          <div className="absolute inset-0 -z-10">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] rounded-full" style={{ background: 'radial-gradient(ellipse, rgba(13,242,125,0.06) 0%, transparent 70%)', filter: 'blur(40px)' }} />
          </div>
          <Reveal>
            <div className="p-10 sm:p-14 rounded-3xl bg-card/30 border border-border/20 relative overflow-hidden">
              <div className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-700 pointer-events-none" style={{ background: 'radial-gradient(circle at 30% 30%, rgba(13,242,125,0.03), transparent 60%)' }} />
              <div className="relative z-10">
                <h2 className="text-2xl sm:text-3xl font-display font-extrabold text-ink-primary tracking-tight mb-4">Ready to transform how you learn?</h2>
                <p className="text-sm text-ink-secondary mb-8 max-w-md mx-auto">Join medical students who never forget what they study. Start free, no credit card required.</p>
                <Link href="/signup" className="glow-btn inline-flex items-center gap-2 px-8 py-4 rounded-xl text-sm font-bold bg-neon-green text-void">
                  <Zap className="w-4 h-4" /> Get Started Free
                </Link>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-border/10 py-10">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <Logo showText size="sm" />
          <div className="flex items-center gap-6 text-[11px] text-ink-tertiary">
            <Link href="/login" className="hover:text-ink-secondary transition-colors">Log In</Link>
            <Link href="/signup" className="hover:text-ink-secondary transition-colors">Sign Up</Link>
            <Link href="/privacy" className="hover:text-ink-secondary transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-ink-secondary transition-colors">Terms</Link>
          </div>
        </div>
        <div className="max-w-6xl mx-auto px-6 mt-6">
          <p className="text-[10px] text-ink-muted text-center font-mono">&copy; {new Date().getFullYear()} MnemonicFlow Pro. Built for medical students who refuse to forget.</p>
        </div>
      </footer>
    </div>
  )
}
