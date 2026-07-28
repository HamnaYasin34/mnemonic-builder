'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) window.location.href = '/login'
      else setChecking(false)
    })
  }, [])

  if (checking) return (
    <div className="min-h-screen bg-void flex items-center justify-center">
      <div className="flex items-center gap-3">
        <div className="w-5 h-5 rounded-full border-2 border-neon-green border-t-transparent animate-spin" />
        <span className="text-xs text-ink-tertiary font-mono tracking-widest">LOADING...</span>
      </div>
    </div>
  )

  return <>{children}</>
}
