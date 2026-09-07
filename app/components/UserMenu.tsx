'use client'
import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { User, LogOut, ChevronDown, Settings } from 'lucide-react'

export default function UserMenu({ onOpenSettings }: { onOpenSettings?: () => void }) {
  const [user, setUser] = useState<any>(null)
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user))
  }, [])

  // Close the dropdown on outside click or Escape — previously it stayed open
  // until the user clicked the trigger again.
  useEffect(() => {
    if (!open) return
    const handlePointer = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false)
    }
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', handlePointer)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handlePointer)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open])

  const signOut = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  if (!user) return null

  const name = user.user_metadata?.full_name ?? user.email?.split('@')[0] ?? 'Student'
  const initials = name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)

  return (
    <div className="relative" ref={menuRef}>
      <button onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-elevated/40 hover:bg-elevated transition-all">
        <div className="w-6 h-6 rounded-lg bg-neon-green/10 flex items-center justify-center">
          <span className="text-[9px] font-bold text-neon-green font-mono">{initials}</span>
        </div>
        <span className="text-xs text-ink-secondary max-w-[80px] truncate">{name}</span>
        <ChevronDown className={`w-3 h-3 text-ink-tertiary transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-48 bg-card rounded-lg shadow-card-lg overflow-hidden z-50 animate-scale-in">
          <div className="px-4 py-3">
            <p className="text-xs font-semibold text-ink-primary truncate">{name}</p>
            <p className="text-[10px] text-ink-tertiary truncate">{user.email}</p>
          </div>
          <button onClick={() => window.location.href = '/profile'}
            className="w-full flex items-center gap-2 px-4 py-2.5 text-xs text-ink-secondary hover:bg-card hover:text-ink-primary transition-colors">
            <User className="w-3.5 h-3.5" /> My Profile
          </button>
          {onOpenSettings && (
            <button onClick={() => { onOpenSettings(); setOpen(false) }}
              className="w-full flex items-center gap-2 px-4 py-2.5 text-xs text-ink-secondary hover:bg-card hover:text-ink-primary transition-colors">
              <Settings className="w-3.5 h-3.5" /> Settings
            </button>
          )}
          <button onClick={signOut}
            className="w-full flex items-center gap-2 px-4 py-2.5 text-xs text-neon-danger hover:bg-neon-danger/8 transition-colors">
            <LogOut className="w-3.5 h-3.5" /> Sign Out
          </button>
        </div>
      )}
    </div>
  )
}