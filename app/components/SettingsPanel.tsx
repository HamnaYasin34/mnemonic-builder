'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  X, RotateCcw, Sparkles, Zap, BookOpen, Palette, Volume2, Highlighter, Check,
  Shield, FileText, ExternalLink, Loader2,
} from 'lucide-react'
import { MnemonicType, VisualStyle, StoryStyle } from '../types'
import { cn } from '../lib/utils'
import { supabase } from '../lib/supabase'

const STORAGE_KEY = 'mnemonicflow-settings'

export interface AppSettings {
  defaultStoryStyle: StoryStyle
  defaultMnemonicType: MnemonicType
  defaultVisualStyle: VisualStyle
  autoPlayAudio: boolean
  highlightMode: boolean
}

const DEFAULT_SETTINGS: AppSettings = {
  defaultStoryStyle: 'clinical',
  defaultMnemonicType: 'hybrid',
  defaultVisualStyle: 'sketchy',
  autoPlayAudio: false,
  highlightMode: false,
}

export function loadSettings(): AppSettings {
  if (typeof window === 'undefined') return { ...DEFAULT_SETTINGS }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULT_SETTINGS }
    const parsed = JSON.parse(raw) as Partial<AppSettings>
    return { ...DEFAULT_SETTINGS, ...parsed }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

export function saveSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch {
    // silently fail if localStorage is full or blocked
  }
}

interface SettingsPanelProps {
  isOpen: boolean
  onClose: () => void
  settings: AppSettings
  onSettingsChange: (settings: AppSettings) => void
}

