'use client'

// ─────────────────────────────────────────────────────────────────────────────
// app/components/Workspace.tsx
// Redesigned with premium accordion result split layout, Duolingo-like quizzes,
// advanced media cards, and a gorgeous model selector.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Zap, Copy, Save, RefreshCw, ChevronDown, Sparkles,
  BookOpen, CreditCard, CheckCircle2,
  ImageIcon, Download, Menu, BookMarked,
  Volume2, Layers, Highlighter, HelpCircle, ThumbsDown, ThumbsUp, Meh,
  Maximize2, Share2, X, Activity, Flame, Laugh, Ghost, Scroll, Search, Play, Sword, Smile,
  Brain, RefreshCcw, Check, AlertTriangle, Target, Heart,
} from 'lucide-react'
import { getSubject, getSubjectsByDiscipline, DISCIPLINES } from '../lib/subjects'
import { SubjectId, MnemonicOutput, GenerationStatus, MnemonicType, VisualStyle, StoryStyle, Discipline } from '../types'
import { cn } from '../lib/utils'
import { preprocessForSpeech } from '../lib/medical-pronunciation'
import { AppSettings } from './SettingsPanel'
import RetrievalTest from './RetrievalTest'
import { analytics } from '../lib/analytics'
import { aggregateLearnerInsights } from '../lib/learner-profile'
import { classifyFactType } from '../lib/fact-type'
import { selectStrategy, buildAdaptivePromptText } from '../lib/adaptive-strategy'
import { vault } from '../lib/vault'
import { supabase } from '../lib/supabase'

interface WorkspaceProps {
  activeSubject:         SubjectId
  onSubjectChange:       (subject: SubjectId) => void
  onCardSaved:           (topic: string, subject: SubjectId, mnemonic: MnemonicOutput, imageUrl?: string) => void
  onOpenSidebar:         () => void
  onOpenVault:           () => void
  vaultCollapsed:        boolean
  onToggleVaultCollapsed:() => void
  initialTopic?:         string
  onMnemonicGenerated?:  (topic: string, subjectLabel: string, result: MnemonicOutput) => void
  onViewChange?:         (view: 'dashboard' | 'workspace' | 'notes' | 'quiz' | 'examiner' | 'simulation') => void
  onQuizFromTopic?:      (topic: string, subject: SubjectId) => void
  appSettings?:          AppSettings
  onTopicChange?:        (topic: string) => void
  onExport?:             () => void
}

const STORY_STYLES_INFO = [
  {
    key: 'clinical' as const,
    title: '🏥 Clinical',
    subtitle: 'Attending Rounds',
    desc: 'Economical, precise, and educational. Grounded in diagnosis and clinical vignette.',
    icon: Activity,
    color: 'text-neon-anatomy',
    borderClass: 'border-neon-anatomy-border',
    glowClass: 'shadow-glow-anatomy',
  },
  {
    key: 'dramatic' as const,
    title: '🎭 Dramatic',
    subtitle: 'Theatrical Tension',
    desc: 'High emotional stakes, courtroom reckonings, and personal conflict mirroring biology.',
    icon: Flame,
    color: 'text-neon-patho',
    borderClass: 'border-neon-patho-border',
    glowClass: 'shadow-glow-patho',
  },
  {
    key: 'comedy' as const,
    title: '😂 Comedy',
    subtitle: 'Sitcom Timing',
    desc: 'Everyday absurd chaos, escalating misunderstandings, landing facts as the punchline.',
    icon: Laugh,
    color: 'text-neon-physio',
    borderClass: 'border-neon-physio-border',
    glowClass: 'shadow-glow-physio',
  },
  {
    key: 'fantasy' as const,
    title: '👑 Fantasy',
    subtitle: 'Mythic Chronicle',
    desc: 'Magic systems, ancient kingdoms, and curses mapped 1:1 onto biological rules.',
    icon: Sparkles,
    color: 'text-neon-biochem',
    borderClass: 'border-neon-biochem-border',
    glowClass: 'shadow-glow-biochem',
  },
  {
    key: 'horror' as const,
    title: '👻 Horror',
    subtitle: 'Atmospheric Dread',
    desc: 'Psychological suspense, abandoned settings, and a final unsettling image that sticks.',
    icon: Ghost,
    color: 'text-neon-anatomy',
    borderClass: 'border-neon-anatomy-border',
    glowClass: 'shadow-glow-anatomy',
  },
  {
    key: 'scifi' as const,
    title: '🤖 Sci-Fi',
    subtitle: 'Cybernetic Systems',
    desc: 'Life-support subroutines, neural implant overrides, and spaceship tech protocols.',
    icon: Zap,
    color: 'text-neon-micro',
    borderClass: 'border-neon-micro-border',
    glowClass: 'shadow-glow-micro',
  },
  {
    key: 'historical' as const,
    title: '⚔ Historical',
    subtitle: 'Epoch Vignettes',
    desc: 'Roman legions, Victorian shipping, or WWII resistance cells with era customs.',
    icon: Scroll,
    color: 'text-neon-physio',
    borderClass: 'border-neon-physio-border',
    glowClass: 'shadow-glow-physio',
  },
  {
    key: 'detective' as const,
    title: '🕵 Detective',
    subtitle: 'Hardboiled Noir',
    desc: 'Clipped, wary street PI working clues step-by-step to catch the mechanism culprit.',
    icon: Search,
    color: 'text-neon-micro',
    borderClass: 'border-neon-micro-border',
    glowClass: 'shadow-glow-micro',
  },
  {
    key: 'movie' as const,
    title: '🎬 Movie',
    subtitle: 'Blockbuster Trailer',
    desc: 'Propulsive cinematic present-tense energy. Heists, rescues, and dramatic twists.',
    icon: Play,
    color: 'text-neon-patho',
    borderClass: 'border-neon-patho-border',
    glowClass: 'shadow-glow-patho',
  },
  {
    key: 'anime' as const,
    title: '🎌 Anime',
    subtitle: 'Shonen Battle',
    desc: 'Tournament showdowns, training arcs, rivals, and named special technique moves.',
    icon: Sword,
    color: 'text-neon-anatomy',
    borderClass: 'border-neon-anatomy-border',
    glowClass: 'shadow-glow-anatomy',
  },
  {
    key: 'meme' as const,
    title: '🔥 Meme Recall™',
    subtitle: 'Internet Culture',
    desc: 'Chaotic POVs, group chat screenshots, hyper-relatable everyday modern-life memes.',
    icon: Smile,
    color: 'text-neon-green',
    borderClass: 'border-neon-green-border',
    glowClass: 'shadow-glow-sm',
  },
]

// ── (No client-side image URL builder — image generation now goes through
// /api/image, which calls Pollinations server-side with the secret key.) ──



