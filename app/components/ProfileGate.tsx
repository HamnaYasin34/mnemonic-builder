'use client'

// ─────────────────────────────────────────────────────────────────────────────
// app/components/ProfileGate.tsx  —  Profile setup, review & verification gate
// Blocks app usage until the student completes and confirms their profile.
// Supports: initial setup → review → confirm (verified + 1 edit)
//           edit mode → save (auto-locks via trigger) → app
// Saves to Supabase with profile_status and edits_remaining enforcement.
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react'
import {
  Activity, GraduationCap, Calendar, Building2, Save, CheckCircle2,
  ShieldCheck, Edit3, ArrowRight, Eye,
} from 'lucide-react'
import { supabase, Profile, ProfileStatus } from '../lib/supabase'
import { cn } from '../lib/utils'

const MBBS_YEARS = ['1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year / Final Year']
const BDS_YEARS = ['1st Year', '2nd Year', '3rd Year', '4th Year', 'Final Year']

interface ProfileGateProps {
  userId: string
  onComplete: (program: 'mbbs' | 'bds') => void
  profileData?: Profile | null
  onProfileUpdate?: () => void
}

type GateMode = 'setup' | 'review'

export default function ProfileGate({ userId, onComplete, profileData, onProfileUpdate }: ProfileGateProps) {
  const isEditMode = profileData?.profile_status === 'verified' && (profileData?.edits_remaining ?? 0) > 0

  const [program, setProgram] = useState<'mbbs' | 'bds'>(
    (profileData?.program as 'mbbs' | 'bds') || 'mbbs'
  )
  const [academicYear, setAcademicYear] = useState(profileData?.academic_year || '')
  const [college, setCollege] = useState(profileData?.college || '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [mode, setMode] = useState<GateMode>(
    !profileData?.program || !profileData?.academic_year || !profileData?.college || isEditMode
      ? 'setup' : 'review'
  )

  const years = program === 'mbbs' ? MBBS_YEARS : BDS_YEARS
  const isComplete = program && academicYear && college.trim()

  const handleSave = async () => {
    if (!isComplete || saving) return
    setSaving(true)
    setErrorMsg('')

    try {
      if (mode === 'setup') {
        const { error } = await supabase
          .from('profiles')
          .upsert({ id: userId, program, academic_year: academicYear, college: college.trim() })

        if (error) {
          setErrorMsg(error.message || 'Failed to save profile. Please try again.')
          return
        }

        setSaved(true)
        setTimeout(() => {
          setSaved(false)
          setMode('review')
        }, 500)
      } else {
        // Edit mode: save changes + lock profile (consumes the one allowed edit)
        const { error } = await supabase
          .from('profiles')
          .update({
            program,
            academic_year: academicYear,
            college: college.trim(),
            profile_status: 'locked' as ProfileStatus,
            edits_remaining: 0,
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId)

        if (error) {
          setErrorMsg(error.message || 'Failed to save profile. Please try again.')
          return
        }

        setSaved(true)
        onProfileUpdate?.()
        setTimeout(() => onComplete(program), 700)
      }
    } catch (err) {
      console.error('[ProfileGate] Save error:', err)
      setErrorMsg('An unexpected error occurred. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleConfirm = async () => {
    if (saving) return
    setSaving(true)
    setErrorMsg('')

    try {
      let updateData: Record<string, unknown>
      if (isEditMode) {
        // Edit mode confirm: lock profile after the one allowed edit
        updateData = {
          profile_status: 'locked' as ProfileStatus,
          edits_remaining: 0,
          updated_at: new Date().toISOString(),
        }
      } else {
        // Initial confirm: verify and grant 1 edit
        updateData = {
          profile_status: 'verified' as ProfileStatus,
          edits_remaining: 1,
          verified_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
      }

      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', userId)

      if (error) {
        setErrorMsg(error.message || 'Failed to confirm profile.')
        return
      }

      onProfileUpdate?.()
      setSaved(true)
      setTimeout(() => onComplete(program), 700)
    } catch (err) {
      console.error('[ProfileGate] Confirm error:', err)
      setErrorMsg('An unexpected error occurred. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  // ─── REVIEW STEP ──────────────────────────────────────────────────────────
  if (mode === 'review') {
    return (
      <div className="fixed inset-0 z-[100] bg-void flex items-center justify-center p-4">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/2 w-96 h-96 rounded-full opacity-[0.06] blur-3xl -translate-x-1/2"
            style={{ background: 'radial-gradient(circle, #0df27d, transparent)' }} />
          <div className="absolute bottom-1/4 right-1/3 w-72 h-72 rounded-full opacity-[0.05] blur-3xl"
            style={{ background: 'radial-gradient(circle, #7c5cfc, transparent)' }} />
        </div>

        <div className="relative w-full max-w-md space-y-6 animate-fade-up">
          <div className="text-center space-y-3">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-neon-green/10 shadow-card-sm glow-success">
              <Eye className="w-7 h-7 text-neon-green" />
            </div>
            <div>
              <h1 className="text-xl font-bold font-display text-ink-primary">Review Your Profile</h1>
              <p className="text-xs text-ink-tertiary mt-1 max-w-xs mx-auto leading-relaxed">
                Please review your information carefully before confirming.
              </p>
            </div>
          </div>

          <div className="card-surface rounded-xl p-6 space-y-4 shadow-card-lg glow-card">
            <div className="space-y-3">
              <ReviewRow label="Degree" value={program.toUpperCase()} icon={<GraduationCap className="w-4 h-4" />} />
              <ReviewRow label="Year / Semester" value={academicYear} icon={<Calendar className="w-4 h-4" />} />
              <ReviewRow
                label={program === 'mbbs' ? 'Medical College' : 'Dental College'}
                value={college}
                icon={<Building2 className="w-4 h-4" />}
              />
            </div>

            <div className="bg-amber-500/[0.06] border border-amber-500/15 rounded-xl px-4 py-3 mt-2">
              <p className="text-[11px] text-amber-400 leading-relaxed">
                After confirming, your degree and college are locked. Year / Semester can be updated anytime.
              </p>
            </div>

            {errorMsg && (
              <div className="bg-neon-danger/10 rounded-xl px-4 py-3 text-xs text-neon-danger leading-relaxed glow-error">
                {errorMsg}
              </div>
            )}

            <div className="flex gap-3 pt-1">
              <button
                onClick={() => { setMode('setup'); setErrorMsg('') }}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-xs font-bold bg-card/60 text-ink-secondary hover:text-ink-primary hover:bg-card/80 transition-all min-h-[44px] active:scale-[0.98] disabled:opacity-50"
              >
                <Edit3 className="w-3.5 h-3.5" />
                {isEditMode ? 'Edit Again' : 'Edit'}
              </button>
              <button
                onClick={handleConfirm}
                disabled={saving}
                className="glow-btn btn-ripple flex-[2] flex items-center justify-center gap-2 py-3 rounded-lg text-xs font-bold bg-neon-green text-void min-h-[44px] disabled:opacity-50 disabled:pointer-events-none"
              >
                {saving
                  ? <div className="w-4 h-4 rounded-full border-2 border-void border-t-transparent animate-spin" />
                  : saved
                    ? <CheckCircle2 className="w-4 h-4" />
                    : <><ShieldCheck className="w-4 h-4" /><span>Confirm Profile</span><ArrowRight className="w-4 h-4" /></>}
                {saving ? 'Confirming...' : saved ? 'Confirmed!' : ''}
              </button>
            </div>
          </div>

          <p className="text-[10px] text-ink-muted text-center">
            Your data stays private. We only store what&apos;s needed to personalize your experience.
          </p>
        </div>
      </div>
    )
  }

  // ─── SETUP / EDIT STEP ────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-[100] bg-void flex items-center justify-center p-4">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/2 w-96 h-96 rounded-full opacity-[0.06] blur-3xl -translate-x-1/2"
          style={{ background: 'radial-gradient(circle, #0df27d, transparent)' }} />
        <div className="absolute bottom-1/4 right-1/3 w-72 h-72 rounded-full opacity-[0.05] blur-3xl"
          style={{ background: 'radial-gradient(circle, #7c5cfc, transparent)' }} />
      </div>

      <div className="relative w-full max-w-md space-y-6 animate-fade-up">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-neon-green/10 shadow-card-sm glow-logo">
            <Activity className="w-7 h-7 text-neon-green" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-ink-primary">
              {isEditMode ? 'Edit Your Profile' : 'Welcome to MnemonicFlow'}
            </h1>
            <p className="text-xs text-ink-tertiary mt-1 max-w-xs mx-auto leading-relaxed">
              {isEditMode
                ? 'You have one edit remaining. Make your changes and confirm.'
                : 'Complete your profile to personalize your learning experience. This takes 10 seconds.'}
            </p>
          </div>
        </div>

        <div className="card-surface rounded-xl p-6 space-y-5 shadow-card-lg glow-card">
          {/* Program */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest font-mono text-ink-tertiary flex items-center gap-1.5">
              <GraduationCap className="w-3 h-3" /> Program
            </label>
            <div className="flex gap-2">
              {(['mbbs', 'bds'] as const).map(p => (
                <button
                  key={p}
                  onClick={() => { setProgram(p); setAcademicYear('') }}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-xs font-bold transition-all duration-200 min-h-[44px] active:scale-[0.97] glow-btn-soft',
                    program === p
                      ? 'bg-neon-green/10 text-neon-green shadow-card-sm'
                      : 'bg-card/40 text-ink-secondary hover:text-ink-primary hover:bg-card/60'
                  )}
                >
                  <span className="text-sm">{p === 'mbbs' ? '🩺' : '🦷'}</span>
                  {p.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Academic Year */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest font-mono text-ink-tertiary flex items-center gap-1.5">
              <Calendar className="w-3 h-3" /> Academic Year
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {years.map(y => (
                <button
                  key={y}
                  onClick={() => setAcademicYear(y)}
                  className={cn(
                    'px-3 py-2.5 rounded-lg text-xs font-semibold transition-all duration-200 min-h-[44px] active:scale-[0.97]',
                    academicYear === y
                      ? 'bg-neon-physio/10 text-neon-physio shadow-card-sm'
                      : 'bg-card/40 text-ink-secondary hover:text-ink-primary hover:bg-card/60'
                  )}
                >
                  {y}
                </button>
              ))}
            </div>
          </div>

          {/* College */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest font-mono text-ink-tertiary flex items-center gap-1.5">
              <Building2 className="w-3 h-3" /> {program === 'mbbs' ? 'Medical' : 'Dental'} College
            </label>
            <input
              type="text"
              value={college}
              onChange={e => setCollege(e.target.value)}
              placeholder={program === 'mbbs' ? 'e.g. Dow Medical College' : 'e.g. Dow Dental College'}
              className="w-full bg-surface border-b border-subtle/40 rounded-none px-4 py-3 text-sm text-ink-primary placeholder:text-ink-tertiary/50 focus:outline-none focus:border-neon-green/40 transition-all min-h-[44px] glow-input"
            />
          </div>

          {errorMsg && (
            <div className="bg-neon-danger/10 rounded-xl px-4 py-3 text-xs text-neon-danger leading-relaxed glow-error">
              {errorMsg}
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={saving || !isComplete}
            className={cn(
              'w-full flex items-center justify-center gap-2 py-3.5 rounded-lg text-xs font-bold transition-all duration-300 min-h-[44px] active:scale-[0.98] glow-btn',
              saved
                ? 'bg-neon-green/10 text-neon-green'
                : 'bg-neon-green text-void hover:brightness-110 disabled:opacity-30 disabled:pointer-events-none shadow-glow-sm'
            )}
          >
            {saved
              ? <CheckCircle2 className="w-4 h-4" />
              : saving
                ? <div className="w-4 h-4 rounded-full border-2 border-void border-t-transparent animate-spin" />
                : <Save className="w-4 h-4" />}
            {saved
              ? 'Saved!'
              : saving
                ? 'Saving...'
                : isEditMode
                  ? 'Save & Review'
                  : 'Save & Continue'}
          </button>
        </div>

        <p className="text-[10px] text-ink-muted text-center">
          Your data stays private. We only store what&apos;s needed to personalize your experience.
        </p>
      </div>
    </div>
  )
}

function ReviewRow({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 py-3 border-b border-border/20 last:border-0">
      <div className="w-8 h-8 rounded-lg bg-neon-green/5 flex items-center justify-center text-neon-green shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-widest font-mono text-ink-muted">{label}</p>
        <p className="text-sm text-ink-primary font-medium mt-0.5 truncate">{value}</p>
      </div>
    </div>
  )
}
