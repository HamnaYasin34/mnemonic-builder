'use client'
import { useState } from 'react'
import Link from 'next/link'
import { supabase } from '../lib/supabase'
import Logo from '../components/Logo'
import {
  Mail, Lock, Eye, EyeOff, Zap, ArrowRight,
} from 'lucide-react'

/* ── Floating medical SVG decorations ────────────────────────────────────── */
function MedicalFloats() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {/* Brain icon — top left */}
      <svg className="absolute top-[12%] left-[8%] w-10 h-10 text-neon-green/[0.07]" style={{ animation: 'float-drift 7s ease-in-out infinite' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
        <path d="M12 2a5 5 0 0 1 4.5 2.8A4 4 0 0 1 20 9a4 4 0 0 1-1.5 3.1A5 5 0 0 1 12 22a5 5 0 0 1-6.5-9.9A4 4 0 0 1 4 9a4 4 0 0 1 3.5-4.2A5 5 0 0 1 12 2z"/>
        <path d="M12 2v20"/>
      </svg>
      {/* DNA helix — top right */}
      <svg className="absolute top-[18%] right-[10%] w-8 h-14 text-neon-cyan/[0.06]" style={{ animation: 'float-drift-reverse 9s ease-in-out infinite' }} viewBox="0 0 24 40" fill="none" stroke="currentColor" strokeWidth="1">
        <path d="M6 0c0 8 12 8 12 16s-12 8-12 16" /><path d="M18 0c0 8-12 8-12 16s12 8 12 16"/>
        <line x1="8" y1="6" x2="16" y2="6" /><line x1="8" y1="14" x2="16" y2="14"/><line x1="8" y1="22" x2="16" y2="22"/><line x1="8" y1="30" x2="16" y2="30"/>
      </svg>
      {/* Heart / ECG — bottom left */}
      <svg className="absolute bottom-[20%] left-[12%] w-12 h-6 text-neon-review/[0.06]" style={{ animation: 'float-drift 8s ease-in-out infinite 1s' }} viewBox="0 0 48 24" fill="none" stroke="currentColor" strokeWidth="1.2">
        <path d="M0 12 L10 12 L14 4 L18 20 L22 8 L26 16 L30 12 L48 12"/>
      </svg>
      {/* Capsule / pill — bottom right */}
      <svg className="absolute bottom-[25%] right-[8%] w-6 h-10 text-neon-biochem/[0.06]" style={{ animation: 'float-drift-reverse 6s ease-in-out infinite 0.5s' }} viewBox="0 0 16 28" fill="none" stroke="currentColor" strokeWidth="1.2">
        <rect x="2" y="2" width="12" height="24" rx="6"/><line x1="2" y1="14" x2="14" y2="14"/>
      </svg>
      {/* Stethoscope — mid left */}
      <svg className="absolute top-[55%] left-[5%] w-8 h-8 text-neon-green/[0.05]" style={{ animation: 'float-drift 10s ease-in-out infinite 2s' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
        <circle cx="12" cy="18" r="3"/><path d="M12 15V8a4 4 0 0 0-4-4H6"/><path d="M12 8a4 4 0 0 1 4-4h2"/>
      </svg>
      {/* Molecule — mid right */}
      <svg className="absolute top-[45%] right-[6%] w-8 h-8 text-neon-physio/[0.05]" style={{ animation: 'float-drift-reverse 8s ease-in-out infinite 1.5s' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
        <circle cx="12" cy="12" r="3"/><circle cx="4" cy="6" r="2"/><circle cx="20" cy="6" r="2"/><circle cx="4" cy="18" r="2"/><circle cx="20" cy="18" r="2"/>
        <line x1="9.5" y1="10" x2="6" y2="7.5"/><line x1="14.5" y1="10" x2="18" y2="7.5"/><line x1="9.5" y1="14" x2="6" y2="16.5"/><line x1="14.5" y1="14" x2="18" y2="16.5"/>
      </svg>
      {/* ECG line — full width background */}
      <svg className="absolute bottom-[38%] left-0 w-full h-8 text-neon-green/[0.04]" style={{ animation: 'float-drift 12s ease-in-out infinite' }} viewBox="0 0 400 32" preserveAspectRatio="none" fill="none" stroke="currentColor" strokeWidth="1">
        <path d="M0 16 L80 16 L100 16 L110 4 L120 28 L130 8 L140 24 L150 16 L400 16" strokeDasharray="1000" style={{ animation: 'ecg-draw 4s ease-in-out infinite alternate' }}/>
      </svg>
    </div>
  )
}

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState('')
  const [forgotSent, setForgotSent] = useState(false)

  const handleLogin = async () => {
    setError('')
    if (!email.trim() || !password) {
      setError('Please enter both email and password.')
      return
    }
    setLoading(true)
    const { error: loginError } = await supabase.auth.signInWithPassword({ email, password })
    if (loginError) {
      setError(loginError.message)
      setLoading(false)
      return
    }
    window.location.href = '/'
  }

  const handleGoogle = async () => {
    setError('')
    setGoogleLoading(true)
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (oauthError) {
      setError(oauthError.message)
      setGoogleLoading(false)
    }
  }

  const handleForgot = async () => {
    setError('')
    if (!email.trim()) {
      setError('Enter your email address first, then click Forgot Password.')
      return
    }
    setForgotSent(true)
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    if (resetError) {
      setError(resetError.message)
      setForgotSent(false)
    }
  }

  return (
    <div className="min-h-screen bg-void flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden">

      {/* ── Subtle ambient backdrop ── */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-[-10%] left-1/2 w-[600px] h-[600px] -translate-x-1/2 rounded-full opacity-[0.04] blur-3xl"
          style={{ background: 'radial-gradient(circle, #0df27d, transparent)' }} />
        <div className="absolute bottom-[-15%] left-1/3 w-[400px] h-[400px] rounded-full opacity-[0.03] blur-3xl"
          style={{ background: 'radial-gradient(circle, #7c5cfc, transparent)' }} />
      </div>

      {/* ── Floating medical decorations ── */}
      <MedicalFloats />

      {/* ── Auth card ── */}
      <div className="relative z-10 w-full max-w-[400px]" style={{ animation: 'fade-in-up 0.6s ease-out both' }}>

        {/* Branding */}
        <div className="text-center mb-8" style={{ animation: 'glow-appear 0.7s ease-out 0.1s both' }}>
          <div className="flex justify-center mb-5 glow-logo">
            <Logo showText={false} size="lg" />
          </div>
          <h1 className="text-xl font-bold font-display text-ink-primary tracking-tight">
            Welcome to MnemonicFlow
          </h1>
          <p className="text-xs text-ink-tertiary mt-1.5 tracking-wide">
            Learn smarter. Remember longer.
          </p>
        </div>

        {/* Form card */}
        <div className="glass rounded-2xl p-7 sm:p-8 shadow-card-lg space-y-5 glow-auth-card" style={{ animation: 'auth-card-glow 4s ease-in-out infinite, fade-in-up 0.5s ease-out 0.2s both' }}>

          {/* Heading */}
          <div>
            <h2 className="text-base font-bold font-display text-ink-primary">Welcome back</h2>
            <p className="text-[11px] text-ink-tertiary mt-1">Sign in to continue your progress.</p>
          </div>

          {/* Google OAuth */}
          <button
            onClick={handleGoogle}
            disabled={googleLoading || loading}
            className="w-full flex items-center justify-center gap-3 py-2.5 rounded-xl text-sm font-semibold bg-elevated/60 border border-border/40 text-ink-primary hover:bg-elevated hover:border-border/60 transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none glow-btn-soft"
          >
            {googleLoading ? (
              <div className="w-4 h-4 rounded-full border-2 border-ink-tertiary border-t-transparent animate-spin" />
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
            )}
            Continue with Google
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-border/30" />
            <span className="text-[10px] font-mono text-ink-muted uppercase tracking-widest">or</span>
            <div className="flex-1 h-px bg-border/30" />
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest font-mono text-ink-tertiary" htmlFor="login-email">Email</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted" />
              <input
                id="login-email"
                type="email"
                placeholder="you@university.edu"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoFocus
                className="w-full bg-elevated/50 rounded-xl pl-10 pr-4 py-3 text-sm text-ink-primary placeholder:text-ink-muted/60 transition-all border border-border/30 focus:border-neon-green/30 focus:bg-elevated/70 outline-none glow-input"
                autoComplete="email"
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold uppercase tracking-widest font-mono text-ink-tertiary" htmlFor="login-pass">Password</label>
              <button
                type="button"
                onClick={handleForgot}
                disabled={forgotSent}
                className="text-[10px] font-medium text-neon-green/80 hover:text-neon-green hover:underline disabled:text-ink-muted disabled:no-underline transition-colors"
              >
                {forgotSent ? '✓ Email sent' : 'Forgot password?'}
              </button>
            </div>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted" />
              <input
                id="login-pass"
                type={showPass ? 'text' : 'password'}
                placeholder="Enter your password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                className="w-full bg-elevated/50 rounded-xl pl-10 pr-10 py-3 text-sm text-ink-primary placeholder:text-ink-muted/60 transition-all border border-border/30 focus:border-neon-green/30 focus:bg-elevated/70 outline-none glow-input"
                autoComplete="current-password"
              />
              <button type="button" onClick={() => setShowPass(s => !s)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink-secondary transition-colors"
                aria-label={showPass ? 'Hide password' : 'Show password'}>
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Forgot-password confirmation */}
          {forgotSent && (
            <div className="bg-neon-green/[0.06] border border-neon-green/10 rounded-xl px-4 py-2.5 text-[11px] text-neon-green leading-relaxed animate-fade-in">
              Reset link sent to <span className="font-medium">{email}</span>. Check your inbox.
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-neon-danger/[0.06] border border-neon-danger/10 rounded-xl px-4 py-2.5 text-[11px] text-neon-danger leading-relaxed animate-fade-in glow-error">{error}</div>
          )}

          {/* Submit */}
          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold bg-neon-green text-void hover:brightness-110 transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none glow-btn"
          >
            {loading
              ? <div className="w-4 h-4 rounded-full border-2 border-void border-t-transparent animate-spin" />
              : <><span>Log In</span><ArrowRight className="w-4 h-4" /></>}
            {loading ? 'Signing in...' : ''}
          </button>
        </div>

        {/* Switch to signup */}
        <p className="text-center text-xs text-ink-tertiary mt-6" style={{ animation: 'fade-in 0.5s ease-out 0.5s both' }}>
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="text-neon-green hover:underline font-medium glow-link">Sign up</Link>
        </p>
      </div>

      {/* Minimal footer */}
      <div className="relative z-10 flex items-center gap-4 mt-10" style={{ animation: 'fade-in 0.5s ease-out 0.7s both' }}>
        <p className="text-[10px] text-ink-muted tracking-wide">Designed for MBBS & BDS students</p>
        <Link href="/landing" className="text-[10px] text-ink-tertiary hover:text-ink-secondary transition-colors">About</Link>
      </div>
    </div>
  )
}