export default function Workspace({
  activeSubject,
  onSubjectChange,
  onCardSaved,
  onOpenSidebar,
  onOpenVault,
  vaultCollapsed,
  onToggleVaultCollapsed,
  initialTopic,
  onMnemonicGenerated,
  onViewChange,
  onQuizFromTopic,
  appSettings,
  onTopicChange,
  onExport,
}: WorkspaceProps) {
  const [topic, setTopic] = useState('')
  const [status, setStatus] = useState<GenerationStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<MnemonicOutput | null>(null)

  // ── User-controlled mnemonic style (defaults from Settings) ─────────────
  const [mnemonicType, setMnemonicType] = useState<MnemonicType>(appSettings?.defaultMnemonicType ?? 'hybrid')
  const [visualStyle, setVisualStyle] = useState<VisualStyle>(appSettings?.defaultVisualStyle ?? 'sketchy')
  const [storyStyle, setStoryStyle] = useState<StoryStyle>(appSettings?.defaultStoryStyle ?? 'clinical')

  // Sync when settings change externally
  useEffect(() => {
    if (appSettings) {
      setMnemonicType(appSettings.defaultMnemonicType)
      setVisualStyle(appSettings.defaultVisualStyle)
      setStoryStyle(appSettings.defaultStoryStyle)
    }
  }, [appSettings])

  const subject = getSubject(activeSubject)

  // Derive discipline from the active subject for the subject selector
  const currentDiscipline = subject.discipline

  // ── Image State ──────────────────────────────────────────────────────────
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [imgStatus, setImgStatus] = useState<GenerationStatus>('idle')

  // ── Multi-sensory States ─────────────────────────────────────────────────
  const [audioOn, setAudioOn] = useState(false)
  const [visualLayerOn, setVisualLayerOn] = useState(false)
  const [highlightOn, setHighlightOn] = useState(appSettings?.highlightMode ?? false)

  // Sync highlight with settings
  useEffect(() => {
    if (appSettings) setHighlightOn(appSettings.highlightMode)
  }, [appSettings?.highlightMode])

  // ── Saved / Copied local triggers ────────────────────────────────────────
  const [copied, setCopied] = useState(false)
  const [saved, setSaved] = useState(false)
  const [confidence, setConfidence] = useState<'hard' | 'good' | 'easy' | null>(null)
  const [recallRevealed, setRecallRevealed] = useState(false)

  // FIX 7: state for failure-driven regeneration context
  const [regenerationContext, setRegenerationContext] = useState<{
    parentMnemonicId: string
    generationVersion: number
    regenerationReason: string
  } | null>(null)

  // ── Accordion States ─────────────────────────────────────────────────────
  // Learning flow: UNDERSTAND → PRIORITIZE → SEE → DECODE → CONNECT → RECALL → VALIDATE → RETAIN → APPLY
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    concept: true,       // 1. UNDERSTAND — always visible
    targets: true,       // 2. PRIORITIZE — always visible
    image: true,         // 3. SEE — always visible (hero card)
    breakdown: true,     // 4. DECODE — always visible (after visual)
    mnemonic: true,      // 5. CONNECT
    story: true,         // 6. CONNECT (narrative)
    recall: false,       // 7. RECALL
    retrieval: false,    // 8. VALIDATE
    why: false,          // 9. deeper learning
    flashcard: true,     // 10. RETAIN
  })

  const speechRef = useRef<SpeechSynthesisUtterance | null>(null)
  const resultsAnchorRef = useRef<HTMLDivElement | null>(null)

  // Auto-fill initial topic if provided
  useEffect(() => {
    if (initialTopic !== undefined) {
      setTopic(initialTopic)
    }
  }, [initialTopic])

  // Clean audio on unmount
  useEffect(() => {
    return () => {
      window.speechSynthesis?.cancel()
    }
  }, [])

  const toggleSection = (id: string) => {
    setOpenSections(prev => ({ ...prev, [id]: !prev[id] }))
  }

  // ── Image generation via Gemini (/api/image) ─────────────────────────────
  const generateImg = useCallback(async (promptText: string) => {
    setImgStatus('generating')
    try {
      const res = await fetch('/api/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visualScene: promptText, topic: topic.trim(), visualStyle }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.error ?? 'Image generation failed.')

      const dataUrl = `data:${json.image.mimeType};base64,${json.image.data}`
      setImageUrl(dataUrl)
      setImgStatus('success')
    } catch {
      setImgStatus('error')
    }
  }, [topic, visualStyle])

  // Auto-scroll to loading skeletal state or results
  useEffect(() => {
    if (status === 'generating' || status === 'success') {
      setTimeout(() => {
        resultsAnchorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 100)
    }
  }, [status])

  // Trigger image generation upon successful mnemonic yield — sends the
  // structured-scene-compiled prompt when the representation layer produced
  // one, else the legacy visualScene (which older saved cards still carry).
  useEffect(() => {
    if (status === 'success' && result && !imageUrl && imgStatus === 'idle') {
      generateImg(result.imagePrompt ?? result.visualScene)
    }
  }, [status, result, imageUrl, imgStatus, generateImg])

  // Auto-play audio when enabled in settings — narrates the memory tour
  // (visual route walkthrough) when available, else explanation + mnemonic.
  useEffect(() => {
    if (status === 'success' && result && appSettings?.autoPlayAudio && !audioOn) {
      const narration = result.memoryTour ?? `${result.explanation} ${result.mnemonic}`
      const utter = new SpeechSynthesisUtterance(preprocessForSpeech(narration))
      utter.rate = 0.95
      utter.onend = () => setAudioOn(false)
      speechRef.current = utter
      window.speechSynthesis?.speak(utter)
      setAudioOn(true)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, result, appSettings?.autoPlayAudio])

  // ── AI Mnemonic Generation Trigger ────────────────────────────────────────
  const generate = useCallback(async () => {
    if (!topic.trim()) return
    setStatus('generating')
    setError(null)
    setResult(null)
    setImageUrl(null)
    setImgStatus('idle')
    setSaved(false)
    setConfidence(null)
    setRecallRevealed(false)

    // Stop current speaking
    window.speechSynthesis?.cancel()
    setAudioOn(false)

    try {
      // Phase 5: build compact adaptive signal from learner evidence
      const { profile, signal } = aggregateLearnerInsights()

      // FIX 3: classify fact type from topic + subject (no symbols yet pre-generation)
      const factType = classifyFactType(topic.trim(), [], subject.id)

      // FIX 4: use the real adaptive strategy engine
      const strategyRec = selectStrategy(factType, signal, undefined)
      const adaptationText = buildAdaptivePromptText(strategyRec, factType)

      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topic.trim(),
          subject: subject.id,
          mnemonicType,
          visualStyle,
          storyStyle,
          learnerProfile: signal,
          factType,
          adaptationText,
          // FIX 7: versioning for regenerated mnemonics
          parentMnemonicId: regenerationContext?.parentMnemonicId,
          generationVersion: regenerationContext?.generationVersion,
          regenerationReason: regenerationContext?.regenerationReason,
        }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.error ?? 'Generation failed.')

      const data: MnemonicOutput = json.data
      setResult(data)
      setStatus('success')
      setRegenerationContext(null) // clear after successful generation
      // Update the active topic for cross-view context
      onTopicChange?.(topic.trim())
      // Phase 5: emit mnemonic_generated event
      analytics.log('mnemonic_generated', topic.trim(), subject.id, {
        architecture: data.architecture ?? 'unknown',
        symbolCount: data.symbols?.length ?? 0,
        factType,
      })
      // Image generation is handled by the useEffect watcher below (avoids duplicate API call)
      if (onMnemonicGenerated) {
        onMnemonicGenerated(topic.trim(), subject.label, data)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
      setStatus('error')
    }
  }, [topic, subject.id, subject.label, generateImg, mnemonicType, visualStyle, storyStyle, onMnemonicGenerated, regenerationContext])

  // ── Audio playback — narrates the memory tour (visual route walkthrough)
  // derived from the symbol map, falling back to explanation + mnemonic ──
  const toggleAudio = useCallback(() => {
    if (!result) return
    if (audioOn) {
      window.speechSynthesis?.cancel()
      setAudioOn(false)
      return
    }
    const narration = result.memoryTour ?? `${result.explanation} ${result.mnemonic}`
    const utter = new SpeechSynthesisUtterance(preprocessForSpeech(narration))
    utter.rate = 0.95
    utter.onend = () => setAudioOn(false)
    speechRef.current = utter
    window.speechSynthesis?.speak(utter)
    setAudioOn(true)
  }, [result, audioOn])

  const toggleHighlight = useCallback(() => setHighlightOn(h => !h), [])
  const toggleVisualLayer = useCallback(() => setVisualLayerOn(v => !v), [])

  const handleConfidence = useCallback((level: 'hard' | 'good' | 'easy') => {
    setConfidence(level)
  }, [])

  const handleCopy = () => {
    if (!result) return
    const symbolMap = result.symbols?.length
      ? `\n\nSYMBOL MAP:\n${result.symbols.map(s => `${s.cue} → ${s.fact}`).join('\n')}`
      : ''
    const text = `${result.explanation}\n\nMNEMONIC:\n${result.mnemonic}\n\nSTORY:\n${result.story}${symbolMap}`
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSave = () => {
    if (!result || saved) return
    onCardSaved(topic.trim(), subject.id, result, imageUrl ?? undefined)
    setSaved(true)
    analytics.log('flashcard_created', topic.trim(), subject.id)
  }

  const handleUnsave = () => {
    if (!result || !saved) return
    // Derive the mnemonicId used when saving
    const mnemonicId = result.mnemonicId ?? `mn_${topic.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 40)}`
    // Remove from localStorage vault
    const cards = vault.load()
    const match = cards.find(c => {
      const cId = c.mnemonic.mnemonicId ?? `mn_${c.topic.toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 40)}`
      return cId === mnemonicId || c.topic === topic.trim()
    })
    if (match) vault.delete(match.id)
    // Remove from Supabase (best-effort, fire-and-forget)
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        fetch('/api/vault', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mnemonicId }),
        }).catch(() => {})
      }
    })
    setSaved(false)
  }

  return (
    <div className="view-container bg-void/10">
      <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-8">

        {/* ── Top Nav / Header ── */}
        <header className="flex items-center justify-between pb-4 shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={onOpenSidebar}
              className="lg:hidden p-2 rounded-xl bg-card text-ink-secondary hover:text-white transition-all active:scale-95 shadow-card-sm"
              aria-label="Open sidebar"
            >
              <Menu className="w-4.5 h-4.5" />
            </button>
            <div>
              <h2 className="text-xs font-mono font-bold uppercase tracking-widest text-ink-secondary">Generator Console</h2>
              <p className="text-[10px] text-ink-tertiary mt-0.5 tracking-wide">AI Medical Intelligence Workspace</p>
            </div>
          </div>

          <button
            onClick={onToggleVaultCollapsed}
            className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-elevated/60 hover:bg-elevated hover:text-white transition-all duration-300 active:scale-95"
          >
            <BookMarked className="w-3.5 h-3.5" />
            <span>{vaultCollapsed ? 'Open Vault Rail' : 'Collapse Vault'}</span>
          </button>
        </header>

        {/* ── Subject selector ── */}
        <div className="space-y-2">
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-card/60">
            <span className="text-xl p-1.5 rounded-lg bg-subtle/20 shrink-0">{subject.icon}</span>
            <div className="min-w-0 flex-1">
              <h3 className="text-[10px] font-mono font-bold uppercase tracking-widest truncate" style={{ color: subject.accent }}>{subject.label}</h3>
              <p className="text-[10px] text-ink-tertiary mt-0.5 leading-normal line-clamp-1">{subject.description}</p>
            </div>
            <ChevronDown className="w-4 h-4 text-ink-tertiary shrink-0" />
          </div>
          {/* Discipline tabs + subject dropdown */}
          <div className="flex gap-1 p-0.5 bg-card/30 rounded-lg">
            {DISCIPLINES.map(d => (
              <button
                key={d.id}
                onClick={() => {
                  const subs = getSubjectsByDiscipline(d.id)
                  if (subs.length > 0) onSubjectChange(subs[0].id)
                }}
                className={cn(
                  'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all duration-200',
                  currentDiscipline === d.id
                    ? 'bg-elevated text-ink-primary shadow-sm'
                    : 'text-ink-tertiary hover:text-ink-secondary hover:bg-elevated/30'
                )}
              >
                <span className="text-xs">{d.icon}</span>
                <span>{d.label}</span>
              </button>
            ))}
          </div>
          <select
            value={activeSubject}
            onChange={e => onSubjectChange(e.target.value as SubjectId)}
            className="w-full bg-card/40 border border-border/40 rounded-lg px-3 py-2.5 text-xs font-semibold text-ink-primary outline-none focus:border-neon-green/40 transition-all cursor-pointer appearance-none"
            style={{ backgroundImage: 'none' }}
          >
            {getSubjectsByDiscipline(currentDiscipline).map(s => (
              <option key={s.id} value={s.id}>{s.icon} {s.label}</option>
            ))}
          </select>
        </div>

        {/* ── Generation Input Form ── */}
        <div className="space-y-6">
          <div className="space-y-2">
            <label htmlFor="topic-input" className="section-label text-ink-tertiary">Topic keywords</label>
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-ink-tertiary group-focus-within:text-neon-green transition-colors" />
              <input
                id="topic-input"
                type="text"
                value={topic}
                onChange={e => setTopic(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && generate()}
                placeholder="What medical concept are you mastering today?"
                className="w-full bg-transparent border-b border-subtle/40 pl-11 pr-12 py-4 sm:py-3.5 text-sm sm:text-base text-ink-primary placeholder:text-ink-tertiary/60 outline-none focus:border-neon-green/40 transition-all duration-200"
              />
              {topic && (
                <button
                  onClick={() => setTopic('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-ink-tertiary hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Mnemonic Structure & Card Visual Selector */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="section-label text-ink-tertiary mb-2">Memory Architecture</p>
              <div className="grid grid-cols-2 gap-2">
                {([
                  { key: 'hybrid' as const, label: 'Spatial Hybrid', desc: 'Acronym + storyline' },
                  { key: 'storyline' as const, label: 'Pure Story', desc: 'Continuous narrative' },
                  { key: 'hook' as const, label: 'Crazy Hook', desc: 'One absurd, unforgettable line' },
                  { key: 'auto' as const, label: 'Auto Select', desc: 'AI picks the best fit' },
                ]).map(opt => (
                  <button
                    key={opt.key}
                    onClick={() => setMnemonicType(opt.key)}
                    className={cn(
                      'flex flex-col items-start gap-0.5 px-3 py-2.5 rounded-lg text-left transition-all duration-200 border active:scale-[0.97]',
                      mnemonicType === opt.key
                        ? 'bg-neon-green/[0.06] border-neon-green/40'
                        : 'bg-card/20 border-transparent hover:bg-card/50 hover:border-border'
                    )}
                  >
                    <span className={cn('text-xs font-bold', mnemonicType === opt.key ? 'text-neon-green' : 'text-ink-secondary')}>{opt.label}</span>
                    <span className="text-[9px] text-ink-tertiary leading-normal">{opt.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="section-label text-ink-tertiary mb-2">Image Render Style</p>
              <div className="grid grid-cols-2 gap-2">
                {([
                  { key: 'sketchy' as const, label: 'Clinical Ink™', desc: 'Hand-drawn, rich lineart' },
                  { key: 'osmosis' as const, label: 'NeuroCanvas™', desc: 'Flat-vector whiteboard' },
                ]).map(opt => (
                  <button
                    key={opt.key}
                    onClick={() => setVisualStyle(opt.key)}
                    className={cn(
                      'flex flex-col items-start gap-0.5 px-3 py-2.5 rounded-lg text-left transition-all duration-200 border active:scale-[0.97]',
                      visualStyle === opt.key
                        ? 'bg-ai/[0.06] border-ai/40'
                        : 'bg-card/20 border-transparent hover:bg-card/50 hover:border-border'
                    )}
                  >
                    <span className={cn('text-xs font-bold', visualStyle === opt.key ? 'text-ai' : 'text-ink-secondary')}>{opt.label}</span>
                    <span className="text-[9px] text-ink-tertiary leading-normal">{opt.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Premium Narrative Story Style Selector */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <p className="section-label text-ink-tertiary">Narrative Story Style Mode</p>
              <span className="text-[9px] text-ink-tertiary font-mono uppercase bg-subtle/40 px-2.5 py-0.5 rounded-full">Dual AI Engine</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
              {STORY_STYLES_INFO.map(style => {
                const IconComp = style.icon
                const isSelected = storyStyle === style.key
                return (
                  <button
                    key={style.key}
                    type="button"
                    onClick={() => setStoryStyle(style.key)}
                    className={cn(
                      'group relative flex items-center gap-2.5 px-3 py-3 rounded-lg text-left transition-all duration-200 border',
                      'active:scale-[0.97]',
                      isSelected
                        ? 'bg-neon-green/[0.05] border-neon-green/30'
                        : 'bg-card/20 border-transparent hover:bg-card/40 hover:border-border'
                    )}
                  >
                    {/* Selected left accent bar */}
                    {isSelected && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[2px] rounded-full bg-neon-green" />
                    )}
                    <div className={cn(
                      'p-1.5 rounded-md transition-all duration-200 shrink-0',
                      isSelected ? 'bg-neon-green/10 text-neon-green' : 'bg-subtle/30 text-ink-tertiary'
                    )}>
                      <IconComp className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className={cn('text-[11px] font-bold transition-colors truncate', isSelected ? 'text-white' : 'text-ink-secondary group-hover:text-ink-primary')}>
                        {style.title}
                      </div>
                      <div className="text-[9px] text-ink-tertiary truncate">
                        {style.subtitle}
                      </div>
                    </div>
                    {isSelected && (
                      <Check className="w-3 h-3 text-neon-green shrink-0" />
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Action Trigger Button */}
          <button
            onClick={generate}
            disabled={status === 'generating' || !topic.trim()}
            className={cn(
              'glow-btn btn-ripple w-full flex items-center justify-center gap-2.5 py-4 rounded-xl text-sm font-bold',
              'bg-neon-green text-void disabled:opacity-40 disabled:pointer-events-none',
              status === 'generating' && 'animate-subtle-pulse'
            )}
          >
            {status === 'generating' ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Constructing your memory anchor...</span>
              </>
            ) : (
              <>
                <Zap className="w-4 h-4" />
                <span>Generate Mnemonic + Image</span>
              </>
            )}
          </button>
        </div>

        {/* ── Results Container anchor ── */}
        <div ref={resultsAnchorRef} />

        {/* ── Loading Skeleton State ── */}
        {status === 'generating' && (
          <div className="space-y-4 pt-6 animate-fade-in">
            <p className="text-[10px] font-mono tracking-widest text-ink-tertiary uppercase animate-pulse">Constructing your memory anchor...</p>
            <div className="h-6 w-36 skeleton-block" />
            <div className="h-32 skeleton-block rounded-2xl" />
            <div className="grid grid-cols-2 gap-4">
              <div className="h-20 skeleton-block" />
              <div className="h-20 skeleton-block" />
            </div>
          </div>
        )}

        {/* ── Error Banner ── */}
        {status === 'error' && error && (
          <div className="p-4 rounded-xl border border-neon-danger/20 bg-neon-danger/8 text-neon-danger text-xs sm:text-sm leading-relaxed animate-fade-in">
            {error}
          </div>
        )}

        {/* ── Success - Collapsible Accordion sections ── */}
        {status === 'success' && result && (
          <div className="space-y-6 pt-6">
            
            {/* Multi-sensory layout controls */}
            <div className="flex gap-2.5">
              <button
                onClick={toggleAudio}
                aria-pressed={audioOn}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold',
                  'transition-all duration-200 active:scale-95',
                  audioOn
                    ? 'bg-neon-green/[0.06] text-neon-green border border-neon-green/20'
                    : 'bg-card/20 text-ink-tertiary hover:text-white hover:bg-card/40 border border-transparent'
                )}
              >
                <Volume2 className="w-4 h-4" />
                <span>{audioOn ? 'Stop Audio' : 'Audio Readout'}</span>
              </button>
              <button
                onClick={toggleVisualLayer}
                aria-pressed={visualLayerOn}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold',
                  'transition-all duration-200 active:scale-95',
                  visualLayerOn
                    ? 'bg-ai/[0.06] text-ai border border-ai/20'
                    : 'bg-card/20 text-ink-tertiary hover:text-white hover:bg-card/40 border border-transparent'
                )}
              >
                <Layers className="w-4 h-4" />
                <span>Visual Overlay</span>
              </button>
              <button
                onClick={toggleHighlight}
                aria-pressed={highlightOn}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold',
                  'transition-all duration-200 active:scale-95',
                  highlightOn
                    ? 'bg-neon-physio/[0.06] text-neon-physio border border-neon-physio/20'
                    : 'bg-card/20 text-ink-tertiary hover:text-white hover:bg-card/40 border border-transparent'
                )}
              >
                <Highlighter className="w-4 h-4" />
                <span>High Yield Highlight</span>
              </button>
            </div>

            {/* Result Layout — Learning Flow: UNDERSTAND → PRIORITIZE → SEE → DECODE → CONNECT → RECALL → VALIDATE → RETAIN → APPLY */}
            <div className="space-y-4">

              {/* ═══════════════════════════════════════════════════════════
                  1. CONCEPT & EXPLANATION — immediately readable
                  ══════════════════════════════════════════════════════════ */}
              <div className="rounded-xl border border-border/20 bg-card/40 p-5 animate-fade-in">
                <div className="flex items-center gap-2.5 mb-3">
                  <BookOpen className="w-4 h-4 text-neon-green" />
                  <h3 className="text-sm font-bold font-display text-ink-primary">Concept & Explanation</h3>
                </div>
                <p className="text-sm text-ink-primary leading-relaxed whitespace-pre-line">
                  {highlightOn ? <HighYieldHighlight text={result.explanation} /> : result.explanation}
                </p>
              </div>

              {/* ═══════════════════════════════════════════════════════════
                  2. MEMORY TARGETS & HIGH-YIELD FACTS — immediately scannable
                  ═══════════════════════════════════════════════════════════ */}
              {(result.memoryTargets?.length || result.highYieldAssociations?.length) ? (
                <div className="rounded-xl border border-border/20 bg-card/40 p-5 animate-fade-in">
                  <div className="flex items-center gap-2.5 mb-3">
                    <Target className="w-4 h-4 text-neon-anatomy" />
                    <h3 className="text-sm font-bold font-display text-ink-primary">Memory Targets & High-Yield Facts</h3>
                  </div>
                  {result.memoryTargets?.length ? (
                    <div className="space-y-1.5">
                      <p className="section-label text-ink-tertiary">What to encode — priority order</p>
                      <ol className="space-y-1.5">
                        {result.memoryTargets.map((t, i) => (
                          <li key={i} className="flex gap-2.5 text-xs text-ink-primary leading-relaxed">
                            <span className="shrink-0 font-mono text-[10px] font-bold text-neon-anatomy mt-0.5">{String(i + 1).padStart(2, '0')}</span>
                            <span>{t}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  ) : null}
                  {result.highYieldAssociations?.length ? (
                    <div className="space-y-1.5 pt-3">
                      <p className="section-label text-ink-tertiary">High-yield associations</p>
                      <ul className="space-y-1.5">
                        {result.highYieldAssociations.map((a, i) => (
                          <li key={i} className="flex gap-2.5 text-xs text-ink-primary leading-relaxed">
                            <span className="shrink-0 text-neon-physio font-bold mt-0.5">→</span>
                            <span>{a}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {/* ═══════════════════════════════════════════════════════════
                  3. VISUAL MEMORY ANCHOR — Generated image as the MAIN OUTPUT
                  ══════════════════════════════════════════════════════════ */}
              <div className="rounded-2xl overflow-hidden border border-border/30 bg-card/40 animate-fade-in">
                {/* Image header */}
                <div className="px-5 py-4 border-b border-border/20">
                  <div className="flex items-center gap-2.5">
                    <ImageIcon className="w-4 h-4 text-neon-patho" />
                    <h3 className="text-sm font-bold font-display text-ink-primary">Visual Memory Anchor</h3>
                    {result.architecture && (
                      <span className="text-[9px] px-2 py-0.5 rounded-full bg-neon-patho/10 text-neon-patho font-mono font-bold uppercase tracking-wider">
                        {result.architecture}
                      </span>
                    )}
                  </div>
                  {result.visualMemoryAnchor && (
                    <p className="text-xs text-ink-secondary mt-2 leading-relaxed">{result.visualMemoryAnchor}</p>
                  )}
                </div>
                {/* Image body — prominent, full-width */}
                <div className="p-4">
                  <PremiumImageCard
                    imageUrl={imageUrl}
                    imgStatus={imgStatus}
                    onRegenerate={() => generateImg(result.imagePrompt ?? result.visualScene)}
                    visualScene={result.visualScene}
                  />
                </div>
                {/* Image caption */}
                <div className="px-5 pb-4">
                  <p className="text-[10px] text-ink-tertiary leading-relaxed">The visual version of your narrative storyline — the image acts out the story, beat by beat.</p>
                </div>
              </div>

              {/* ═══════════════════════════════════════════════════════════
                  4. SYMBOL MAP & MEMORY BREAKDOWN — immediately readable
                  ═══════════════════════════════════════════════════════════ */}
              {result.mnemonicKey && (
                <div className="rounded-xl border border-border/20 bg-card/40 p-5 animate-fade-in">
                  <div className="flex items-center gap-2.5 mb-3">
                    <Sparkles className="w-4 h-4 text-neon-biochem" />
                    <h3 className="text-sm font-bold font-display text-ink-primary">
                      {result.symbols?.length ? 'Symbol Map & Memory Breakdown' : 'Memory Breakdown'}
                    </h3>
                  </div>
                  {result.symbols?.length ? (
                    <div className="space-y-2.5">
                      {result.architecture && (
                        <span className="inline-block text-[9px] px-2.5 py-1 rounded-full bg-neon-green/10 text-neon-green font-mono uppercase tracking-wider">
                          Architecture: {result.architecture}
                        </span>
                      )}
                      {result.symbols.map((sym, i) => (
                        <div key={i} className="p-3 rounded-xl bg-subtle/30 border border-subtle/50">
                          <div className="flex items-start gap-2.5">
                            <span className="shrink-0 mt-0.5 w-5 h-5 rounded-md bg-neon-green/10 text-neon-green text-[10px] font-mono font-bold flex items-center justify-center">
                              {i + 1}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs leading-relaxed">
                                <span className="font-bold text-white">{sym.cue}</span>
                                <span className="text-neon-green font-bold mx-1.5">→</span>
                                <span className="text-ink-primary">{sym.fact}</span>
                              </p>
                              {(sym.type || sym.location || sym.action || sym.qualityLabel) && (
                                <div className="flex flex-wrap gap-1.5 mt-2">
                                  {sym.type && (
                                    <span className="text-[9px] px-2 py-0.5 rounded-full bg-neon-physio/10 text-neon-physio font-mono">{sym.type}</span>
                                  )}
                                  {sym.location && (
                                    <span className="text-[9px] px-2 py-0.5 rounded-full bg-subtle text-ink-tertiary font-mono">{sym.location}</span>
                                  )}
                                  {sym.action && (
                                    <span className="text-[9px] px-2 py-0.5 rounded-full bg-neon-anatomy/10 text-neon-anatomy font-mono">{sym.action}</span>
                                  )}
                                  {sym.qualityLabel && (
                                    <span className={cn(
                                      'text-[9px] px-2 py-0.5 rounded-full font-bold',
                                      sym.qualityLabel === 'Excellent'
                                        ? 'bg-neon-green/10 text-neon-green'
                                        : sym.qualityLabel === 'Strong'
                                          ? 'bg-neon-physio/10 text-neon-physio'
                                          : sym.qualityLabel === 'Acceptable'
                                            ? 'bg-neon-anatomy/10 text-neon-anatomy'
                                            : 'bg-neon-danger/10 text-neon-danger'
                                    )}>
                                      {sym.qualityLabel}
                                    </span>
                                  )}
                                </div>
                              )}
                              {sym.retrievalTrigger && (
                                <p className="text-[10px] text-ink-tertiary mt-1.5 italic">
                                  <span className="font-mono text-neon-green/70 not-italic">Recall:</span> {sym.retrievalTrigger}
                                </p>
                              )}
                              {sym.memoryProblem && (
                                <p className="text-[9px] text-ink-muted mt-1 font-mono">
                                  <span className="text-ink-tertiary">Memory problem:</span> {sym.memoryProblem}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                      {result.sceneRoute && (
                        <p className="text-[10px] text-ink-tertiary leading-relaxed pt-1">
                          <span className="font-mono uppercase tracking-wider text-ink-secondary">Route:</span> {result.sceneRoute}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-ink-primary leading-relaxed whitespace-pre-line">{result.mnemonicKey}</p>
                  )}
                </div>
              )}

              {/* ═══════════════════════════════════════════════════════════
                  5. MNEMONIC ANCHOR
                  ═══════════════════════════════════════════════════════════ */}
              {result.mnemonic && (
                <AccordionCard
                  id="mnemonic"
                  title="The Mnemonic Anchor"
                  icon={<Zap className="w-4 h-4 text-neon-physio" />}
                  isOpen={openSections.mnemonic}
                  onToggle={() => toggleSection('mnemonic')}
                  highlight={visualLayerOn}
                >
                  <div className="p-4 rounded-xl bg-neon-green/5 border-l-2 border-neon-green">
                    <p className="text-sm font-bold text-ink-primary leading-relaxed">{result.mnemonic}</p>
                  </div>
                </AccordionCard>
              )}

              {/* ═══════════════════════════════════════════════════════════
                  6. NARRATIVE STORYLINE
                  ═══════════════════════════════════════════════════════════ */}
              {result.story && (
                <AccordionCard
                  id="story"
                  title="Narrative Storyline"
                  icon={<Activity className="w-4 h-4 text-neon-anatomy" />}
                  isOpen={openSections.story}
                  onToggle={() => toggleSection('story')}
                >
                  <p className="text-sm text-ink-primary leading-relaxed whitespace-pre-line mb-3">{result.story}</p>
                  <div className="flex flex-wrap gap-1.5 pt-2">
                    {result.tags?.map(tagItem => (
                      <span key={tagItem} className="text-[9px] px-2.5 py-0.5 rounded-full bg-subtle text-ink-tertiary font-mono">#{tagItem}</span>
                    ))}
                  </div>
                </AccordionCard>
              )}

              {/* ═══════════════════════════════════════════════════════════
                  7. RECALL CHALLENGE
                  ══════════════════════════════════════════════════════════ */}
              {result.quizQuestion && (
                <AccordionCard
                  id="recall"
                  title="Recall Challenge"
                  icon={<HelpCircle className="w-4 h-4 text-neon-micro" />}
                  isOpen={openSections.recall}
                  onToggle={() => toggleSection('recall')}
                >
                  <p className="text-sm font-semibold text-white leading-relaxed">{result.quizQuestion}</p>
                  <button
                    onClick={() => setRecallRevealed(r => !r)}
                    className={cn(
                      'mt-3 flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[10px] font-bold transition-all active:scale-95',
                      recallRevealed ? 'bg-card/40 text-ink-secondary hover:bg-card/60' : 'bg-neon-micro/10 text-neon-micro hover:bg-neon-micro/20'
                    )}
                  >
                    {recallRevealed ? <Check className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                    {recallRevealed ? 'Hide Answer' : 'Reveal Answer'}
                  </button>
                  {recallRevealed && result.quizAnswer && (
                    <div className="mt-3 p-3 rounded-xl bg-neon-green/5 border-l-2 border-neon-green animate-fade-in">
                      <p className="text-xs text-ink-primary leading-relaxed">{result.quizAnswer}</p>
                    </div>
                  )}
                </AccordionCard>
              )}

              {/* ══════════════════════════════════════════════════════════
                  8. RETRIEVAL VALIDATION
                  ═══════════════════════════════════════════════════════════ */}
              {result.symbols?.length && result.symbols.length >= 2 && (
                <AccordionCard
                  id="retrieval"
                  title="Retrieval Validation"
                  icon={<Target className="w-4 h-4 text-neon-green" />}
                  isOpen={openSections.retrieval}
                  onToggle={() => toggleSection('retrieval')}
                >
                  <RetrievalTest
                    topic={topic}
                    result={result}
                    subject={subject.id}
                    onRegenerateAlternative={(diagnosis) => {
                      setRegenerationContext({
                        parentMnemonicId: result.mnemonicId ?? topic.trim(),
                        generationVersion: (result.generationVersion ?? 1) + 1,
                        regenerationReason: diagnosis.reason,
                      })
                      setTimeout(() => { generate() }, 50)
                    }}
                  />
                </AccordionCard>
              )}

              {/* ═══════════════════════════════════════════════════════════
                  9. COGNITIVE PSYCHOLOGY ANALYSIS
                  ══════════════════════════════════════════════════════════ */}
              <AccordionCard
                id="why"
                title="Cognitive Psychology Analysis"
                icon={<Brain className="w-4 h-4 text-neon-micro" />}
                isOpen={openSections.why}
                onToggle={() => toggleSection('why')}
              >
                {result.cognitivePrinciples?.length ? (
                  <ul className="space-y-2.5">
                    {result.cognitivePrinciples.map((p, i) => (
                      <li key={i} className="flex gap-2.5 text-xs text-ink-secondary leading-relaxed">
                        <Brain className="w-3.5 h-3.5 text-neon-micro shrink-0 mt-0.5" />
                        <span>{p}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-ink-secondary leading-relaxed">
                    Medical information is highly complex. By layering the concept of <span className="text-neon-green font-semibold">{topic}</span> into structured spatial hooks and semantic anchors, we reduce cognitive load on retrieval. Spaced reviews using the Anki card below will ensure migration into your long-term storage pathways.
                  </p>
                )}
              </AccordionCard>

              {/* ═══════════════════════════════════════════════════════════
                  10. SRS FLASHCARD & ANKI EXPORT
                  ═══════════════════════════════════════════════════════════ */}
              <AccordionCard
                id="flashcard"
                title="SRS Flashcard & Anki Export"
                icon={<CreditCard className="w-4 h-4 text-neon-green" />}
                isOpen={openSections.flashcard}
                onToggle={() => toggleSection('flashcard')}
              >
                <div className="space-y-4">
                  <FlipPreview card={{ id: 'preview', topic, subject: subject.id, mnemonic: result } as any} />
                  
                  {/* Rating Confidence */}
                  <div className="pt-2">
                    <p className="section-label text-ink-tertiary mb-1.5">Rate recall difficulty to save</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleConfidence('hard')}
                        className={cn(
                          'flex-1 flex items-center justify-center gap-1 py-2 rounded-xl text-xs font-bold transition-all active:scale-95',
                          confidence === 'hard' ? 'bg-neon-danger/10 text-neon-danger' : 'bg-card/30 text-ink-secondary hover:bg-card/50'
                        )}
                      >
                        <ThumbsDown className="w-3.5 h-3.5" /> Hard
                      </button>
                      <button
                        onClick={() => handleConfidence('good')}
                        className={cn(
                          'flex-1 flex items-center justify-center gap-1 py-2 rounded-xl text-xs font-bold transition-all active:scale-95',
                          confidence === 'good' ? 'bg-neon-physio/10 text-neon-physio' : 'bg-card/30 text-ink-secondary hover:bg-card/50'
                        )}
                      >
                        <Meh className="w-3.5 h-3.5" /> Good
                      </button>
                      <button
                        onClick={() => handleConfidence('easy')}
                        className={cn(
                          'flex-1 flex items-center justify-center gap-1 py-2 rounded-xl text-xs font-bold transition-all active:scale-95',
                          confidence === 'easy' ? 'bg-neon-green/10 text-neon-green' : 'bg-card/30 text-ink-secondary hover:bg-card/50'
                        )}
                      >
                        <ThumbsUp className="w-3.5 h-3.5" /> Easy
                      </button>
                    </div>
                  </div>

                  <div className="flex gap-2.5 pt-2">
                    <button
                      onClick={saved ? handleUnsave : handleSave}
                      disabled={!confidence && !saved}
                      className={cn(
                        'flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl text-xs font-bold transition-all duration-300',
                        saved
                          ? 'bg-neon-green/10 text-neon-green border border-neon-green/20 hover:bg-neon-danger/10 hover:text-neon-danger hover:border-neon-danger/20 active:scale-[0.98]'
                          : 'bg-neon-green text-void hover:brightness-110 active:scale-[0.98] disabled:opacity-30 disabled:pointer-events-none shadow-card-sm'
                      )}
                    >
                      {saved ? <Heart className="w-4 h-4 fill-current" /> : <Save className="w-4 h-4" />}
                      {saved ? '\u2713 Saved \u2014 Tap to Unsave' : '\u2661 Save Mnemonic'}
                    </button>
                    <button
                      onClick={handleCopy}
                      className="flex items-center gap-1.5 px-4.5 py-3.5 rounded-xl text-xs font-semibold bg-elevated/60 text-ink-secondary hover:text-white hover:bg-elevated transition-all active:scale-[0.98]"
                    >
                      {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-neon-green" /> : <Copy className="w-3.5 h-3.5" />}
                      {copied ? 'Copied!' : 'Copy Text'}
                    </button>
                  </div>
                </div>
              </AccordionCard>

            </div>

            {/* Premium Action Redirection Area */}
            <div className="p-6 rounded-xl bg-card/60 space-y-4 border border-border/20">
              <div className="text-center">
                <h4 className="text-xs font-mono font-bold uppercase tracking-widest text-ink-secondary">Clinical Engagement Arena</h4>
                <p className="text-[11px] text-ink-tertiary mt-1">Harness advanced spacing & high-yield revision channels</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  onClick={() => {
                    if (result && topic.trim()) {
                      onQuizFromTopic?.(topic.trim(), activeSubject)
                    } else {
                      onViewChange?.('quiz')
                    }
                  }}
                  className="group flex flex-col items-center gap-2 p-4 rounded-xl bg-card/30 hover:bg-card/50 border border-border/30 hover:border-border/60 transition-all duration-200 active:scale-[0.98]"
                >
                  <HelpCircle className="w-5 h-5 text-ink-secondary group-hover:text-neon-micro transition-colors" />
                  <span className="text-xs font-bold text-ink-primary">{result ? 'Test Yourself' : 'Practice Quiz Arena'}</span>
                  <span className="text-[10px] text-ink-secondary text-center leading-normal">{result ? `Topic-specific MCQs on ${topic.trim()}` : 'Test knowledge retaining active learning anchors'}</span>
                </button>
                <button
                  onClick={() => onViewChange?.('notes')}
                  className="group flex flex-col items-center gap-2 p-4 rounded-xl bg-card/30 hover:bg-card/50 border border-border/30 hover:border-border/60 transition-all duration-200 active:scale-[0.98]"
                >
                  <BookOpen className="w-5 h-5 text-ink-secondary group-hover:text-neon-physio transition-colors" />
                  <span className="text-xs font-bold text-ink-primary">Read High-Yield Notes</span>
                  <span className="text-[10px] text-ink-secondary text-center leading-normal">Review board review summaries & key exam pearls</span>
                </button>
                {onExport && (
                  <button
                    onClick={onExport}
                    className="group flex flex-col items-center gap-2 p-4 rounded-xl bg-card/30 hover:bg-card/50 border border-border/30 hover:border-neon-pharma/30 transition-all duration-200 active:scale-[0.98]"
                  >
                    <Download className="w-5 h-5 text-ink-secondary group-hover:text-neon-pharma transition-colors" />
                    <span className="text-xs font-bold text-ink-primary">Anki Download</span>
                    <span className="text-[10px] text-ink-secondary text-center leading-normal">Export all saved cards as CSV for Anki import</span>
                  </button>
                )}
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  )
}

// ── Accordion Card Helper Component ─────────────────────────────────────────
function AccordionCard({
  id,
  title,
  icon,
  isOpen,
  onToggle,
  highlight = false,
  children,
}: {
  id: string
  title: string
  icon: React.ReactNode
  isOpen: boolean
  onToggle: () => void
  highlight?: boolean
  children: React.ReactNode
}) {
  return (
    <div
      className={cn(
        'group rounded-xl transition-all duration-200 overflow-hidden border',
        'bg-card/30 backdrop-blur-sm',
        isOpen
          ? highlight
            ? 'bg-neon-green/[0.04] border-neon-green/20 shadow-card'
            : 'bg-elevated/30 border-border shadow-card'
          : 'border-transparent hover:border-border/50 hover:shadow-card-sm'
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className="w-full flex items-center justify-between px-5 py-4 transition-all duration-200 active:scale-[0.99]"
      >
        <span className="flex items-center gap-3 text-xs sm:text-sm font-bold text-ink-primary group-hover:text-white transition-colors">
          <span className="p-1.5 rounded-lg bg-subtle/30 group-hover:bg-subtle/50 transition-colors shrink-0">
            {icon}
          </span>
          {title}
        </span>
        <ChevronDown
          className={cn(
            'w-4 h-4 text-ink-muted transition-transform duration-200 group-hover:text-ink-secondary',
            isOpen && 'rotate-180 text-neon-green/70'
          )}
        />
      </button>

      <div
        className={cn(
          'transition-all duration-500 ease-in-out overflow-hidden',
          isOpen ? 'max-h-[1400px] opacity-100' : 'max-h-0 opacity-0 pointer-events-none'
        )}
      >
        <div className="p-5 sm:p-6 text-ink-primary space-y-4">
          {children}
        </div>
      </div>
    </div>
  )
}

// ── Premium Image Card Helper Component ─────────────────────────────────────
function PremiumImageCard({
  imageUrl,
  imgStatus,
  onRegenerate,
  visualScene,
}: {
  imageUrl: string | null
  imgStatus: GenerationStatus
  onRegenerate: () => void
  visualScene: string
}) {
  const [isFullscreen, setIsFullscreen] = useState(false)

  const handleShare = () => {
    if (imageUrl) {
      navigator.clipboard.writeText(imageUrl)
      alert('Illustration link copied to clipboard!')
    }
  }

  const handleDownload = async () => {
    if (!imageUrl) return
    try {
      const response = await fetch(imageUrl)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `mnemonic-visual-${Date.now()}.jpg`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch {
      window.open(imageUrl, '_blank')
    }
  }

  return (
    <div className="relative group/media rounded-xl overflow-hidden bg-surface border border-border/50 aspect-video flex flex-col justify-center items-center">
      {imgStatus === 'generating' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-card/60 backdrop-blur-sm z-10 animate-pulse">
          <div className="w-8 h-8 rounded-full border-2 border-neon-patho border-t-transparent animate-spin mb-3" />
          <p className="text-xs font-mono tracking-widest text-ink-tertiary">VISUALIZING YOUR STORY...</p>
        </div>
      )}

      {imgStatus === 'error' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-card/80 p-6 text-center z-10">
          <AlertTriangle className="w-8 h-8 text-neon-danger mb-2" />
          <p className="text-xs font-semibold text-ink-primary">Failed to render memory illustration</p>
          <button
            onClick={onRegenerate}
            className="mt-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold bg-elevated hover:bg-elevated/80 transition-all"
          >
            <RefreshCcw className="w-3 h-3" /> Try again
          </button>
        </div>
      )}

      {imageUrl ? (
        <>
          <img
            src={imageUrl}
            alt="Visual narrative of your mnemonic story"
            className="w-full h-full object-cover group-hover/media:scale-[1.02] transition-transform duration-700"
          />

          {/* Media overlay controls */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 opacity-0 group-hover/media:opacity-100 transition-all duration-300 flex flex-col justify-between p-4 z-10">
            <div className="flex justify-between items-start w-full">
              <span className="text-[9px] bg-card/60 text-ink-secondary px-2.5 py-1 rounded-full font-mono uppercase tracking-widest backdrop-blur-sm">
                Clinical Ink™
              </span>
              <div className="flex gap-1.5">
                <button
                  onClick={() => setIsFullscreen(true)}
                  title="Fullscreen"
                  className="p-2 rounded-lg bg-void/70 hover:bg-void text-ink-secondary hover:text-white transition-all active:scale-95"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={handleDownload}
                  title="Download Image"
                  className="p-2 rounded-lg bg-void/70 hover:bg-void text-ink-secondary hover:text-white transition-all active:scale-95"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="flex items-end justify-between w-full gap-3">
              <p className="text-[10px] text-ink-secondary line-clamp-1 flex-1 leading-normal italic">
                "{visualScene}"
              </p>
              <div className="flex gap-1.5 shrink-0">
                <button
                  onClick={onRegenerate}
                  title="Regenerate"
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-void/70 hover:bg-void text-[10px] font-bold text-ink-secondary hover:text-white transition-all active:scale-95"
                >
                  <RefreshCcw className="w-3 h-3" /> Regenerate
                </button>
                <button
                  onClick={handleShare}
                  title="Share"
                  className="p-2 rounded-lg bg-void/70 hover:bg-void text-ink-secondary hover:text-white transition-all hover:scale-110 active:scale-95"
                >
                  <Share2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center p-6 text-center w-full h-full">
          <ImageIcon className="w-10 h-10 text-ink-muted mb-3" />
          <p className="text-xs text-ink-secondary">Visual render is ready</p>
          <button
            onClick={onRegenerate}
            className="mt-3 flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-card/60 text-ink-secondary hover:text-white hover:bg-card transition-all active:scale-95 border border-border/50"
          >
            <Sparkles className="w-3.5 h-3.5" /> Render Visual Scene
          </button>
        </div>
      )}

      {/* Fullscreen Modal Portal */}
      {isFullscreen && (
        <div className="fixed inset-0 bg-void/95 backdrop-blur-md z-[100] flex items-center justify-center p-4 sm:p-8 animate-fade-in">
          <button
            onClick={() => setIsFullscreen(false)}
            className="absolute top-4 right-4 p-2 rounded-lg bg-card/60 text-ink-secondary hover:text-white transition-all active:scale-95"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="relative max-w-5xl w-full max-h-[85vh] rounded-2xl overflow-hidden shadow-card-lg flex items-center justify-center">
            <img
              src={imageUrl || ''}
              alt="Visual narrative of your mnemonic story, fullscreen"
              className="max-w-full max-h-[85vh] object-contain rounded-2xl"
            />
            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-void/90 via-void/50 to-transparent p-6 text-center">
              <p className="text-xs sm:text-sm text-ink-primary font-mono italic max-w-2xl mx-auto leading-relaxed">
                "{visualScene}"
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


// ── High Yield Highlight overlay parser ────────────────────────────────────
function HighYieldHighlight({ text }: { text: string }) {
  const words = text.split(/(\s+)/)
  return (
    <>
      {words.map((word, i) => {
        const clean = word.toLowerCase().trim()
        const isMedicalAnchor =
          clean.includes('artery') || clean.includes('nerve') || clean.includes('vein') ||
          clean.includes('muscle') || clean.includes('syndrome') || clean.includes('disease') ||
          clean.includes('plexus') || clean.includes('hormone') || clean.includes('enzyme') ||
          clean.includes('cell') || clean.includes('receptor') || clean.includes('pathway') ||
          clean.length > 7 && (clean.endsWith('itis') || clean.endsWith('osis') || clean.endsWith('ase') || clean.endsWith('ol'))

        if (isMedicalAnchor) {
          return (
            <span
              key={i}
              className="relative inline-block font-bold text-white px-1.5 py-0.5 rounded-md bg-neon-physio/15 border border-neon-physio/30"
              style={{ boxShadow: '0 0 4px rgba(199,125,255,0.1)' }}
            >
              {word}
            </span>
          )
        }
        return <span key={i}>{word}</span>
      })}
    </>
  )
}

// ── Interactive Flip card preview — Front = Question, Back = Answer ──────────
function FlipPreview({ card }: { card: { topic: string; subject: string; mnemonic: MnemonicOutput } }) {
  const [flipped, setFlipped] = useState(false)
  // Backward compat: use question/answer if available, fall back to ankiFront/ankiBack
  const front = card.mnemonic.question || card.mnemonic.ankiFront || card.topic
  const back = card.mnemonic.answer || card.mnemonic.ankiBack || ''
  return (
    <div
      onClick={() => setFlipped(f => !f)}
      className={cn('flip-card relative h-32 cursor-pointer select-none', flipped && 'is-flipped')}
      role="button"
      aria-label="Click to flip flashcard: front shows question, back shows answer"
    >
      <div className="flip-card-inner w-full h-full">
        {/* Front = Question */}
        <div className="flip-card-face absolute inset-0 p-4 rounded-xl bg-neon-green/[0.06] border border-neon-green/20 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[9px] px-2 py-0.5 rounded-full font-mono bg-neon-green/[0.08] text-neon-green border border-neon-green/20 font-bold uppercase tracking-wider">
              Question
            </span>
            <span className="text-[9px] text-ink-muted font-mono">Tap to reveal answer &rarr;</span>
          </div>
          <p className="text-xs sm:text-sm font-bold text-white leading-relaxed text-center px-2 text-balance">{front}</p>
          <p className="text-[9px] text-ink-tertiary">Topic: {card.topic}</p>
        </div>

        {/* Back = Answer + optional mnemonic */}
        <div className="flip-card-face flip-card-back absolute inset-0 p-4 rounded-xl bg-ai/[0.06] border border-ai/20 flex flex-col justify-between">
          <div className="flex items-center gap-1 text-[9px] text-neon-biochem font-mono font-bold uppercase tracking-wider">
            <CreditCard className="w-3 h-3" /> Answer
          </div>
          <div className="min-h-0 overflow-y-auto space-y-1.5 scrollbar-none">
            <p className="text-[11px] font-bold text-white leading-relaxed text-center text-balance">{back}</p>
            {card.mnemonic.explanation && (
              <p className="text-[10px] text-ink-secondary leading-snug text-center whitespace-pre-line">{card.mnemonic.explanation}</p>
            )}
            {card.mnemonic.mnemonic && (
              <div className="pt-1.5 mt-1.5 border-t border-border/20">
                <p className="text-[9px] text-neon-physio font-mono font-bold uppercase tracking-wider mb-0.5">Memory Aid</p>
                <p className="text-[10px] text-ink-tertiary italic leading-snug">{card.mnemonic.mnemonic}</p>
              </div>
            )}
          </div>
          <p className="text-[9px] text-ink-tertiary">Subject: {card.subject.toUpperCase()}</p>
        </div>
      </div>
    </div>
  )
}