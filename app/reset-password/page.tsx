'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import Logo from '../components/Logo'
import { Lock, Eye, EyeOff, ArrowLeft, CheckCircle2, AlertTriangle } from 'lucide-react'
import Link from 'next/link'

function getPasswordStrength(pw: string): { score: number; label: string; color: string } {
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
      <span className={`text-[10px] font-mono font-bold ${strength.score <= 1 ? 'text-neon-danger' : strength.score <= 2 ? 'text-amber-400' : strength.score <= 3 ? 'text-neon-physio' : 'text-neon-green'}`}>
        {strength.label}
      </span>
    </div>
  )
}

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [hasSession, setHasSession] = useState<boolean | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setHasSession(!!user)
    })
  }, [])

  const strength = getPasswordStrength(password)

  const handleSubmit = async () => {
    setError('')
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return }
    if (password !== confirm) { setError('Passwords do not match.'); return }
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    if (error) { setError(error.message); setLoading(false); return }
    setSuccess(true)
    setLoading(false)
  }

  /* ── Shared ambient backdrop ── */
  const Backdrop = () => (
    <div className="pointer-events-none absolute inset-0">
      <div className="absolute top-[-10%] left-1/2 w-[600px] h-[600px] -translate-x-1/2 rounded-full opacity-[0.04] blur-3xl"
        style={{ background: 'radial-gradient(circle, #0df27d, transparent)' }} />
    </div>
  )

  if (hasSession === null) return (
    <div className="min-h-screen bg-void flex items-center justify-center">
      <div className="w-6 h-6 rounded-full border-2 border-neon-green border-t-transparent animate-spin" />
    </div>
  )

  if (success) return (
    <div className="min-h-screen bg-void flex items-center justify-center px-4 relative overflow-hidden">
      <Backdrop />
      <div className="relative z-10 max-w-sm w-full text-center space-y-5 animate-fade-up">
        <div className="flex justify-center">
          <Logo showText={false} size="lg" />
        </div>
        <div className="w-14 h-14 rounded-2xl bg-neon-green/10 flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-7 h-7 text-neon-green" />
        </div>
        <h1 className="text-xl font-bold font-display text-ink-primary">Password Updated</h1>
        <p className="text-sm text-ink-secondary">Your password has been changed successfully.</p>
        <Link href="/login" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-neon-green text-void text-sm font-bold hover:brightness-110 transition-all">
          Sign In
        </Link>
      </div>
    </div>
  )

  if (!hasSession) return (
    <div className="min-h-screen bg-void flex items-center justify-center px-4 relative overflow-hidden">
      <Backdrop />
      <div className="relative z-10 max-w-sm w-full text-center space-y-5 animate-fade-up">
        <div className="flex justify-center">
          <Logo showText={false} size="lg" />
        </div>
        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-7 h-7 text-amber-400" />
        </div>
        <h1 className="text-xl font-bold font-display text-ink-primary">Link Expired</h1>
        <p className="text-sm text-ink-secondary">This password reset link has expired or is invalid. Please request a new one.</p>
        <Link href="/login" className="inline-flex items-center gap-2 text-sm text-neon-green hover:underline">
          <ArrowLeft className="w-4 h-4" /> Back to Sign In
        </Link>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-void flex items-center justify-center px-4 py-12 relative overflow-hidden">
      <Backdrop />

      <div className="relative z-10 w-full max-w-[400px] animate-fade-up">

        {/* Branding */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-5">
            <Logo showText={false} size="lg" />
          </div>
          <h1 className="text-xl font-bold font-display text-ink-primary tracking-tight">
            Set New Password
          </h1>
          <p className="text-xs text-ink-tertiary mt-1.5">Enter your new password below.</p>
        </div>

        {/* Form card */}
        <div className="glass rounded-2xl p-7 sm:p-8 shadow-card-lg space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest font-mono text-ink-tertiary">New Password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted" />
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                autoFocus
                className="w-full bg-elevated/50 rounded-xl pl-10 pr-10 py-3 text-sm text-ink-primary placeholder:text-ink-muted/60 transition-all border border-border/30 focus:border-neon-green/30 focus:bg-elevated/70 outline-none"
              />
              <button type="button" onClick={() => setShowPass(s => !s)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink-secondary transition-colors"
                aria-label={showPass ? 'Hide password' : 'Show password'}>
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {password.length > 0 && <StrengthBar strength={strength} />}
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest font-mono text-ink-tertiary">Confirm Password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted" />
              <input
                type={showPass ? 'text' : 'password'}
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                placeholder="Re-enter password"
                className="w-full bg-elevated/50 rounded-xl pl-10 pr-4 py-3 text-sm text-ink-primary placeholder:text-ink-muted/60 transition-all border border-border/30 focus:border-neon-green/30 focus:bg-elevated/70 outline-none"
              />
            </div>
            {confirm.length > 0 && password !== confirm && (
              <p className="text-[11px] text-neon-danger">Passwords do not match</p>
            )}
          </div>

          {error && (
            <div className="bg-neon-danger/[0.06] border border-neon-danger/10 rounded-xl px-4 py-2.5 text-[11px] text-neon-danger leading-relaxed animate-fade-in">{error}</div>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading || password.length < 8 || password !== confirm}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold bg-neon-green text-void hover:brightness-110 transition-all duration-200 active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none"
          >
            {loading
              ? <div className="w-4 h-4 rounded-full border-2 border-void border-t-transparent animate-spin" />
              : <Lock className="w-4 h-4" />}
            {loading ? 'Updating...' : 'Update Password'}
          </button>
        </div>

        <Link href="/login" className="flex items-center justify-center gap-2 text-xs text-ink-tertiary hover:text-neon-green transition-colors mt-6">
          <ArrowLeft className="w-3 h-3" /> Back to Sign In
        </Link>
      </div>
    </div>
  )
}
