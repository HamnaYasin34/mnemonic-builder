'use client'

// ─────────────────────────────────────────────────────────────────────────────
// app/components/HighYieldNotes.tsx  —  Phase 2: High-Yield Medical Library
// Browse curated + cached guides, search/filter, generate new ones on demand.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Scroll, Search, Star, Sparkles, ArrowLeft,
  CheckCircle2, Compass, AlertTriangle, Loader2, Zap, Target,
} from 'lucide-react'
import { Discipline, SubjectId, HighYieldGuide } from '../types'
import { getSubjectsByDiscipline } from '../lib/subjects'
import { cn } from '../lib/utils'
import { ALL_GUIDES, searchAllGuides } from '../lib/curated-data'
import { getAllCachedGuides, getCachedGuide, setCachedGuide } from '../lib/cache'
import { bookmarks } from '../lib/bookmarks'
import { analytics } from '../lib/analytics'

interface HighYieldNotesProps {
  discipline: Discipline
  onGenerateWithMnemonic: (topic: string) => void
  onQuizFromGuide?: (topic: string, subject: SubjectId) => void
  onNavigateBack?: () => void
  currentTopic?: string | null
}

export default function HighYieldNotes({ discipline, onGenerateWithMnemonic, onQuizFromGuide, onNavigateBack, currentTopic }: HighYieldNotesProps) {
  const [selectedGuide, setSelectedGuide] = useState<HighYieldGuide | null>(null)
  const [search, setSearch] = useState('')
  const [subjectFilter, setSubjectFilter] = useState<SubjectId | 'all'>('all')
  const [bookmarkedOnly, setBookmarkedOnly] = useState(false)
  const [activeTab, setActiveTab] = useState<'notes' | 'pearls' | 'traps'>('notes')
  const [showGenerate, setShowGenerate] = useState(false)
  const [generateTopic, setGenerateTopic] = useState('')

  // Pre-fill topic from cross-view context
  useEffect(() => { if (currentTopic) { setGenerateTopic(currentTopic); setShowGenerate(true) } }, [currentTopic])
  const [generating, setGenerating] = useState(false)
  const [generateError, setGenerateError] = useState('')
  const [allGuides, setAllGuides] = useState<HighYieldGuide[]>([])

  // Load guides: curated + cached
  useEffect(() => {
    const curated = ALL_GUIDES
    const cached = getAllCachedGuides()
    // Merge: curated first, then cached that aren't duplicates
    const curatedIds = new Set(curated.map(g => g.id))
    const merged = [...curated, ...cached.filter(g => !curatedIds.has(g.id))]
    setAllGuides(merged)
  }, [])

  // Filter guides
  const filteredGuides = useMemo(() => {
    let guides = allGuides
    if (search.trim()) {
      guides = searchAllGuides(search)
      // Also search cached guides
      const cached = getAllCachedGuides()
      const q = search.trim().toLowerCase()
      const cachedResults = cached.filter(g =>
        g.topic.toLowerCase().includes(q) || g.subject.toLowerCase().includes(q)
      )
      const ids = new Set(guides.map(g => g.id))
      guides = [...guides, ...cachedResults.filter(g => !ids.has(g.id))]
    }
    if (discipline) {
      guides = guides.filter(g => g.discipline === discipline)
    }
    if (subjectFilter !== 'all') {
      guides = guides.filter(g => g.subject === subjectFilter)
    }
    if (bookmarkedOnly) {
      guides = guides.filter(g => bookmarks.isBookmarked('guide', g.id))
    }
    return guides
  }, [allGuides, search, discipline, subjectFilter, bookmarkedOnly])

  const subjects = getSubjectsByDiscipline(discipline)

  const handleSelectGuide = useCallback((guide: HighYieldGuide) => {
    setSelectedGuide(guide)
    setActiveTab('notes')
    analytics.log('guide_opened', guide.topic, guide.subject)
  }, [])

  const handleBackToLibrary = useCallback(() => {
    setSelectedGuide(null)
    onNavigateBack?.()
  }, [onNavigateBack])

  const handleToggleBookmark = useCallback((guide: HighYieldGuide) => {
    bookmarks.toggle('guide', guide.id, guide.topic, guide.subject)
    // Force re-render
    setAllGuides(prev => [...prev])
  }, [])

  const handleGenerateGuide = useCallback(async () => {
    if (!generateTopic.trim() || generating) return
    const topic = generateTopic.trim()

    // Check curated first
    const curated = allGuides.find(g => g.topic.toLowerCase() === topic.toLowerCase())
    if (curated) {
      handleSelectGuide(curated)
      setShowGenerate(false)
      setGenerateTopic('')
      return
    }

    // Check cache
    const cached = getCachedGuide(topic)
    if (cached) {
      handleSelectGuide(cached)
      setShowGenerate(false)
      setGenerateTopic('')
      return
    }

    // Generate via API
    setGenerating(true)
    setGenerateError('')
    try {
      const res = await fetch('/api/guide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, subject: subjectFilter !== 'all' ? subjectFilter : 'medicine' }),
      })
      const data = await res.json()
      if (!data.success) {
        setGenerateError(data.error || 'Generation failed')
        return
      }
      const guide: HighYieldGuide = {
        id: `gen_${Date.now()}`,
        topic,
        subject: (subjectFilter !== 'all' ? subjectFilter : 'medicine') as SubjectId,
        discipline,
        definition: data.data.definition || '',
        coreConcept: data.data.coreConcept || '',
        pathophysiology: data.data.pathophysiology || '',
        clinicalFeatures: data.data.clinicalFeatures || [],
        investigations: data.data.investigations || [],
        management: data.data.management || [],
        complications: data.data.complications || [],
        associations: data.data.associations || [],
        differentialDiagnosis: data.data.differentialDiagnosis || [],
        examPearls: data.data.examPearls || [],
        commonTraps: data.data.commonTraps || [],
        usmleConcepts: data.data.usmleConcepts || [],
        customSections: Array.isArray(data.data.customSections) ? data.data.customSections : [],
        isCurated: false,
        createdAt: new Date().toISOString(),
      }
      setCachedGuide(topic, guide)
      setAllGuides(prev => [guide, ...prev])
      handleSelectGuide(guide)
      setShowGenerate(false)
      setGenerateTopic('')
    } catch {
      setGenerateError('Could not connect. Please check your connection and try again.')
    } finally {
      setGenerating(false)
    }
  }, [generateTopic, generating, allGuides, subjectFilter, discipline, handleSelectGuide])

  // ── GUIDE DETAIL VIEW ──
  if (selectedGuide) {
    const isBookmarked = bookmarks.isBookmarked('guide', selectedGuide.id)
    return (
      <div className="view-container">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 animate-fade-up">
          {/* Header */}
          <div className="flex items-center gap-3 pb-4">
            <button onClick={handleBackToLibrary} className="p-2.5 rounded-lg hover:bg-elevated/60 text-ink-tertiary hover:text-ink-secondary transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[9px] px-2 py-0.5 rounded-full font-mono bg-neon-physio/10 text-neon-physio uppercase font-bold tracking-wider">
                  {selectedGuide.subject}
                </span>
                {selectedGuide.isCurated && (
                  <span className="text-[9px] px-2 py-0.5 rounded-full font-mono bg-neon-green/10 text-neon-green uppercase font-bold tracking-wider">
                    Curated
                  </span>
                )}
              </div>
              <h1 className="text-lg sm:text-xl font-bold font-display text-ink-primary mt-1 truncate">{selectedGuide.topic}</h1>
            </div>
            <button
              onClick={() => handleToggleBookmark(selectedGuide)}
              className={cn('p-2 rounded-lg transition-all', isBookmarked ? 'text-neon-physio bg-neon-physio/10' : 'text-ink-tertiary hover:bg-elevated/60 hover:text-ink-secondary')}
            >
              <Star className={cn('w-5 h-5', isBookmarked && 'fill-neon-physio')} />
            </button>
          </div>

          {/* Action Bar */}
          <div className="flex gap-2 pt-2">
            <button
              onClick={() => onQuizFromGuide?.(selectedGuide.topic, selectedGuide.subject)}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold bg-neon-micro/8 text-neon-micro hover:bg-neon-micro/12 transition-all duration-200 active:scale-[0.98]"
            >
              <Target className="w-4 h-4" />
              Test Yourself
            </button>
            <button
              onClick={() => onGenerateWithMnemonic(selectedGuide.topic)}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold bg-neon-physio/8 text-neon-physio hover:bg-neon-physio/12 transition-all duration-200 active:scale-[0.98]"
            >
              <Zap className="w-4 h-4" />
              Generate with Mnemonic
            </button>
          </div>

          {/* Tabs */}
          <div className="flex p-0.5 bg-card/30 rounded-lg w-fit">
            {(['notes', 'pearls', 'traps'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  'px-4 py-2 rounded-md text-[11px] font-semibold transition-all duration-300',
                  activeTab === tab ? 'bg-elevated shadow-card-sm text-white' : 'text-ink-tertiary hover:text-ink-secondary hover:bg-elevated/20'
                )}
              >
                {tab === 'notes' ? 'Notes' : tab === 'pearls' ? 'Exam Pearls' : 'Traps & Associations'}
              </button>
            ))}
          </div>

          {/* Tab: Notes */}
          {activeTab === 'notes' && (
            <div className="space-y-5">
              <GuideSection icon={<CheckCircle2 className="w-3.5 h-3.5" />} title="Definition" color="text-neon-green">
                <p className="text-sm text-ink-primary leading-relaxed">{selectedGuide.definition}</p>
              </GuideSection>
              <GuideSection icon={<Compass className="w-3.5 h-3.5" />} title="Core Concept" color="text-neon-cyan">
                <p className="text-sm text-ink-primary leading-relaxed">{selectedGuide.coreConcept}</p>
              </GuideSection>
              {selectedGuide.pathophysiology && (
                <GuideSection icon={<Compass className="w-3.5 h-3.5" />} title="Pathophysiology" color="text-neon-physio">
                  <p className="text-sm text-ink-primary leading-relaxed whitespace-pre-line">{selectedGuide.pathophysiology}</p>
                </GuideSection>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ListSection title="Clinical Features" items={selectedGuide.clinicalFeatures} color="text-neon-physio" bullet="•" />
                <ListSection title="Investigations" items={selectedGuide.investigations} color="text-neon-biochem" bullet="•" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ListSection title="Management" items={selectedGuide.management} color="text-neon-green" bullet="✓" />
                <ListSection title="Complications" items={selectedGuide.complications} color="text-neon-danger" bullet="⚠" />
              </div>
              {selectedGuide.differentialDiagnosis.length > 0 && (
                <ListSection title="Differential Diagnosis" items={selectedGuide.differentialDiagnosis} color="text-neon-micro" bullet="•" />
              )}
              {/* Subject-specific custom sections (anatomy, physiology, biochemistry, etc.) */}
              {selectedGuide.customSections && selectedGuide.customSections.length > 0 && (
                <div className="space-y-4">
                  {selectedGuide.customSections.map((section, i) => (
                    <ListSection key={i} title={section.title} items={section.content} color="text-neon-green" bullet="•" />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab: Exam Pearls */}
          {activeTab === 'pearls' && (
            <div className="space-y-5">
              <div className="p-4 rounded-xl bg-neon-green/8">
                <h2 className="text-[10px] font-bold uppercase tracking-widest font-mono text-neon-green mb-2.5 flex items-center gap-1.5">
                  <Star className="w-3.5 h-3.5 fill-neon-green text-neon-green" /> Exam Pearls
                </h2>
                <ul className="space-y-3">
                  {selectedGuide.examPearls.map((p, i) => (
                    <li key={i} className="flex gap-3 text-sm text-ink-primary leading-relaxed">
                      <span className="text-neon-green font-bold shrink-0">★</span>
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </div>
              {selectedGuide.usmleConcepts.length > 0 && (
                <div className="p-4 rounded-xl bg-neon-cyan/8">
                  <h2 className="text-[10px] font-bold uppercase tracking-widest font-mono text-neon-cyan mb-2.5">USMLE High-Yield</h2>
                  <ul className="space-y-3">
                    {selectedGuide.usmleConcepts.map((c, i) => (
                      <li key={i} className="flex gap-3 text-sm text-ink-primary leading-relaxed">
                        <span className="text-neon-cyan font-bold shrink-0">◆</span>
                        <span>{c}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Tab: Traps & Associations */}
          {activeTab === 'traps' && (
            <div className="space-y-5">
              <div className="p-4 rounded-xl bg-neon-danger/8">
                <h2 className="text-[10px] font-bold uppercase tracking-widest font-mono text-neon-danger mb-2.5 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-neon-danger" /> Common Exam Traps
                </h2>
                <ul className="space-y-3">
                  {selectedGuide.commonTraps.map((trap, i) => (
                    <li key={i} className="flex gap-3 text-sm text-ink-primary leading-relaxed">
                      <span className="text-neon-danger font-bold shrink-0">⚠</span>
                      <span>{trap}</span>
                    </li>
                  ))}
                </ul>
              </div>
              {selectedGuide.associations.length > 0 && (
                <ListSection title="Important Associations" items={selectedGuide.associations} color="text-neon-physio" bullet="→" />
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── LIBRARY HOME ──
  return (
    <div className="view-container">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-5 animate-fade-up">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold font-display text-ink-primary">High-Yield Library</h1>
            <p className="text-[11px] text-ink-tertiary mt-0.5">Curated medical study guides across MBBS & BDS disciplines</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowGenerate(s => !s)}
              className="glow-btn flex items-center gap-1.5 px-3 py-2 rounded-lg bg-neon-green text-void font-bold text-[11px] shadow-card-sm"
            >
              <Sparkles className="w-3.5 h-3.5" /> Generate
            </button>
          </div>
        </div>

        {/* Generate Inline */}
        {showGenerate && (
          <div className="p-4 rounded-xl bg-card/40 shadow-card-sm space-y-3 animate-fade-in">
            <div className="flex gap-2">
              <input
                type="text"
                value={generateTopic}
                onChange={e => setGenerateTopic(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleGenerateGuide()}
                placeholder="Enter any medical topic (e.g. Nephrotic Syndrome)"
                className="flex-1 bg-surface rounded-lg px-3 py-2 text-sm text-ink-primary placeholder:text-ink-tertiary/50 outline-none input-focus-glow focus:ring-2 focus:ring-neon-green/15"
              />
              <button
                onClick={handleGenerateGuide}
                disabled={!generateTopic.trim() || generating}
                className="glow-btn px-4 py-2 rounded-lg bg-neon-green text-void font-bold text-xs disabled:opacity-40 flex items-center gap-1.5"
              >
                {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                {generating ? 'Compiling...' : 'Guide'}
              </button>
              <button
                onClick={() => { if (generateTopic.trim()) onGenerateWithMnemonic(generateTopic.trim()) }}
                disabled={!generateTopic.trim()}
                className="glow-btn px-4 py-2 rounded-lg bg-neon-physio text-void font-bold text-xs disabled:opacity-40 flex items-center gap-1.5"
              >
                <Zap className="w-3.5 h-3.5" /> With Mnemonic
              </button>
            </div>
            {generateError && <p className="text-[11px] text-neon-danger">{generateError}</p>}
          </div>
        )}

        {/* Search & Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-tertiary" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search topics..."
              className="w-full bg-surface rounded-lg pl-9 pr-3 py-2 text-xs text-ink-primary placeholder:text-ink-tertiary/50 outline-none focus:ring-2 focus:ring-neon-green/15"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={subjectFilter}
              onChange={e => setSubjectFilter(e.target.value as SubjectId | 'all')}
              className="bg-card/40 rounded-lg px-3 py-2 text-xs text-ink-secondary focus:outline-none focus:ring-2 focus:ring-neon-green/15 appearance-none cursor-pointer min-w-[120px]"
            >
              <option value="all">All Subjects</option>
              {subjects.map(s => (
                <option key={s.id} value={s.id}>{s.icon} {s.label}</option>
              ))}
            </select>
            <button
              onClick={() => setBookmarkedOnly(b => !b)}
              className={cn(
                'px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5',
                bookmarkedOnly
                  ? 'bg-neon-physio/10 text-neon-physio'
                  : 'bg-card/40 text-ink-tertiary hover:text-ink-secondary hover:bg-card/60'
              )}
            >
              <Star className={cn('w-3.5 h-3.5', bookmarkedOnly && 'fill-neon-physio')} />
              Saved
            </button>
          </div>
        </div>

        {/* Topic Cards Grid */}
        {filteredGuides.length === 0 ? (
          <div className="view-empty space-y-4">
            <div className="relative inline-flex items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-neon-green/5 blur-xl w-16 h-16" />
              <Scroll className="w-12 h-12 text-ink-tertiary/30 relative" />
            </div>
            <div>
              <p className="text-sm font-semibold text-ink-secondary">No guides found</p>
              <p className="text-[11px] text-ink-tertiary/60 mt-1">Try a different search or generate a new guide</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredGuides.map(guide => {
              const isBm = bookmarks.isBookmarked('guide', guide.id)
              return (
                <button
                  key={guide.id}
                  onClick={() => handleSelectGuide(guide)}
                  className="group text-left p-4 bg-card rounded-xl shadow-card hover:shadow-card-md hover:bg-card/80 transition-all duration-300"
                >
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-[9px] px-2 py-0.5 rounded-full font-mono bg-neon-physio/10 text-neon-physio uppercase font-bold tracking-wider">
                      {guide.subject}
                    </span>
                    <div className="flex items-center gap-1">
                      {guide.isCurated && (
                        <span className="text-[8px] px-1.5 py-0.5 rounded-full font-mono bg-neon-green/10 text-neon-green font-bold">
                          CURATED
                        </span>
                      )}
                      {isBm && <Star className="w-3 h-3 fill-neon-physio text-neon-physio" />}
                    </div>
                  </div>
                  <h3 className="text-sm font-bold text-ink-primary group-hover:text-neon-green transition-colors mb-1.5">{guide.topic}</h3>
                  <p className="text-[11px] text-ink-tertiary leading-relaxed line-clamp-2">{guide.definition.slice(0, 120)}...</p>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Helper components ──

function GuideSection({ icon, title, color, children }: { icon: React.ReactNode; title: string; color: string; children: React.ReactNode }) {
  return (
    <div className="p-4 rounded-xl bg-card/40 shadow-card-sm transition-all duration-300 hover:shadow-card">
      <h2 className={cn('section-label mb-3 flex items-center gap-1.5', color)}>
        {icon} {title}
      </h2>
      {children}
    </div>
  )
}

function ListSection({ title, items, color, bullet }: { title: string; items: string[]; color: string; bullet: string }) {
  if (!items || items.length === 0) return null
  return (
    <div className="p-4 rounded-xl bg-card/40 shadow-card-sm transition-all duration-300 hover:shadow-card">
      <h3 className={cn('section-label mb-3', color)}>{title}</h3>
      <ul className="space-y-2.5">
        {items.map((item, i) => (
          <li key={i} className="flex gap-2 text-xs sm:text-sm text-ink-secondary leading-relaxed">
            <span className={cn('font-bold shrink-0', color)}>{bullet}</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

// Keep the old export for backward compatibility during migration
export type { HighYieldNotesProps }
