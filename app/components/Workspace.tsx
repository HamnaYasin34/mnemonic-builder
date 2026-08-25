'use client'

// ─────────────────────────────────────────────────────────────────────────────
// app/components/Workspace.tsx
// Redesigned with premium accordion result split layout, Duolingo-like quizzes,
// advanced media cards, and a gorgeous model selector.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import {
  Zap, Copy, Save, RefreshCw, ChevronDown, Sparkles,
  BookOpen, Eye, CreditCard, AlertCircle, CheckCircle2,
  ImageIcon, Download, Menu, BookMarked,
  Volume2, Layers, Highlighter, HelpCircle, ThumbsDown, ThumbsUp, Meh,
  Maximize2, Share2, X, Activity, Flame, Laugh, Ghost, Scroll, Search, Play, Sword, Smile,
  Brain, Trophy, Timer, ArrowRight, RefreshCcw, Check, ChevronUp, AlertTriangle, Info,
} from 'lucide-react'
import { SUBJECTS, getSubject } from '../lib/subjects'
import { SubjectId, MnemonicOutput, GenerationStatus, MnemonicType, VisualStyle, StoryStyle } from '../types'
import { cn } from '../lib/utils'

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
  onViewChange?:         (view: 'dashboard' | 'workspace' | 'notes' | 'quiz') => void
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

// ── Dynamic High-yield Quiz Question Generator ──────────────────────────────
interface QuizQuestion {
  type: 'mcq' | 'clinical' | 'rapid' | 'blank'
  question: string
  options: string[]
  answerIndex: number
  explanation: string
  difficulty: 'Easy' | 'Medium' | 'Hard'
}

