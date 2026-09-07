'use client'
import { useState } from 'react'
import Link from 'next/link'
import { supabase } from '../lib/supabase'
import Logo from '../components/Logo'
import {
  Mail, Lock, User, Eye, EyeOff, CheckCircle2, Check, ArrowRight,
} from 'lucide-react'

/* ── password strength helper ── */
function getPasswordStrength(pw: string) {
  let score = 0
  if (pw.length >= 8) score++
  if (pw.length >= 12) score++
  if (/[A-Z]/.test(pw)) score++
  if (/[0-9]/.test(pw)) score++
  if (/[^A-Za-z0-9]/.test(pw)) score++
  if (score <= 1) return { score, label: 'Weak', color: 'bg-neon-danger' }
  if (score <= 2) return { score, label: 'Fair', color: 'bg-amber-500' }
  if (score <= 3) return { score, label: 'Good', color: 'bg-neon-physio' }
  return { score, label: 'Strong', color: 'bg-neon-green' }
}

function StrengthBar({ strength }: { strength: { score: number; label: string; color: string } }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 flex gap-1">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i <= strength.score ? strength.color : 'bg-border/20'}`} />
        ))}
      </div>
      <span className={`text-[10px] font-mono font-bold ${
        strength.score <= 1 ? 'text-neon-danger'
        : strength.score <= 2 ? 'text-amber-400'
        : strength.score <= 3 ? 'text-neon-physio'
        : 'text-neon-green'
      }`}>{strength.label}</span>
    </div>
  )
}

/* ── validation helpers ── */
const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)