export default function SettingsPanel({
  isOpen, onClose, settings, onSettingsChange,
}: SettingsPanelProps) {
  const [local, setLocal] = useState<AppSettings>(settings)

  useEffect(() => {
    setLocal(settings)
  }, [settings])

  if (!isOpen) return null

  const update = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    const next = { ...local, [key]: value }
    setLocal(next)
    saveSettings(next)
    onSettingsChange(next)
  }

  const resetAll = () => {
    setLocal({ ...DEFAULT_SETTINGS })
    saveSettings(DEFAULT_SETTINGS)
    onSettingsChange(DEFAULT_SETTINGS)
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[60] animate-fade-in"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed inset-y-0 right-0 w-full max-w-md z-[70] flex flex-col bg-surface backdrop-blur-xl shadow-card-lg animate-slide-right overflow-hidden">
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-neon-green/10 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-neon-green" />
            </div>
            <div>
              <h2 className="text-sm font-bold font-display text-ink-primary">Settings</h2>
              <p className="text-[10px] text-ink-tertiary mt-0.5">Customise your learning experience</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-ink-tertiary hover:text-ink-primary hover:bg-elevated transition-all active:scale-95"
            aria-label="Close settings"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto scrollbar-none px-6 py-6 space-y-8">

          {/* Default Story Style */}
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-neon-physio" />
              <h3 className="text-xs font-bold uppercase tracking-widest font-mono text-ink-secondary">Default Story Style</h3>
            </div>
            <p className="text-[11px] text-ink-tertiary leading-relaxed">
              The narrative style applied when generating new mnemonics. You can still override per generation.
            </p>
            <div className="grid grid-cols-2 gap-2">
              {([
                { key: 'clinical' as const, label: 'Clinical', color: 'text-neon-anatomy' },
                { key: 'dramatic' as const, label: 'Dramatic', color: 'text-neon-patho' },
                { key: 'comedy' as const, label: 'Comedy', color: 'text-neon-physio' },
                { key: 'fantasy' as const, label: 'Fantasy', color: 'text-neon-biochem' },
                { key: 'horror' as const, label: 'Horror', color: 'text-ink-secondary' },
                { key: 'scifi' as const, label: 'Sci-Fi', color: 'text-neon-micro' },
                { key: 'historical' as const, label: 'Historical', color: 'text-neon-physio' },
                { key: 'detective' as const, label: 'Detective', color: 'text-neon-micro' },
                { key: 'movie' as const, label: 'Movie', color: 'text-neon-patho' },
                { key: 'anime' as const, label: 'Anime', color: 'text-neon-anatomy' },
                { key: 'meme' as const, label: 'Meme Recall', color: 'text-neon-green' },
              ]).map(opt => (
                <button
                  key={opt.key}
                  onClick={() => update('defaultStoryStyle', opt.key)}
                  className={cn(
                    'flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all duration-200 active:scale-[0.97] min-h-[44px]',
                    local.defaultStoryStyle === opt.key
                      ? 'bg-neon-green/10 text-neon-green shadow-card-sm'
                      : 'bg-card/40 hover:bg-card/60 text-ink-secondary hover:text-ink-primary'
                  )}
                >
                  <span className={cn(local.defaultStoryStyle === opt.key ? 'text-neon-green' : opt.color)}>{opt.label}</span>
                  {local.defaultStoryStyle === opt.key && <Check className="w-3.5 h-3.5 text-neon-green shrink-0" />}
                </button>
              ))}
            </div>
          </section>

          {/* Default Mnemonic Type */}
          <div className="border-t border-border/30" />
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-neon-green" />
              <h3 className="text-xs font-bold uppercase tracking-widest font-mono text-ink-secondary">Default Memory Architecture</h3>
            </div>
            <p className="text-[11px] text-ink-tertiary leading-relaxed">
              The mnemonic structure applied by default. Override anytime in the Generator.
            </p>
            <div className="grid grid-cols-2 gap-2">
              {([
                { key: 'hybrid' as const, label: 'Spatial Hybrid', desc: 'Acronym + storyline' },
                { key: 'storyline' as const, label: 'Pure Story', desc: 'Continuous narrative' },
                { key: 'acronym' as const, label: 'Acronym', desc: 'First-letter encoding' },
                { key: 'spatial' as const, label: 'Spatial', desc: 'Visual layout map' },
                { key: 'hook' as const, label: 'Crazy Hook', desc: 'One absurd line' },
                { key: 'auto' as const, label: 'Auto Select', desc: 'AI chooses best fit' },
              ]).map(opt => (
                <button
                  key={opt.key}
                  onClick={() => update('defaultMnemonicType', opt.key)}
                  className={cn(
                    'flex flex-col items-start gap-0.5 px-3 py-2.5 rounded-lg text-left transition-all duration-200 active:scale-[0.97] min-h-[44px]',
                    local.defaultMnemonicType === opt.key
                      ? 'bg-neon-green/10 shadow-card-sm'
                      : 'bg-card/40 hover:bg-card/60'
                  )}
                >
                  <span className={cn(
                    'text-xs font-bold',
                    local.defaultMnemonicType === opt.key ? 'text-neon-green' : 'text-ink-secondary'
                  )}>{opt.label}</span>
                  <span className="text-[9px] text-ink-tertiary">{opt.desc}</span>
                </button>
              ))}
            </div>
          </section>

          {/* Default Visual Style */}
          <div className="border-t border-border/30" />
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <Palette className="w-4 h-4 text-neon-biochem" />
              <h3 className="text-xs font-bold uppercase tracking-widest font-mono text-ink-secondary">Default Render Style</h3>
            </div>
            <p className="text-[11px] text-ink-tertiary leading-relaxed">
              Visual illustration style for generated memory anchor images.
            </p>
            <div className="grid grid-cols-2 gap-2">
              {([
                { key: 'sketchy' as const, label: 'Clinical Ink', desc: 'Hand-drawn line art' },
                { key: 'osmosis' as const, label: 'NeuroCanvas', desc: 'Flat-vector whiteboard' },
              ]).map(opt => (
                <button
                  key={opt.key}
                  onClick={() => update('defaultVisualStyle', opt.key)}
                  className={cn(
                    'flex flex-col items-start gap-0.5 px-3 py-3 rounded-lg text-left transition-all duration-200 active:scale-[0.97] min-h-[44px]',
                    local.defaultVisualStyle === opt.key
                      ? 'bg-neon-biochem/10 shadow-card-sm'
                      : 'bg-card/40 hover:bg-card/60'
                  )}
                >
                  <span className={cn(
                    'text-xs font-bold',
                    local.defaultVisualStyle === opt.key ? 'text-neon-biochem' : 'text-ink-secondary'
                  )}>{opt.label}</span>
                  <span className="text-[9px] text-ink-tertiary">{opt.desc}</span>
                </button>
              ))}
            </div>
          </section>

          {/* Toggles */}
          <div className="border-t border-border/30" />
          <section className="space-y-4">
            <ToggleRow
              icon={<Volume2 className="w-4 h-4 text-neon-micro" />}
              label="Auto-play Audio"
              description="Automatically read mnemonics aloud after generation"
              checked={local.autoPlayAudio}
              onChange={(v) => update('autoPlayAudio', v)}
            />
            <ToggleRow
              icon={<Highlighter className="w-4 h-4 text-neon-physio" />}
              label="Highlight Medical Terms"
              description="Auto-highlight key medical terms in explanations"
              checked={local.highlightMode}
              onChange={(v) => update('highlightMode', v)}
            />
          </section>

          {/* Privacy & Data */}
          <div className="border-t border-border/30" />
          <PrivacyDataSections />

        </div>

        {/* Footer */}
        <div className="shrink-0 p-4 space-y-2">
          <button
            onClick={resetAll}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold text-ink-tertiary hover:text-neon-danger bg-card/40 hover:bg-neon-danger/10 transition-all active:scale-[0.98]"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reset to Defaults
          </button>
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-lg text-xs font-bold bg-neon-green text-void hover:brightness-110 active:scale-[0.98] transition-all shadow-glow-sm"
          >
            Done
          </button>
        </div>
      </div>
    </>
  )
}