function generateDynamicQuiz(topic: string, result: MnemonicOutput): QuizQuestion[] {
  const m = result.mnemonic || ''
  const story = result.story || ''
  
  return [
    {
      type: 'mcq',
      difficulty: 'Easy',
      question: `Which of the following best maps the neural memory anchor in the mnemonic: "${m}"?`,
      options: [
        `The characters and spatial triggers inside: "${m.substring(0, Math.min(30, m.length))}..."`,
        `Rote mechanical recall of scientific keywords`,
        `A clinical diagnosis with zero narrative link`,
        `Unconnected syllables with no visual scene`
      ],
      answerIndex: 0,
      explanation: `Memory research shows that structured narratives (like the one we generated) anchor concepts inside your working memory 4.5x faster than rote repetition.`
    },
    {
      type: 'clinical',
      difficulty: 'Hard',
      question: `Clinical Case: A medical student trying to recall "${topic || 'this concept'}" during a clinical exam needs to apply this mnemonic. Which physiological link matches the core storyline: "${story.substring(0, Math.min(45, story.length))}..."?`,
      options: [
        `The narrative actor directly interacts with the biological mechanism`,
        `The pathophysiology is completely unrelated to the story`,
        `The story is purely a distraction for spatial positioning`,
        `The clinical scenario overrides all spatial pathways`
      ],
      answerIndex: 0,
      explanation: `By placing clinical and physiological mechanisms as central actors in the Narrative Story Style (like dramatic, scifi, or horror), the visual path becomes congruent with clinical presentation.`
    },
    {
      type: 'blank',
      difficulty: 'Medium',
      question: `Complete the core mnemonic phrase: "${m.slice(0, Math.floor(m.length / 2))} _________."`,
      options: [
        m.slice(Math.floor(m.length / 2)) || "The remaining medical elements",
        "A completely different anatomical part",
        "An unrelated clinical medication",
        "A distractor biochemical path"
      ],
      answerIndex: 0,
      explanation: `The second half of your mnemonic acts as the retrieval hook to unpack the full medical list under pressure.`
    },
    {
      type: 'rapid',
      difficulty: 'Easy',
      question: `Rapid Fire: True or False — The story we generated directly bridges "${topic || 'this topic'}" to Anki-spaced-repetition?`,
      options: [
        "True — Spaced repetition is reinforced through the custom flashcard format",
        "False — This is a standalone mnemonic with no flashcard backup"
      ],
      answerIndex: 0,
      explanation: `MnemonicFlow automatically converts your generated mnemonics into Anki-ready flashcards, allowing you to sync them directly to your local SRS database.`
    }
  ]
}

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
}: WorkspaceProps) {
  const [topic, setTopic] = useState('')
  const [status, setStatus] = useState<GenerationStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<MnemonicOutput | null>(null)

  // ── User-controlled mnemonic style ───────────────────────────────────────
  const [mnemonicType, setMnemonicType] = useState<MnemonicType>('hybrid')
  const [visualStyle, setVisualStyle] = useState<VisualStyle>('sketchy')
  const [storyStyle, setStoryStyle] = useState<StoryStyle>('clinical')

  const subject = getSubject(activeSubject)

  // ── Image State ──────────────────────────────────────────────────────────
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [imgStatus, setImgStatus] = useState<GenerationStatus>('idle')

  // ── Multi-sensory States ─────────────────────────────────────────────────
  const [audioOn, setAudioOn] = useState(false)
  const [visualLayerOn, setVisualLayerOn] = useState(false)
  const [highlightOn, setHighlightOn] = useState(false)

  // ── Saved / Copied local triggers ────────────────────────────────────────
  const [copied, setCopied] = useState(false)
  const [saved, setSaved] = useState(false)
  const [confidence, setConfidence] = useState<'hard' | 'good' | 'easy' | null>(null)

  // ── Accordion States ─────────────────────────────────────────────────────
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    concept: true,
    mnemonic: true,
    story: true,
    breakdown: false,
    why: false,
    image: true,
    flashcard: true,
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
        body: JSON.stringify({ visualScene: promptText, topic: topic.trim(), style: visualStyle }),
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

  // Trigger image generation upon successful mnemonic yield
  useEffect(() => {
    if (status === 'success' && result && !imageUrl && imgStatus === 'idle') {
      generateImg(result.visualScene)
    }
  }, [status, result, imageUrl, imgStatus, generateImg])

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

    // Stop current speaking
    window.speechSynthesis?.cancel()
    setAudioOn(false)

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: topic.trim(), subject: subject.id, mnemonicType, visualStyle, storyStyle }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.error ?? 'Generation failed.')

      const data: MnemonicOutput = json.data
      setResult(data)
      setStatus('success')
      generateImg(data.visualScene)
      if (onMnemonicGenerated) {
        onMnemonicGenerated(topic.trim(), subject.label, data)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
      setStatus('error')
    }
  }, [topic, subject.id, generateImg, mnemonicType, visualStyle, storyStyle, onMnemonicGenerated])

  // ── Audio playback ───────────────────────────────────────────────────────
  const toggleAudio = useCallback(() => {
    if (!result) return
    if (audioOn) {
      window.speechSynthesis?.cancel()
      setAudioOn(false)
      return
    }
    const utter = new SpeechSynthesisUtterance(
      `${result.explanation} ${result.mnemonic}`,
    )
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
    const text = `${result.explanation}\n\nMNEMONIC:\n${result.mnemonic}\n\nSTORY:\n${result.story}`
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSave = () => {
    if (!result || saved) return
    onCardSaved(topic.trim(), subject.id, result, imageUrl ?? undefined)
    setSaved(true)
  }

  return (
    <div className="h-full overflow-y-auto scrollbar-none pb-12 bg-void/10">
      <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-8">

        {/* ── Top Nav / Header ── */}
        <header className="flex items-center justify-between pb-4 border-b border-border/60 shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={onOpenSidebar}
              className="lg:hidden p-2 rounded-xl bg-card border border-border text-ink-secondary hover:text-white transition-all active:scale-95 shadow-sm"
              aria-label="Open sidebar"
            >
              <Menu className="w-4.5 h-4.5" />
            </button>
            <div>
              <h2 className="text-xs font-mono font-bold uppercase tracking-widest text-neon-green">Generator Console</h2>
              <p className="text-[10px] text-ink-tertiary mt-0.5">Spaced learning synthesiser</p>
            </div>
          </div>

          <button
            onClick={onToggleVaultCollapsed}
            className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-elevated border border-border hover:border-subtle hover:text-white transition-all duration-300 active:scale-95"
          >
            <BookMarked className="w-3.5 h-3.5" />
            <span>{vaultCollapsed ? 'Open Vault Rail' : 'Collapse Vault'}</span>
          </button>
        </header>

        {/* ── Subject selector info banner ── */}
        <div className="flex items-center gap-3.5 p-4 rounded-2xl bg-card/25 border border-border/60 backdrop-blur-md">
          <span className="text-2xl p-2 rounded-xl bg-subtle/30">{subject.icon}</span>
          <div>
            <h3 className="text-xs font-mono font-bold uppercase tracking-widest" style={{ color: subject.accent }}>Active Category: {subject.label}</h3>
            <p className="text-[11px] text-ink-secondary mt-0.5 leading-normal">{subject.description}</p>
          </div>
        </div>

        {/* ── Generation Input Form ── */}
        <div className="space-y-6">
          <div className="space-y-2">
            <label htmlFor="topic-input" className="text-[10px] font-bold uppercase tracking-widest font-mono text-ink-tertiary">Topic keywords</label>
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-ink-tertiary group-focus-within:text-neon-green transition-colors" />
              <input
                id="topic-input"
                type="text"
                value={topic}
                onChange={e => setTopic(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && generate()}
                placeholder="What medical concept are you mastering today?"
                className="w-full bg-card/20 border border-border/80 rounded-2xl pl-11 pr-12 py-3.5 text-sm sm:text-base text-ink-primary placeholder:text-ink-tertiary outline-none focus:border-neon-green-border focus:ring-1 focus:ring-neon-green-glow transition-all"
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
              <p className="text-[10px] font-bold uppercase tracking-widest font-mono text-ink-tertiary mb-2">Memory Architecture</p>
              <div className="grid grid-cols-2 gap-2">
                {([
                  { key: 'hybrid' as const, label: '🧠 Spatial Hybrid', desc: 'Acronym + storyline' },
                  { key: 'storyline' as const, label: '🎭 Pure Story', desc: 'Continuous narrative' },
                  { key: 'hook' as const, label: '⚡ Crazy Hook', desc: 'One absurd, unforgettable line' },
                  { key: 'auto' as const, label: '✨ Auto Select', desc: 'AI picks the best fit' },
                ]).map(opt => (
                  <button
                    key={opt.key}
                    onClick={() => setMnemonicType(opt.key)}
                    className={cn(
                      'flex flex-col items-start gap-1 p-3 rounded-xl border text-left transition-all duration-300 hover:border-subtle active:scale-[0.98]',
                      mnemonicType === opt.key
                        ? 'bg-neon-green-dim border-neon-green-border shadow-glow-sm'
                        : 'bg-card/20 border-border/60'
                    )}
                  >
                    <span className={cn('text-xs font-bold', mnemonicType === opt.key ? 'text-neon-green' : 'text-ink-secondary')}>{opt.label}</span>
                    <span className="text-[9px] text-ink-tertiary leading-normal">{opt.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest font-mono text-ink-tertiary mb-2">Image Render Style</p>
              <div className="grid grid-cols-2 gap-2">
                {([
                  { key: 'sketchy' as const, label: '🎨 Clinical Ink™', desc: 'Hand-drawn, rich lineart' },
                  { key: 'osmosis' as const, label: '📐 NeuroCanvas™', desc: 'Flat-vector whiteboard' },
                ]).map(opt => (
                  <button
                    key={opt.key}
                    onClick={() => setVisualStyle(opt.key)}
                    className={cn(
                      'flex flex-col items-start gap-1 p-3 rounded-xl border text-left transition-all duration-300 hover:border-subtle active:scale-[0.98]',
                      visualStyle === opt.key
                        ? 'bg-neon-biochem-dim border-neon-biochem-border'
                        : 'bg-card/20 border-border/60'
                    )}
                  >
                    <span className={cn('text-xs font-bold', visualStyle === opt.key ? 'text-neon-biochem' : 'text-ink-secondary')}>{opt.label}</span>
                    <span className="text-[9px] text-ink-tertiary leading-normal">{opt.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Premium Narrative Story Style Selector */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-widest font-mono text-ink-tertiary">Narrative Story Style Mode</p>
              <span className="text-[9px] text-neon-green font-mono uppercase bg-neon-green-dim border border-neon-green-border px-2.5 py-0.5 rounded-full">Dual AI Engine Active</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {STORY_STYLES_INFO.map(style => {
                const IconComp = style.icon
                const isSelected = storyStyle === style.key
                return (
                  <button
                    key={style.key}
                    type="button"
                    onClick={() => setStoryStyle(style.key)}
                    className={cn(
                      'group relative flex flex-col items-start p-3.5 rounded-xl text-left transition-all duration-300 border',
                      'bg-card/35 backdrop-blur-md hover:border-subtle/80',
                      'hover:-translate-y-0.5 active:scale-[0.98]',
                      isSelected
                        ? `bg-elevated border-l-4 ${style.borderClass} ${style.glowClass}`
                        : 'border-border/60 hover:bg-elevated/20'
                    )}
                  >
                    <div className="flex items-center gap-2.5 mb-1.5 w-full">
                      <div className={cn(
                        'p-1.5 rounded-lg transition-all duration-300 bg-subtle/30 group-hover:scale-110 shrink-0',
                        isSelected ? 'bg-elevated text-neon-green' : style.color
                      )}>
                        <IconComp className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-ink-primary group-hover:text-white transition-colors truncate">
                          {style.title}
                        </div>
                        <div className="text-[9px] text-ink-tertiary font-medium">
                          {style.subtitle}
                        </div>
                      </div>
                      {isSelected && (
                        <span className="w-1.5 h-1.5 rounded-full bg-neon-green animate-pulse-glow shrink-0" />
                      )}
                    </div>
                    <p className="text-[10px] text-ink-secondary leading-normal line-clamp-2">
                      {style.desc}
                    </p>
                    {isSelected && (
                      <span className="absolute inset-x-0 bottom-0 h-[2px] bg-gradient-to-r from-transparent via-neon-green/30 to-transparent" />
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
              'w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-sm font-bold transition-all duration-300',
              'bg-neon-green text-void hover:brightness-110 active:scale-[0.98] disabled:opacity-45 disabled:pointer-events-none',
              topic.trim() ? 'shadow-glow-sm' : 'none'
            )}
          >
            {status === 'generating' ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Synthesising Medical Pathway...</span>
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
          <div className="space-y-4 animate-pulse pt-6">
            <div className="h-6 w-36 bg-subtle rounded-md" />
            <div className="h-32 bg-card/25 border border-border/40 rounded-2xl" />
            <div className="grid grid-cols-2 gap-4">
              <div className="h-20 bg-card/25 border border-border/40 rounded-xl" />
              <div className="h-20 bg-card/25 border border-border/40 rounded-xl" />
            </div>
          </div>
        )}

        {/* ── Error Banner ── */}
        {status === 'error' && error && (
          <div className="p-4 rounded-xl border border-neon-danger/30 bg-neon-danger-dim text-neon-danger text-xs sm:text-sm leading-relaxed animate-fade-in">
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
                  'flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold border',
                  'transition-all duration-200 active:scale-95',
                  audioOn
                    ? 'bg-neon-green-dim border-neon-green-border text-neon-green shadow-glow-sm'
                    : 'bg-card/20 border-border/60 text-ink-tertiary hover:text-white hover:border-subtle'
                )}
              >
                <Volume2 className="w-4 h-4" />
                <span>{audioOn ? 'Stop Audio' : 'Audio Readout'}</span>
              </button>
              <button
                onClick={toggleVisualLayer}
                aria-pressed={visualLayerOn}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold border',
                  'transition-all duration-200 active:scale-95',
                  visualLayerOn
                    ? 'bg-neon-biochem-dim border-neon-biochem-border text-neon-biochem'
                    : 'bg-card/20 border-border/60 text-ink-tertiary hover:text-white hover:border-subtle'
                )}
              >
                <Layers className="w-4 h-4" />
                <span>Visual Overlay</span>
              </button>
              <button
                onClick={toggleHighlight}
                aria-pressed={highlightOn}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold border',
                  'transition-all duration-200 active:scale-95',
                  highlightOn
                    ? 'bg-neon-physio-dim border-neon-physio-border text-neon-physio'
                    : 'bg-card/20 border-border/60 text-ink-tertiary hover:text-white hover:border-subtle'
                )}
              >
                <Highlighter className="w-4 h-4" />
                <span>High Yield Highlight</span>
              </button>
            </div>

            {/* Accordion Layout Grid */}
            <div className="space-y-4">
              
              {/* Concept collapsible */}
              <AccordionCard
                id="concept"
                title="Concept & Explanation"
                icon={<BookOpen className="w-4 h-4 text-neon-green" />}
                isOpen={openSections.concept}
                onToggle={() => toggleSection('concept')}
              >
                <p className="text-sm text-ink-primary leading-relaxed whitespace-pre-line">
                  {highlightOn ? <HighYieldHighlight text={result.explanation} /> : result.explanation}
                </p>
              </AccordionCard>

              {/* Mnemonic collapsible */}
              {result.mnemonic && (
                <AccordionCard
                  id="mnemonic"
                  title="The Mnemonic Anchor"
                  icon={<Zap className="w-4 h-4 text-neon-physio" />}
                  isOpen={openSections.mnemonic}
                  onToggle={() => toggleSection('mnemonic')}
                  highlight={visualLayerOn}
                >
                  <div className="p-4 rounded-xl border border-neon-green-border/40 bg-neon-green-dim/10">
                    <p className="text-sm font-bold text-ink-primary leading-relaxed">{result.mnemonic}</p>
                  </div>
                </AccordionCard>
              )}

              {/* Storyline collapsible */}
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

              {/* Memory breakdown */}
              {result.mnemonicKey && (
                <AccordionCard
                  id="breakdown"
                  title="Memory Breakdown"
                  icon={<Sparkles className="w-4 h-4 text-neon-biochem" />}
                  isOpen={openSections.breakdown}
                  onToggle={() => toggleSection('breakdown')}
                >
                  <p className="text-xs text-ink-primary leading-relaxed whitespace-pre-line">{result.mnemonicKey}</p>
                </AccordionCard>
              )}

              {/* Why This Works (Memory Science) */}
              <AccordionCard
                id="why"
                title="Cognitive Psychology Analysis"
                icon={<Brain className="w-4 h-4 text-neon-micro" />}
                isOpen={openSections.why}
                onToggle={() => toggleSection('why')}
              >
                <p className="text-xs text-ink-secondary leading-relaxed">
                  Medical information is highly complex. By layering the concept of <span className="text-neon-green font-semibold">{topic}</span> into structured spatial hooks and semantic anchors, we reduce cognitive load on retrieval. Spaced reviews using the Anki card below will ensure migration into your long-term storage pathways.
                </p>
              </AccordionCard>

              {/* Visual Memory Card (Image Section) */}
              <AccordionCard
                id="image"
                title="Visual Memory Anchor"
                icon={<ImageIcon className="w-4 h-4 text-neon-patho" />}
                isOpen={openSections.image}
                onToggle={() => toggleSection('image')}
              >
                <PremiumImageCard
                  imageUrl={imageUrl}
                  imgStatus={imgStatus}
                  onRegenerate={() => generateImg(result.visualScene)}
                  visualScene={result.visualScene}
                />
              </AccordionCard>

              {/* Flashcards & SRS export */}
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
                    <p className="text-[10px] font-bold uppercase tracking-widest font-mono text-ink-tertiary mb-1.5">Rate recall difficulty to save</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleConfidence('hard')}
                        className={cn(
                          'flex-1 flex items-center justify-center gap-1 py-2 rounded-xl text-xs font-bold border transition-all active:scale-95',
                          confidence === 'hard' ? 'bg-neon-danger-dim border-neon-danger text-neon-danger' : 'bg-card border-border hover:border-subtle text-ink-secondary'
                        )}
                      >
                        <ThumbsDown className="w-3.5 h-3.5" /> Hard
                      </button>
                      <button
                        onClick={() => handleConfidence('good')}
                        className={cn(
                          'flex-1 flex items-center justify-center gap-1 py-2 rounded-xl text-xs font-bold border transition-all active:scale-95',
                          confidence === 'good' ? 'bg-neon-physio-dim border-neon-physio text-neon-physio' : 'bg-card border-border hover:border-subtle text-ink-secondary'
                        )}
                      >
                        <Meh className="w-3.5 h-3.5" /> Good
                      </button>
                      <button
                        onClick={() => handleConfidence('easy')}
                        className={cn(
                          'flex-1 flex items-center justify-center gap-1 py-2 rounded-xl text-xs font-bold border transition-all active:scale-95',
                          confidence === 'easy' ? 'bg-neon-green-dim border-neon-green text-neon-green' : 'bg-card border-border hover:border-subtle text-ink-secondary'
                        )}
                      >
                        <ThumbsUp className="w-3.5 h-3.5" /> Easy
                      </button>
                    </div>
                  </div>

                  <div className="flex gap-2.5 pt-2">
                    <button
                      onClick={handleSave}
                      disabled={saved || !confidence}
                      className={cn(
                        'flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl text-xs font-bold transition-all duration-300',
                        saved
                          ? 'bg-neon-green-dim border border-neon-green-border text-neon-green opacity-80'
                          : 'bg-neon-green text-void hover:brightness-110 active:scale-[0.98] disabled:opacity-30 disabled:pointer-events-none shadow-glow-sm'
                      )}
                    >
                      {saved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                      {saved ? 'Saved to Vault' : 'Save to Vault'}
                    </button>
                    <button
                      onClick={handleCopy}
                      className="flex items-center gap-1.5 px-4.5 py-3.5 rounded-xl text-xs font-semibold bg-elevated border border-border text-ink-secondary hover:text-white hover:border-subtle transition-all active:scale-[0.98]"
                    >
                      {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-neon-green" /> : <Copy className="w-3.5 h-3.5" />}
                      {copied ? 'Copied!' : 'Copy Text'}
                    </button>
                  </div>
                </div>
              </AccordionCard>

            </div>

            {/* Premium Action Redirection Area */}
            <div className="p-6 rounded-2xl border border-border/80 bg-card/10 backdrop-blur-md space-y-4">
              <div className="text-center">
                <h4 className="text-xs font-mono font-bold uppercase tracking-widest text-neon-green">Clinical Engagement Arena</h4>
                <p className="text-[10px] text-ink-tertiary mt-1">Harness advanced spacing & high-yield revision channels</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={() => onViewChange?.('quiz')}
                  className="group flex flex-col items-center gap-2 p-4 rounded-xl border border-neon-micro-border bg-neon-micro-dim/5 hover:bg-neon-micro-dim/15 transition-all duration-300 active:scale-98"
                >
                  <HelpCircle className="w-5 h-5 text-neon-micro group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-bold text-white">Practice Quiz Arena</span>
                  <span className="text-[9px] text-ink-tertiary text-center leading-normal">Test knowledge retaining active learning anchors</span>
                </button>
                <button
                  onClick={() => onViewChange?.('notes')}
                  className="group flex flex-col items-center gap-2 p-4 rounded-xl border border-neon-physio-border bg-neon-physio-dim/5 hover:bg-neon-physio-dim/15 transition-all duration-300 active:scale-98"
                >
                  <BookOpen className="w-5 h-5 text-neon-physio group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-bold text-white">Read High-Yield Notes</span>
                  <span className="text-[9px] text-ink-tertiary text-center leading-normal">Review board review summaries & key exam pearls</span>
                </button>
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
        'group rounded-2xl border transition-all duration-300 overflow-hidden',
        'bg-card/35 backdrop-blur-md',
        isOpen
          ? highlight
            ? 'border-neon-green shadow-glow-sm bg-neon-green-dim/10'
            : 'border-subtle bg-elevated/40'
          : 'border-border/60 hover:border-subtle/80 hover:-translate-y-0.5 shadow-card-sm'
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className="w-full flex items-center justify-between px-5 py-4 transition-all duration-200 active:scale-[0.99]"
      >
        <span className="flex items-center gap-3 text-xs sm:text-sm font-bold text-ink-primary group-hover:text-white transition-colors">
          <span className="p-1.5 rounded-lg bg-subtle/40 group-hover:bg-subtle/70 transition-colors shrink-0">
            {icon}
          </span>
          {title}
        </span>
        <ChevronDown
          className={cn(
            'w-4 h-4 text-ink-tertiary transition-transform duration-300 group-hover:text-ink-secondary',
            isOpen && 'rotate-180 text-neon-green'
          )}
        />
      </button>

      <div
        className={cn(
          'transition-all duration-500 ease-in-out overflow-hidden',
          isOpen ? 'max-h-[1400px] opacity-100 border-t border-border/40' : 'max-h-0 opacity-0 pointer-events-none'
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
    <div className="relative group/media rounded-2xl border border-border/60 overflow-hidden bg-void/50 aspect-video flex flex-col justify-center items-center">
      {imgStatus === 'generating' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-card/60 backdrop-blur-sm z-10 animate-pulse">
          <div className="w-8 h-8 rounded-full border-2 border-neon-patho border-t-transparent animate-spin mb-3" />
          <p className="text-xs font-mono tracking-widest text-ink-tertiary">RENDERING MEMORY ILLUSTRATION...</p>
        </div>
      )}

      {imgStatus === 'error' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-card/80 p-6 text-center z-10">
          <AlertTriangle className="w-8 h-8 text-neon-danger mb-2" />
          <p className="text-xs font-semibold text-ink-primary">Failed to render memory illustration</p>
          <button
            onClick={onRegenerate}
            className="mt-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold bg-elevated border border-border hover:border-subtle transition-all"
          >
            <RefreshCcw className="w-3 h-3" /> Try again
          </button>
        </div>
      )}

      {imageUrl ? (
        <>
          <img
            src={imageUrl}
            alt="AI Memory Anchor illustration"
            className="w-full h-full object-cover group-hover/media:scale-105 transition-transform duration-500"
          />

          {/* Media overlay controls */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 opacity-0 group-hover/media:opacity-100 transition-all duration-300 flex flex-col justify-between p-4 z-10">
            <div className="flex justify-between items-start w-full">
              <span className="text-[9px] bg-neon-patho-dim border border-neon-patho-border text-neon-patho px-2.5 py-1 rounded-full font-mono uppercase tracking-widest">
                Clinical Ink™ Rendered
              </span>
              <div className="flex gap-1.5">
                <button
                  onClick={() => setIsFullscreen(true)}
                  title="Fullscreen"
                  className="p-2 rounded-lg bg-void/70 hover:bg-void border border-border/40 text-ink-secondary hover:text-white transition-all hover:scale-110 active:scale-95"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={handleDownload}
                  title="Download Image"
                  className="p-2 rounded-lg bg-void/70 hover:bg-void border border-border/40 text-ink-secondary hover:text-white transition-all hover:scale-110 active:scale-95"
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
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-void/70 hover:bg-void border border-border/40 text-[10px] font-bold text-ink-secondary hover:text-white transition-all active:scale-95"
                >
                  <RefreshCcw className="w-3 h-3" /> Regenerate
                </button>
                <button
                  onClick={handleShare}
                  title="Share"
                  className="p-2 rounded-lg bg-void/70 hover:bg-void border border-border/40 text-ink-secondary hover:text-white transition-all hover:scale-110 active:scale-95"
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
            className="mt-3 flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-neon-patho-dim border border-neon-patho-border text-neon-patho hover:brightness-110 transition-all active:scale-95 shadow-glow-patho"
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
            className="absolute top-4 right-4 p-2 rounded-lg bg-card/60 border border-border hover:border-subtle text-ink-secondary hover:text-white transition-all active:scale-95"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="relative max-w-5xl w-full max-h-[85vh] rounded-2xl overflow-hidden border border-border shadow-2xl flex items-center justify-center">
            <img
              src={imageUrl || ''}
              alt="AI Memory Anchor illustrationFullscreen"
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

// ── Interactive Premium Practice Quiz ───────────────────────────────────────
function PremiumQuizEngine({ topic, result }: { topic: string; result: MnemonicOutput }) {
  const questions = useMemo(() => generateDynamicQuiz(topic, result), [topic, result])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedOption, setSelectedOption] = useState<number | null>(null)
  const [answered, setAnswered] = useState(false)
  const [score, setScore] = useState(0)
  const [isFinished, setIsFinished] = useState(false)
  const [startTime, setStartTime] = useState(Date.now())
  const [timeTaken, setTimeTaken] = useState(0)
  const [xp, setXp] = useState(0)

  useEffect(() => {
    setStartTime(Date.now())
  }, [currentIndex, isFinished])

  const handleOptionSelect = (index: number) => {
    if (answered) return
    setSelectedOption(index)
  }

  const handleCheckAnswer = () => {
    if (selectedOption === null || answered) return
    setAnswered(true)
    const currentQ = questions[currentIndex]
    if (selectedOption === currentQ.answerIndex) {
      setScore(s => s + 1)
      setXp(x => x + 25)
    }
  }

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(c => c + 1)
      setSelectedOption(null)
      setAnswered(false)
    } else {
      const duration = Math.round((Date.now() - startTime) / 1000)
      setTimeTaken(duration)
      setIsFinished(true)
    }
  }

  const handleRetry = () => {
    setCurrentIndex(0)
    setSelectedOption(null)
    setAnswered(false)
    setScore(0)
    setIsFinished(false)
    setXp(0)
    setStartTime(Date.now())
  }

  const currentQ = questions[currentIndex]
  const finalAccuracy = Math.round((score / questions.length) * 100)

  if (isFinished) {
    return (
      <div className="text-center py-6 sm:py-8 space-y-6 animate-fade-up max-w-md mx-auto">
        <div className="relative inline-flex items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-neon-green/10 blur-xl animate-pulse" />
          <div className="w-16 h-16 rounded-full bg-neon-green-dim border border-neon-green-border flex items-center justify-center shadow-glow-sm">
            <Trophy className="w-8 h-8 text-neon-green" />
          </div>
        </div>

        <div>
          <h3 className="text-lg font-bold text-ink-primary font-display">Quiz Complete!</h3>
          <p className="text-xs text-ink-tertiary mt-1">Excellent practice! Your neurological retention pathways are active.</p>
        </div>

        <div className="grid grid-cols-2 gap-3.5 bg-void/40 p-4 rounded-2xl border border-border/40">
          <div className="text-center p-3 rounded-xl bg-card border border-border">
            <div className="text-xl font-bold font-mono text-neon-green">{score} / {questions.length}</div>
            <div className="text-[9px] text-ink-tertiary uppercase tracking-wider mt-1">Score</div>
          </div>
          <div className="text-center p-3 rounded-xl bg-card border border-border">
            <div className="text-xl font-bold font-mono text-neon-physio">{finalAccuracy}%</div>
            <div className="text-[9px] text-ink-tertiary uppercase tracking-wider mt-1">Accuracy</div>
          </div>
          <div className="text-center p-3 rounded-xl bg-card border border-border">
            <div className="text-xl font-bold font-mono text-neon-biochem">+{xp} XP</div>
            <div className="text-[9px] text-ink-tertiary uppercase tracking-wider mt-1">XP Earned</div>
          </div>
          <div className="text-center p-3 rounded-xl bg-card border border-border">
            <div className="text-xl font-bold font-mono text-neon-micro">{timeTaken}s</div>
            <div className="text-[9px] text-ink-tertiary uppercase tracking-wider mt-1">Time Taken</div>
          </div>
        </div>

        <div className="flex gap-2 w-full pt-2">
          <button
            onClick={handleRetry}
            className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl text-xs font-bold bg-neon-green text-void hover:brightness-110 active:scale-[0.97] transition-all shadow-glow-sm"
          >
            <RefreshCcw className="w-3.5 h-3.5" /> Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 w-full">
        <span className="text-[10px] text-ink-tertiary font-mono font-bold shrink-0">
          Q {currentIndex + 1} / {questions.length}
        </span>
        <div className="flex-1 h-2 bg-subtle/50 rounded-full overflow-hidden">
          <div
            className="h-full bg-neon-micro rounded-full transition-all duration-500 ease-out"
            style={{ width: `${((currentIndex + 1) / questions.length) * 100}%`, boxShadow: '0 0 8px rgba(0,180,216,0.4)' }}
          />
        </div>
        <div className="flex items-center gap-1 text-[10px] text-ink-tertiary font-mono shrink-0">
          <Timer className="w-3 h-3 text-neon-micro" />
          <span>Active</span>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className={cn(
            'text-[9px] px-2 py-0.5 rounded-full font-mono uppercase font-bold border',
            currentQ.difficulty === 'Easy' && 'text-neon-green bg-neon-green-dim border-neon-green-border',
            currentQ.difficulty === 'Medium' && 'text-neon-physio bg-neon-physio-dim border-neon-physio-border',
            currentQ.difficulty === 'Hard' && 'text-neon-danger bg-neon-danger-dim border-neon-danger/30'
          )}>
            {currentQ.difficulty} Challenge
          </span>
          <span className="text-[9px] font-mono text-ink-tertiary">Type: {currentQ.type.toUpperCase()}</span>
        </div>
        <p className="text-sm sm:text-base font-bold text-ink-primary leading-snug">
          {currentQ.question}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-2.5">
        {currentQ.options.map((option, idx) => {
          const isSelected = selectedOption === idx
          const isCorrect = idx === currentQ.answerIndex
          const showSuccess = answered && isCorrect
          const showFailure = answered && isSelected && !isCorrect

          return (
            <button
              key={idx}
              type="button"
              disabled={answered}
              onClick={() => handleOptionSelect(idx)}
              className={cn(
                'w-full flex items-center justify-between p-3.5 sm:p-4 rounded-xl text-left transition-all duration-200 border',
                'active:scale-[0.99] hover:bg-elevated/30',
                isSelected
                  ? 'border-neon-micro bg-neon-micro-dim/10 shadow-glow-micro'
                  : 'border-border/60 bg-card/20',
                showSuccess && 'border-neon-green bg-neon-green-dim/15 text-neon-green shadow-glow-sm',
                showFailure && 'border-neon-danger bg-neon-danger-dim/10 text-neon-danger'
              )}
            >
              <div className="flex items-center gap-3">
                <span className={cn(
                  'w-5 h-5 rounded-full border text-[10px] font-mono font-bold flex items-center justify-center transition-colors',
                  isSelected ? 'border-neon-micro text-neon-micro bg-elevated' : 'border-border text-ink-tertiary',
                  showSuccess && 'border-neon-green text-neon-green bg-elevated',
                  showFailure && 'border-neon-danger text-neon-danger bg-elevated'
                )}>
                  {String.fromCharCode(65 + idx)}
                </span>
                <span className="text-xs sm:text-sm font-semibold transition-colors leading-relaxed">
                  {option}
                </span>
              </div>
              {answered && isCorrect && <Check className="w-4 h-4 text-neon-green shrink-0 ml-2" />}
              {answered && isSelected && !isCorrect && <X className="w-4 h-4 text-neon-danger shrink-0 ml-2" />}
            </button>
          )
        })}
      </div>

      <div className="space-y-4 pt-1">
        {!answered ? (
          <button
            type="button"
            onClick={handleCheckAnswer}
            disabled={selectedOption === null}
            className="w-full flex items-center justify-center gap-1.5 py-3 rounded-xl text-xs sm:text-sm font-bold bg-neon-micro text-void hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-45 disabled:pointer-events-none shadow-glow-micro"
          >
            Check Answer <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <div className="space-y-4 animate-fade-in">
            <div className={cn(
              'p-4 rounded-xl border flex gap-3',
              selectedOption === currentQ.answerIndex
                ? 'bg-neon-green-dim border-neon-green-border/50 text-ink-primary'
                : 'bg-neon-danger-dim border-neon-danger/30 text-ink-primary'
            )}>
              <Info className={cn('w-4 h-4 shrink-0 mt-0.5', selectedOption === currentQ.answerIndex ? 'text-neon-green' : 'text-neon-danger')} />
              <div>
                <p className="text-xs font-bold uppercase tracking-wider font-mono mb-1">
                  {selectedOption === currentQ.answerIndex ? 'Outstanding Recall!' : 'Learning Opportunity'}
                </p>
                <p className="text-xs leading-relaxed text-ink-secondary">
                  {currentQ.explanation}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleNext}
              className="w-full flex items-center justify-center gap-1.5 py-3 rounded-xl text-xs sm:text-sm font-bold bg-neon-green text-void hover:brightness-110 active:scale-[0.98] transition-all shadow-glow-sm"
            >
              {currentIndex < questions.length - 1 ? 'Next Question' : 'Complete Quiz'} <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
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
              className="relative inline-block font-bold text-white px-1.5 py-0.5 rounded-md bg-neon-physio/25 border border-neon-physio/50 shadow-sm"
              style={{ boxShadow: '0 0 6px rgba(199,125,255,0.2)' }}
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

// ── Interactive Flip card preview ──────────────────────────────────────────
function FlipPreview({ card }: { card: { topic: string; subject: string; mnemonic: MnemonicOutput } }) {
  const [flipped, setFlipped] = useState(false)
  return (
    <div
      onClick={() => setFlipped(f => !f)}
      className={cn('flip-card relative h-28 cursor-pointer select-none', flipped && 'is-flipped')}
      role="button"
      aria-label="Click to flip flashcard preview"
    >
      <div className="flip-card-inner w-full h-full">
        {/* Front */}
        <div className="flip-card-face absolute inset-0 p-4 rounded-xl border border-neon-green-border bg-neon-green-dim flex flex-col justify-between shadow-glow-sm">
          <div className="flex items-center gap-1 text-[9px] text-neon-green font-mono font-bold uppercase tracking-wider">
            <Sparkles className="w-3 h-3 animate-pulse-glow" /> MNEMONIC ANCHOR · Click to flip
          </div>
          <p className="text-xs sm:text-sm font-bold text-white leading-relaxed">{card.mnemonic.mnemonic}</p>
          <p className="text-[9px] text-ink-tertiary">Topic: {card.topic}</p>
        </div>

        {/* Back */}
        <div className="flip-card-face flip-card-back absolute inset-0 p-4 rounded-xl border border-neon-biochem-border bg-neon-biochem-dim flex flex-col justify-between shadow-glow-biochem">
          <div className="flex items-center gap-1 text-[9px] text-neon-biochem font-mono font-bold uppercase tracking-wider">
            <CreditCard className="w-3 h-3" /> ANKI FLASHCARD BACK
          </div>
          <div className="min-h-0 overflow-y-auto space-y-1 scrollbar-none">
            <p className="text-[11px] font-bold text-white">Anki Front: {card.mnemonic.ankiFront}</p>
            <p className="text-[10px] text-ink-secondary leading-snug">{card.mnemonic.ankiBack}</p>
          </div>
          <p className="text-[9px] text-ink-tertiary">Category: {card.subject.toUpperCase()}</p>
        </div>
      </div>
    </div>
  )
}