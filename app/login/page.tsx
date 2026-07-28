'use client'
import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { Activity, Mail, Lock, User, Eye, EyeOff, Zap, BookOpen, Brain, CreditCard, CheckCircle2 } from 'lucide-react'

export default function LoginPage() {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const handleSubmit = async () => {
    setLoading(true); setError(''); setMessage('')
    if (mode === 'signup') {
      const { error } = await supabase.auth.signUp({
        email, password, options: { data: { full_name: fullName } }
      })
      if (error) setError(error.message)
      else setMessage('Check your email to confirm your account!')
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(error.message)
      else window.location.href = '/'
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-void flex flex-col lg:flex-row overflow-x-hidden">

      {/* ── Left: branding / illustration panel — hidden on phones, shown from md up ── */}
      <div className="hidden md:flex md:w-[42%] lg:w-1/2 relative flex-col justify-between overflow-hidden border-b md:border-b-0 md:border-r border-border p-8 lg:p-14 min-h-[38vh] md:min-h-screen">
        {/* Ambient glow backdrop */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute top-0 left-0 w-80 h-80 rounded-full opacity-[0.10] blur-3xl -translate-x-1/3 -translate-y-1/3"
            style={{ background: 'radial-gradient(circle, #0df27d, transparent)' }} />
          <div className="absolute bottom-0 right-0 w-96 h-96 rounded-full opacity-[0.08] blur-3xl translate-x-1/4 translate-y-1/4"
            style={{ background: 'radial-gradient(circle, #c77dff, transparent)' }} />
          <div className="absolute inset-0 opacity-[0.03]"
            style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)', backgroundSize: '44px 44px' }} />
        </div>

        {/* Logo */}
        <div className="relative flex items-center gap-3 animate-fade-in">
          <div className="w-11 h-11 rounded-xl bg-neon-green-dim border border-neon-green-border flex items-center justify-center shadow-glow-md">
            <Activity className="w-5.5 h-5.5 text-neon-green" strokeWidth={2.5} />
          </div>
          <div>
            <div className="text-sm font-bold tracking-widest text-neon-green uppercase font-mono">MnemonicFlow</div>
            <div className="text-[11px] text-ink-tertiary tracking-wide">Pro Edition</div>
          </div>
        </div>

        {/* Headline + illustration */}
        <div className="relative animate-fade-up">
          <h1 className="font-display font-bold text-ink-primary leading-[1.05] tracking-tight text-[clamp(1.75rem,3vw,2.75rem)] max-w-md">
            Medical school, remembered.
          </h1>
          <p className="mt-4 text-sm lg:text-base text-ink-secondary max-w-sm leading-relaxed">
            AI-generated mnemonics, visual stories, and Anki-ready flashcards — built for anatomy, pharmacology, pathology and every subject in between.
          </p>

          <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-lg">
            <FeaturePill icon={<Brain className="w-4 h-4" />} label="Story mnemonics" accent="#0df27d" />
            <FeaturePill icon={<BookOpen className="w-4 h-4" />} label="AI illustrations" accent="#c77dff" />
            <FeaturePill icon={<CreditCard className="w-4 h-4" />} label="Anki export" accent="#4df7c8" />
          </div>
        </div>

        {/* Footer trust line */}
        <div className="relative hidden lg:flex items-center gap-2 text-[11px] text-ink-tertiary animate-fade-in">
          <CheckCircle2 className="w-3.5 h-3.5 text-neon-green" />
          Trusted by medical students across every year of study
        </div>
      </div>

      {/* ── Right: auth form ── */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-8 py-10 sm:py-14 relative">
        <div className="pointer-events-none absolute inset-0 md:hidden overflow-hidden">
          <div className="absolute top-0 left-1/2 w-72 h-72 rounded-full opacity-[0.05] blur-3xl -translate-x-1/2"
            style={{ background: 'radial-gradient(circle, #0df27d, transparent)' }} />
        </div>

        <div className="w-full max-w-sm sm:max-w-md relative animate-fade-up">
          {/* Mobile-only compact logo */}
          <div className="flex items-center gap-3 mb-8 justify-center md:hidden">
            <div className="w-10 h-10 rounded-xl bg-neon-green-dim border border-neon-green-border flex items-center justify-center shadow-glow-sm">
              <Activity className="w-5 h-5 text-neon-green" strokeWidth={2.5} />
            </div>
            <div>
              <div className="text-sm font-bold tracking-widest text-neon-green uppercase font-mono">MnemonicFlow</div>
              <div className="text-[10px] text-ink-tertiary tracking-wide">Pro Edition</div>
            </div>
          </div>

          <div className="text-center md:text-left mb-6 hidden md:block">
            <h2 className="text-xl font-bold font-display text-ink-primary">
              {mode === 'login' ? 'Welcome back' : 'Create your account'}
            </h2>
            <p className="text-xs text-ink-tertiary mt-1">
              {mode === 'login' ? 'Sign in to continue your progress.' : 'Start generating mnemonics in seconds.'}
            </p>
          </div>

          <div className="glass rounded-2xl p-6 sm:p-8 shadow-card-lg">
            <div className="flex gap-1 p-1 bg-elevated rounded-xl border border-border mb-6">
              {(['login', 'signup'] as const).map(m => (
                <button
                  key={m}
                  onClick={() => { setMode(m); setError(''); setMessage('') }}
                  className={`flex-1 py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 ${mode === m ? 'bg-card text-ink-primary border border-border shadow-card-sm' : 'text-ink-tertiary hover:text-ink-secondary'}`}
                >
                  {m === 'login' ? 'Sign In' : 'Sign Up'}
                </button>
              ))}
            </div>

            <div className="space-y-4">
              {mode === 'signup' && (
                <div className="relative animate-fade-in">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-tertiary" />
                  <input
                    type="text"
                    placeholder="Full name"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    className="input-neon w-full bg-elevated border border-border rounded-xl pl-10 pr-4 py-3 text-sm text-ink-primary placeholder:text-ink-tertiary transition-all"
                  />
                </div>
              )}

              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-tertiary" />
                <input
                  type="email"
                  placeholder="Email address"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="input-neon w-full bg-elevated border border-border rounded-xl pl-10 pr-4 py-3 text-sm text-ink-primary placeholder:text-ink-tertiary transition-all"
                />
              </div>

              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-tertiary" />
                <input
                  type={showPass ? 'text' : 'password'}
                  placeholder="Password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                  className="input-neon w-full bg-elevated border border-border rounded-xl pl-10 pr-10 py-3 text-sm text-ink-primary placeholder:text-ink-tertiary transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-tertiary hover:text-ink-secondary transition-colors"
                  aria-label={showPass ? 'Hide password' : 'Show password'}
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {error && (
                <p className="text-xs text-neon-danger bg-neon-danger-dim border border-neon-danger/30 rounded-lg px-3 py-2 animate-fade-in">
                  {error}
                </p>
              )}
              {message && (
                <p className="text-xs text-neon-green bg-neon-green-dim border border-neon-green-border rounded-lg px-3 py-2 animate-fade-in">
                  {message}
                </p>
              )}

              <button
                onClick={handleSubmit}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold bg-neon-green text-void hover:brightness-110 transition-all duration-200 active:scale-[0.98] disabled:opacity-50"
                style={{ boxShadow: '0 0 24px rgba(13, 242, 125, 0.25)' }}
              >
                <Zap className="w-4 h-4" />
                {loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            </div>
          </div>

          <p className="text-center text-xs text-ink-tertiary mt-5">
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <button onClick={() => setMode(mode === 'login' ? 'signup' : 'login')} className="text-neon-green hover:underline">
              {mode === 'login' ? 'Sign up free' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}

function FeaturePill({ icon, label, accent }: { icon: React.ReactNode; label: string; accent: string }) {
  return (
    <div
      className="flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-medium"
      style={{ background: `${accent}14`, borderColor: `${accent}44`, color: accent }}
    >
      {icon}
      <span className="truncate">{label}</span>
    </div>
  )
}