function ToggleRow({
  icon, label, description, checked, onChange,
}: {
  icon: React.ReactNode
  label: string
  description: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-start gap-3">
      <div className={cn(
        'shrink-0 mt-0.5 w-8 h-8 rounded-lg flex items-center justify-center',
        checked ? 'bg-neon-green/10 text-neon-green' : 'bg-card/40 text-ink-tertiary'
      )}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-bold text-ink-primary">{label}</span>
          <button
            role="switch"
            aria-checked={checked}
            onClick={() => onChange(!checked)}
            className={cn(
              'relative shrink-0 w-9 h-5 rounded-full transition-colors duration-300',
              checked ? 'bg-neon-green' : 'bg-subtle'
            )}
          >
            <span
              className={cn(
                'absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-300 ease-out',
                checked && 'translate-x-4'
              )}
            />
          </button>
        </div>
        <p className="text-[11px] text-ink-tertiary mt-0.5 leading-relaxed">{description}</p>
      </div>
    </div>
  )
}

/* ── Privacy & Data section ── */
function PrivacyDataSections() {
  const [researchConsent, setResearchConsent] = useState(false)
  const [termsAccepted, setTermsAccepted] = useState(true)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { setLoading(false); return }
      const { data } = await supabase
        .from('profiles')
        .select('terms_accepted, research_consent')
        .eq('id', user.id)
        .maybeSingle()
      if (data) {
        setTermsAccepted(data.terms_accepted ?? true)
        setResearchConsent(data.research_consent ?? false)
      }
      setLoading(false)
    })
  }, [])

  const toggleResearch = async () => {
    const next = !researchConsent
    setResearchConsent(next)
    setSaving(true)
    setSaved(false)
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase.from('profiles').upsert({
        id: user.id,
        research_consent: next,
        research_consent_at: next ? new Date().toISOString() : null,
      })
    }
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (loading) return (
    <div className="flex items-center gap-2 text-ink-tertiary text-xs">
      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading preferences...
    </div>
  )

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <Shield className="w-4 h-4 text-neon-green" />
        <h3 className="text-xs font-bold uppercase tracking-widest font-mono text-ink-secondary">Privacy & Data</h3>
      </div>

      {/* Terms status (read-only) */}
      <div className="flex items-start gap-3">
        <div className="shrink-0 mt-0.5 w-8 h-8 rounded-lg flex items-center justify-center bg-neon-green/10 text-neon-green">
          <FileText className="w-4 h-4" />
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-ink-primary">Terms of Service</span>
            <span className="text-[10px] font-mono font-bold text-neon-green bg-neon-green/10 px-2 py-0.5 rounded-full">
              {termsAccepted ? 'Accepted' : 'Not accepted'}
            </span>
          </div>
          <p className="text-[11px] text-ink-tertiary mt-0.5 leading-relaxed">
            Acceptance of Terms is required to maintain your account.
          </p>
        </div>
      </div>

      {/* Research consent toggle */}
      <div className="flex items-start gap-3">
        <div className={cn(
          'shrink-0 mt-0.5 w-8 h-8 rounded-lg flex items-center justify-center',
          researchConsent ? 'bg-neon-physio/10 text-neon-physio' : 'bg-card/40 text-ink-tertiary'
        )}>
          <Shield className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-ink-primary">Research & Analytics</span>
            <button
              role="switch"
              aria-checked={researchConsent}
              onClick={toggleResearch}
              disabled={saving}
              className={cn(
                'relative shrink-0 w-9 h-5 rounded-full transition-colors duration-300',
                researchConsent ? 'bg-neon-physio' : 'bg-subtle'
              )}
            >
              <span className={cn(
                'absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-300 ease-out',
                researchConsent && 'translate-x-4'
              )} />
            </button>
          </div>
          <p className="text-[11px] text-ink-tertiary mt-0.5 leading-relaxed">
            Allow anonymized, aggregated data usage for platform improvement and educational research.
            {saved && <span className="text-neon-green font-medium ml-1">Saved!</span>}
          </p>
        </div>
      </div>

      {/* Links */}
      <div className="flex flex-col gap-2 pt-1">
        <Link href="/terms" target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-2 text-xs text-ink-secondary hover:text-neon-green transition-colors group">
          <FileText className="w-3.5 h-3.5" />
          <span>Terms of Service</span>
          <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
        </Link>
        <Link href="/privacy" target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-2 text-xs text-ink-secondary hover:text-neon-green transition-colors group">
          <Shield className="w-3.5 h-3.5" />
          <span>Privacy Policy</span>
          <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
        </Link>
      </div>
    </section>
  )
}
