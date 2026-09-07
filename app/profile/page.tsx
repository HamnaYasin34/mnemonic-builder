'use client'
import { useEffect, useState } from 'react'
import { supabase, Profile, ProfileStatus } from '../lib/supabase'
import { Activity, BookOpen, LogOut, User, Zap, TrendingUp, Save, CheckCircle2, GraduationCap, Building2, Calendar, Shield, ShieldCheck, Lock } from 'lucide-react'
import { cn } from '../lib/utils'

const MBBS_YEARS = ['1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year / Final Year']
const BDS_YEARS = ['1st Year', '2nd Year', '3rd Year', '4th Year', 'Final Year']

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [userId, setUserId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [profileStatus, setProfileStatus] = useState<string>('draft')
  const [editsRemaining, setEditsRemaining] = useState(0)
  const isLocked = profileStatus === 'locked'

  // Editable fields
  const [program, setProgram] = useState<'mbbs' | 'bds'>('mbbs')
  const [academicYear, setAcademicYear] = useState('')
  const [college, setCollege] = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { window.location.href = '/login'; return }
      setUserId(user.id)
      const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (error) {
        console.error('[ProfilePage] Failed to load profile:', error.message)
      }
      setProfile(data)
      if (data?.program) setProgram(data.program as 'mbbs' | 'bds')
      if (data?.academic_year) setAcademicYear(data.academic_year)
      if (data?.college) setCollege(data.college)
      if (data?.profile_status) setProfileStatus(data.profile_status)
      if (data?.edits_remaining !== undefined) setEditsRemaining(data.edits_remaining)
      setLoading(false)
    })
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  const handleSave = async () => {
    if (!userId || saving) return
    // When locked, only year can change (handled by handleYearUpdate)
    if (isLocked) return
    setSaving(true)
    setSaved(false)
    setSaveError('')

    try {
      // Determine new status: if verified with edits, lock after save
      const newStatus: ProfileStatus = profileStatus === 'verified' && editsRemaining > 0 ? 'locked' : profileStatus as ProfileStatus
      const newEdits = newStatus === 'locked' ? 0 : editsRemaining

      const { error } = await supabase
        .from('profiles')
        .update({
          program,
          academic_year: academicYear,
          college,
          profile_status: newStatus,
          edits_remaining: newEdits,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)

      if (error) {
        console.error('[ProfilePage] Save error:', error.message)
        setSaveError(error.message || 'Failed to save profile.')
        return
      }

      setProfileStatus(newStatus)
      setEditsRemaining(newEdits)
      setSaved(true)
      setProfile(prev => prev
        ? { ...prev, program, academic_year: academicYear, college, profile_status: newStatus, edits_remaining: newEdits }
        : { id: userId, email: '', full_name: null, avatar_url: null, total_cards: 0, total_reviews: 0, streak_days: 0, terms_accepted: false, terms_accepted_at: null, research_consent: false, research_consent_at: null, profile_status: newStatus, edits_remaining: newEdits, verified_at: null, created_at: '', updated_at: '', program, academic_year: academicYear, college }
      )
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      console.error('[ProfilePage] Save error:', err)
      setSaveError('An unexpected error occurred. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleYearUpdate = async () => {
    if (!userId || saving || !academicYear) return
    setSaving(true)
    setSaved(false)
    setSaveError('')

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          academic_year: academicYear,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)

      if (error) {
        setSaveError(error.message || 'Failed to update year.')
        return
      }

      setSaved(true)
      setProfile(prev => prev ? { ...prev, academic_year: academicYear } : prev)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      console.error('[ProfilePage] Year update error:', err)
      setSaveError('An unexpected error occurred. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const years = program === 'mbbs' ? MBBS_YEARS : BDS_YEARS
  const isComplete = program && academicYear && college.trim()

  if (loading) return (
    <div className="min-h-screen bg-void flex items-center justify-center">
      <div className="w-6 h-6 rounded-full border-2 border-neon-green border-t-transparent animate-spin" />
    </div>
  )

  return (
    <div className="min-h-screen bg-void text-ink-primary">
      {/* Header */}
      <div className="px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-neon-green/10 flex items-center justify-center">
            <Activity className="w-4 h-4 text-neon-green" />
          </div>
          <span className="text-xs font-bold tracking-widest text-ink-primary uppercase font-mono">MnemonicFlow</span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => window.location.href = '/'}
            className="text-xs text-ink-tertiary hover:text-ink-primary px-3 py-1.5 rounded-lg bg-card/40 hover:bg-card/60 transition-all">
            ← Back to App
          </button>
          <button onClick={handleSignOut}
            className="flex items-center gap-1.5 text-xs text-neon-danger hover:bg-neon-danger/10 px-3 py-1.5 rounded-lg transition-all">
            <LogOut className="w-3.5 h-3.5" /> Sign Out
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-8 py-10 space-y-8">
        {/* Avatar & Name */}
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-neon-green/10 flex items-center justify-center shadow-card-sm">
            <User className="w-8 h-8 text-neon-green" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-ink-primary">{profile?.full_name ?? 'Medical Student'}</h1>
            <p className="text-xs text-ink-tertiary mt-0.5">{profile?.email}</p>
            <p className="text-[10px] text-ink-muted mt-1 font-mono">
              Member since {new Date(profile?.created_at ?? '').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: <BookOpen className="w-4 h-4" />, label: 'Cards Saved', value: profile?.total_cards ?? 0, color: 'text-neon-green' },
            { icon: <Zap className="w-4 h-4" />, label: 'Total Reviews', value: profile?.total_reviews ?? 0, color: 'text-neon-physio' },
            { icon: <TrendingUp className="w-4 h-4" />, label: 'Day Streak', value: profile?.streak_days ?? 0, color: 'text-neon-biochem' },
          ].map((stat, i) => (
            <div key={i} className="bg-card rounded-xl shadow-card p-4 text-center transition-all duration-300 hover:-translate-y-0.5 hover:shadow-card-md">
              <div className={cn('flex justify-center mb-2 w-8 h-8 rounded-lg mx-auto bg-card/40', stat.color)}>{stat.icon}</div>
              <div className="text-2xl font-bold font-mono text-ink-primary">{stat.value}</div>
              <div className="text-[10px] text-ink-tertiary mt-1">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Onboarding / Profile Info */}
        <div className="bg-card rounded-xl shadow-card p-6 space-y-5">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-neon-green" />
            <h2 className="text-sm font-bold font-display text-ink-primary">Student Profile</h2>
            {/* Status badge */}
            <div className="ml-auto flex items-center gap-2">
              {isLocked && (
                <span className="text-[9px] px-2 py-0.5 rounded-full font-mono bg-ink-muted/10 text-ink-muted font-bold uppercase tracking-wider flex items-center gap-1">
                  <Lock className="w-2.5 h-2.5" /> Locked
                </span>
              )}
              {profileStatus === 'verified' && editsRemaining > 0 && (
                <span className="text-[9px] px-2 py-0.5 rounded-full font-mono bg-neon-physio/10 text-neon-physio font-bold uppercase tracking-wider flex items-center gap-1">
                  <Shield className="w-2.5 h-2.5" /> {editsRemaining} edit{editsRemaining !== 1 ? 's' : ''} remaining
                </span>
              )}
              {profileStatus === 'verified' && editsRemaining === 0 && (
                <span className="text-[9px] px-2 py-0.5 rounded-full font-mono bg-neon-green/10 text-neon-green font-bold uppercase tracking-wider flex items-center gap-1">
                  <ShieldCheck className="w-2.5 h-2.5" /> Verified
                </span>
              )}
              {profileStatus === 'draft' && isComplete && (
                <span className="text-[9px] px-2 py-0.5 rounded-full font-mono bg-neon-green/10 text-neon-green font-bold uppercase tracking-wider">
                  Complete
                </span>
              )}
            </div>
          </div>

          {/* Program */}
          <div className="space-y-2">
            <label className="section-label text-ink-tertiary flex items-center gap-1.5">
              <GraduationCap className="w-3 h-3" /> Program
            </label>
            <div className="flex gap-2">
              {(['mbbs', 'bds'] as const).map(p => (
                <button
                  key={p}
                  onClick={() => { setProgram(p); setAcademicYear('') }}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-xs font-bold transition-all duration-200 min-h-[44px] active:scale-[0.97]',
                    program === p
                      ? 'bg-neon-green/10 text-neon-green shadow-card-sm'
                      : 'bg-card/40 text-ink-secondary hover:text-ink-primary hover:bg-card/60'
                  )}
                  disabled={isLocked}
                >
                  <span className="text-sm">{p === 'mbbs' ? '🩺' : '🦷'}</span>
                  {p.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* College */}
          <div className="space-y-2">
            <label className="section-label text-ink-tertiary flex items-center gap-1.5">
              <Building2 className="w-3 h-3" /> {program === 'mbbs' ? 'Medical' : 'Dental'} College
            </label>
            <input
              type="text"
              value={college}
              onChange={e => setCollege(e.target.value)}
              placeholder={program === 'mbbs' ? 'e.g. Dow Medical College' : 'e.g. Dow Dental College'}
              className="input-focus-glow w-full bg-surface rounded-lg px-4 py-3 text-sm text-ink-primary placeholder:text-ink-tertiary/50 transition-all min-h-[44px] border-b border-subtle/40 focus:border-neon-green/40 outline-none"
              disabled={isLocked}
            />
          </div>

          {/* Locked notice — shows verified info */}
          {isLocked && (
            <div className="bg-neon-green/[0.04] border border-neon-green/10 rounded-xl px-4 py-3 space-y-2">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-neon-green" />
                <span className="text-[11px] font-bold text-neon-green">Profile Verified</span>
              </div>
              <div className="space-y-1 text-[11px] text-ink-secondary leading-relaxed">
                <p>Degree: <span className="text-ink-primary font-medium">{program.toUpperCase()}</span></p>
                <p>{program === 'mbbs' ? 'Medical' : 'Dental'} College: <span className="text-ink-primary font-medium">{college}</span></p>
              </div>
            </div>
          )}

          {/* Year / Semester update — always available */}
          <div className="space-y-2">
            <label className="section-label text-ink-tertiary flex items-center gap-1.5">
              <Calendar className="w-3 h-3" /> Year / Semester
              {isLocked && <span className="ml-auto text-[9px] text-neon-green font-bold uppercase tracking-wider">Updateable</span>}
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {years.map(y => (
                <button
                  key={y}
                  onClick={() => setAcademicYear(y)}
                  disabled={saving}
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

          {/* Save error */}
          {saveError && (
            <div className="bg-neon-danger/10 rounded-xl px-4 py-3 text-xs text-neon-danger leading-relaxed">
              {saveError}
            </div>
          )}

          {/* Save / Update Year button */}
          <button
            onClick={isLocked ? handleYearUpdate : handleSave}
            disabled={saving || (!isLocked && !isComplete) || (isLocked && !academicYear)}
            className={cn(
              'w-full flex items-center justify-center gap-2 py-3.5 rounded-lg text-xs font-bold transition-all duration-300 min-h-[44px]',
              saved
                ? 'bg-neon-green/10 text-neon-green glow-success'
                : 'glow-btn btn-ripple bg-neon-green text-void disabled:opacity-30 disabled:pointer-events-none'
            )}
          >
            {saved ? <CheckCircle2 className="w-4 h-4" /> : saving ? <div className="w-4 h-4 rounded-full border-2 border-void border-t-transparent animate-spin" /> : <Save className="w-4 h-4" />}
            {saved ? (isLocked ? 'Year Updated' : 'Profile Saved') : saving ? (isLocked ? 'Updating...' : 'Saving...') : (isLocked ? 'Update Year' : 'Save Profile')}
          </button>
        </div>

        {/* Progress */}
        <div className="bg-card rounded-xl shadow-card p-5">
          <p className="section-label text-ink-secondary mb-4">Study Progress</p>
          {[
            { label: 'Cards Mastered', value: Math.min((profile?.total_reviews ?? 0) * 10, 100) },
            { label: 'Streak Progress', value: Math.min((profile?.streak_days ?? 0) * 10, 100) },
          ].map((item, i) => (
            <div key={i} className="mb-3">
              <div className="flex justify-between text-[10px] text-ink-tertiary mb-1">
                <span>{item.label}</span><span>{item.value}%</span>
              </div>
              <div className="h-1.5 bg-elevated rounded-full overflow-hidden progress-bar-animated">
                <div className="h-full bg-neon-green rounded-full transition-all duration-700 ease-out" style={{ width: `${item.value}%` }} />
              </div>
            </div>
          ))}
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => window.location.href = '/'}
            className="card-hover-glow bg-card rounded-lg shadow-card flex items-center gap-2 px-4 py-3 text-xs text-ink-secondary hover:text-ink-primary">
            <Zap className="w-3.5 h-3.5 text-neon-green" /> Generate Mnemonic
          </button>
          <button onClick={() => window.location.href = '/'}
            className="card-hover-glow bg-card rounded-lg shadow-card flex items-center gap-2 px-4 py-3 text-xs text-ink-secondary hover:text-ink-primary">
            <BookOpen className="w-3.5 h-3.5 text-neon-physio" /> View Vault
          </button>
        </div>
      </div>
    </div>
  )
}