export default function SignupPage() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  // Consent
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [researchConsent, setResearchConsent] = useState(false)

  // Validation (show only after first attempt)
  const [attempted, setAttempted] = useState(false)

  const strength = getPasswordStrength(password)
  const emailValid = isValidEmail(email)
  const passValid = password.length >= 8 && strength.score >= 2
  const matchValid = password === confirm && confirm.length > 0
  const canSubmit = fullName.trim().length >= 2 && emailValid && passValid && matchValid && termsAccepted && !loading

  const handleSubmit = async () => {
    setAttempted(true)
    setError('')
    if (!canSubmit) return

    setLoading(true)
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName.trim() },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }

    // Store consent preferences in the profile row
    if (data.user) {
      const now = new Date().toISOString()
      await supabase.from('profiles').upsert({
        id: data.user.id,
        email: data.user.email ?? email,
        full_name: fullName.trim(),
        terms_accepted: true,
        terms_accepted_at: now,
        research_consent: researchConsent,
        research_consent_at: researchConsent ? now : null,
      })
    }

    setSuccess(true)
    setLoading(false)
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

  /* ── Success state ── */
  if (success) return (
    <div className="min-h-screen bg-void flex items-center justify-center px-4 relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-[-10%] left-1/2 w-[600px] h-[600px] -translate-x-1/2 rounded-full opacity-[0.04] blur-3xl"
          style={{ background: 'radial-gradient(circle, #0df27d, transparent)' }} />
      </div>
      <div className="relative z-10 max-w-sm w-full text-center space-y-5 animate-fade-up">
        <div className="flex justify-center">
          <Logo showText={false} size="lg" />
        </div>
        <div className="w-14 h-14 rounded-2xl bg-neon-green/10 flex items-center justify-center mx-auto glow-success">
          <CheckCircle2 className="w-7 h-7 text-neon-green" />
        </div>
        <h1 className="text-xl font-bold font-display text-ink-primary">Check your email</h1>
        <p className="text-sm text-ink-secondary leading-relaxed">
          We sent a confirmation link to <span className="text-ink-primary font-medium">{email}</span>. Click it to activate your account.
        </p>
        <Link href="/login"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-neon-green text-void text-sm font-bold hover:brightness-110 transition-all glow-btn">
          Continue to Sign In
        </Link>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-void flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden">

      {/* ── Subtle ambient backdrop ── */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-[-10%] left-1/2 w-[600px] h-[600px] -translate-x-1/2 rounded-full opacity-[0.04] blur-3xl"
          style={{ background: 'radial-gradient(circle, #0df27d, transparent)' }} />
        <div className="absolute bottom-[-15%] left-1/3 w-[400px] h-[400px] rounded-full opacity-[0.03] blur-3xl"
          style={{ background: 'radial-gradient(circle, #7c5cfc, transparent)' }} />
      </div>

      {/* ── Auth card ── */}
      <div className="relative z-10 w-full max-w-[400px] animate-fade-up">

        {/* Branding */}
        <div className="text-center mb-8">
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
        <div className="glass rounded-2xl p-7 sm:p-8 shadow-card-lg space-y-4 glow-auth-card">

          {/* Heading */}
          <div>
            <h2 className="text-base font-bold font-display text-ink-primary">Create your account</h2>
            <p className="text-[11px] text-ink-tertiary mt-1">Start generating mnemonics in seconds.</p>
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

          {/* Full Name */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest font-mono text-ink-tertiary" htmlFor="signup-name">Name</label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted" />
              <input
                id="signup-name"
                type="text"
                placeholder="e.g. Ayesha Khan"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                autoFocus
                className="w-full bg-elevated/50 rounded-xl pl-10 pr-4 py-3 text-sm text-ink-primary placeholder:text-ink-muted/60 transition-all border border-border/30 focus:border-neon-green/30 focus:bg-elevated/70 outline-none glow-input"
                autoComplete="name"
              />
            </div>
            {attempted && fullName.trim().length < 2 && (
              <p className="text-[11px] text-neon-danger">Please enter your name</p>
            )}
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest font-mono text-ink-tertiary" htmlFor="signup-email">Email</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted" />
              <input
                id="signup-email"
                type="email"
                placeholder="you@university.edu"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full bg-elevated/50 rounded-xl pl-10 pr-4 py-3 text-sm text-ink-primary placeholder:text-ink-muted/60 transition-all border border-border/30 focus:border-neon-green/30 focus:bg-elevated/70 outline-none glow-input"
                autoComplete="email"
              />
            </div>
            {attempted && !emailValid && (
              <p className="text-[11px] text-neon-danger">Please enter a valid email address</p>
            )}
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest font-mono text-ink-tertiary" htmlFor="signup-pass">Password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted" />
              <input
                id="signup-pass"
                type={showPass ? 'text' : 'password'}
                placeholder="At least 8 characters"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-elevated/50 rounded-xl pl-10 pr-10 py-3 text-sm text-ink-primary placeholder:text-ink-muted/60 transition-all border border-border/30 focus:border-neon-green/30 focus:bg-elevated/70 outline-none glow-input"
                autoComplete="new-password"
              />
              <button type="button" onClick={() => setShowPass(s => !s)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink-secondary transition-colors"
                aria-label={showPass ? 'Hide password' : 'Show password'}>
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {password.length > 0 && <StrengthBar strength={strength} />}
            {attempted && !passValid && (
              <p className="text-[11px] text-neon-danger">Password must be at least 8 characters</p>
            )}
          </div>

          {/* Confirm Password */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest font-mono text-ink-tertiary" htmlFor="signup-confirm">Confirm Password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted" />
              <input
                id="signup-confirm"
                type={showConfirm ? 'text' : 'password'}
                placeholder="Re-enter password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                className="w-full bg-elevated/50 rounded-xl pl-10 pr-10 py-3 text-sm text-ink-primary placeholder:text-ink-muted/60 transition-all border border-border/30 focus:border-neon-green/30 focus:bg-elevated/70 outline-none glow-input"
                autoComplete="new-password"
              />
              <button type="button" onClick={() => setShowConfirm(s => !s)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink-secondary transition-colors"
                aria-label={showConfirm ? 'Hide password' : 'Show password'}>
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {attempted && !matchValid && (
              <p className="text-[11px] text-neon-danger">Passwords do not match</p>
            )}
          </div>

          {/* ── Consent Section ── */}
          <div className="space-y-3 pt-1">
            {/* Required: Terms + Privacy */}
            <label className="flex items-start gap-3 cursor-pointer group">
              <div className="shrink-0 mt-0.5">
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={termsAccepted}
                  onClick={() => setTermsAccepted(t => !t)}
                  className={`w-[18px] h-[18px] rounded-md border-2 flex items-center justify-center transition-all duration-200 ${
                    termsAccepted
                      ? 'bg-neon-green border-neon-green'
                      : 'border-border/50 group-hover:border-ink-tertiary'
                  }`}
                >
                  {termsAccepted && <Check className="w-3 h-3 text-void" strokeWidth={3} />}
                </button>
              </div>
              <span className="text-[11px] text-ink-secondary leading-relaxed">
                I agree to the{' '}
                <Link href="/terms" target="_blank" rel="noopener noreferrer" className="text-neon-green hover:underline font-medium">Terms</Link>
                {' '}and{' '}
                <Link href="/privacy" target="_blank" rel="noopener noreferrer" className="text-neon-green hover:underline font-medium">Privacy</Link>
                <span className="text-neon-danger ml-0.5">*</span>
              </span>
            </label>
            {attempted && !termsAccepted && (
              <p className="text-[11px] text-neon-danger pl-[30px]">You must accept the Terms to continue</p>
            )}

            {/* Optional: Research Consent */}
            <label className="flex items-start gap-3 cursor-pointer group">
              <div className="shrink-0 mt-0.5">
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={researchConsent}
                  onClick={() => setResearchConsent(r => !r)}
                  className={`w-[18px] h-[18px] rounded-md border-2 flex items-center justify-center transition-all duration-200 ${
                    researchConsent
                      ? 'bg-neon-physio border-neon-physio'
                      : 'border-border/50 group-hover:border-ink-tertiary'
                  }`}
                >
                  {researchConsent && <Check className="w-3 h-3 text-void" strokeWidth={3} />}
                </button>
              </div>
              <span className="text-[11px] text-ink-tertiary leading-relaxed">
                <span className="text-[9px] font-bold uppercase tracking-widest font-mono text-neon-physio/60 block mb-0.5">Optional</span>
                Allow anonymized data usage for platform improvement and research
              </span>
            </label>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-neon-danger/[0.06] border border-neon-danger/10 rounded-xl px-4 py-2.5 text-[11px] text-neon-danger leading-relaxed animate-fade-in glow-error">{error}</div>
          )}

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={loading || (attempted && !canSubmit)}
            className="glow-btn btn-ripple w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold bg-neon-green text-void disabled:opacity-40 disabled:pointer-events-none"
          >
            {loading
              ? <div className="w-4 h-4 rounded-full border-2 border-void border-t-transparent animate-spin" />
              : <><span>Create Account</span><ArrowRight className="w-4 h-4" /></>}
            {loading ? 'Creating account...' : ''}
          </button>
        </div>

        {/* Switch to login */}
        <p className="text-center text-xs text-ink-tertiary mt-6">
          Already have an account?{' '}
          <Link href="/login" className="text-neon-green hover:underline font-medium glow-link">Log in</Link>
        </p>
      </div>

      {/* Minimal footer */}
      <div className="relative z-10 flex items-center gap-4 mt-10">
        <p className="text-[10px] text-ink-muted tracking-wide">Designed for MBBS & BDS students</p>
        <Link href="/landing" className="text-[10px] text-ink-tertiary hover:text-ink-secondary transition-colors">About</Link>
      </div>
    </div>
  )
}
