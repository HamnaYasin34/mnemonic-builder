'use client'
import { useEffect, useState } from 'react'
import { supabase, Profile } from '../lib/supabase'
import { Activity, BookOpen, LogOut, User, Zap, TrendingUp } from 'lucide-react'

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { window.location.href = '/login'; return }
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(data)
      setLoading(false)
    })
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  if (loading) return (
    <div className="min-h-screen bg-void flex items-center justify-center">
      <div className="w-6 h-6 rounded-full border-2 border-neon-green border-t-transparent animate-spin" />
    </div>
  )

  return (
    <div className="min-h-screen bg-void text-ink-primary">
      <div className="border-b border-border px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-neon-green-dim border border-neon-green-border flex items-center justify-center">
            <Activity className="w-4 h-4 text-neon-green" />
          </div>
          <span className="text-xs font-bold tracking-widest text-neon-green uppercase font-mono">MnemonicFlow</span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => window.location.href = '/'}
            className="text-xs text-ink-tertiary hover:text-ink-primary px-3 py-1.5 rounded-lg border border-border hover:border-subtle transition-all">
            ← Back to App
          </button>
          <button onClick={handleSignOut}
            className="flex items-center gap-1.5 text-xs text-neon-danger hover:bg-neon-danger-dim px-3 py-1.5 rounded-lg transition-all">
            <LogOut className="w-3.5 h-3.5" /> Sign Out
          </button>
        </div>
      </div>
      <div className="max-w-2xl mx-auto px-8 py-10 space-y-6">
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-neon-green-dim border border-neon-green-border flex items-center justify-center shadow-glow-sm">
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
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: <BookOpen className="w-4 h-4" />, label: 'Cards Saved', value: profile?.total_cards ?? 0, color: 'text-neon-green' },
            { icon: <Zap className="w-4 h-4" />, label: 'Total Reviews', value: profile?.total_reviews ?? 0, color: 'text-neon-physio' },
            { icon: <TrendingUp className="w-4 h-4" />, label: 'Day Streak', value: profile?.streak_days ?? 0, color: 'text-neon-biochem' },
          ].map((stat, i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-4 text-center">
              <div className={`flex justify-center mb-2 ${stat.color}`}>{stat.icon}</div>
              <div className="text-2xl font-bold font-mono text-ink-primary">{stat.value}</div>
              <div className="text-[10px] text-ink-tertiary mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
        <div className="bg-card border border-border rounded-xl p-5">
          <p className="text-xs font-bold uppercase tracking-widest font-mono text-ink-secondary mb-4">Study Progress</p>
          {[
            { label: 'Cards Mastered', value: Math.min((profile?.total_reviews ?? 0) * 10, 100) },
            { label: 'Streak Progress', value: Math.min((profile?.streak_days ?? 0) * 10, 100) },
          ].map((item, i) => (
            <div key={i} className="mb-3">
              <div className="flex justify-between text-[10px] text-ink-tertiary mb-1">
                <span>{item.label}</span><span>{item.value}%</span>
              </div>
              <div className="h-1.5 bg-elevated rounded-full overflow-hidden">
                <div className="h-full bg-neon-green rounded-full" style={{ width: `${item.value}%`, boxShadow: '0 0 8px rgba(13,242,125,0.5)' }} />
              </div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => window.location.href = '/'}
            className="flex items-center gap-2 px-4 py-3 rounded-xl bg-card border border-border text-xs text-ink-secondary hover:text-ink-primary transition-all">
            <Zap className="w-3.5 h-3.5 text-neon-green" /> Generate Mnemonic
          </button>
          <button onClick={() => window.location.href = '/'}
            className="flex items-center gap-2 px-4 py-3 rounded-xl bg-card border border-border text-xs text-ink-secondary hover:text-ink-primary transition-all">
            <BookOpen className="w-3.5 h-3.5 text-neon-physio" /> View Vault
          </button>
        </div>
      </div>
    </div>
  )
}
