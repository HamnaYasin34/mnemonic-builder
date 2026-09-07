'use client'

import { useState, useEffect, useCallback } from 'react'
import Sidebar, { SidebarView } from './components/Sidebar'
import Workspace        from './components/Workspace'
import VaultPanel       from './components/VaultPanel'
import WelcomeDashboard from './components/WelcomeDashboard'
import UserMenu         from './components/UserMenu'
import AuthGuard        from './components/AuthGuard'
import HighYieldNotes from './components/HighYieldNotes'
import QuizArena from './components/QuizArena'
import AIExaminer from './components/AIExaminer'
import ClinicalSimulation from './components/ClinicalSimulation'
import SRSReview from './components/SRSReview'
import ARViewer from './components/ARViewer'
import ProfileGate from './components/ProfileGate'
import SettingsPanel, { AppSettings, loadSettings } from './components/SettingsPanel'
import { supabase } from './lib/supabase'
import { vault, downloadAnkiCSV, getDueCount, isDue } from './lib/vault'
import { Flashcard, SubjectId, MnemonicOutput, ReviewQuality, VaultFilter, Discipline } from './types'
import { getSubjectsByDiscipline } from './lib/subjects'
import { cn } from './lib/utils'
import { setCachedUserId, detectMigratableData, migrateRetrievalAttempts, migrateVaultCards } from './lib/persistence'
import { analytics } from './lib/analytics'
import Logo from './components/Logo'

type View = 'dashboard' | 'workspace' | 'notes' | 'quiz' | 'examiner' | 'simulation' | 'srs' | 'ar'
type PendingQuiz = { topic: string; subject: SubjectId } | null

export default function MnemonicFlowPro() {
  const [cards,           setCards]           = useState<Flashcard[]>([])
  const [mounted,         setMounted]         = useState(false)
  const [sidebarOpen,     setSidebarOpen]     = useState(false)   // mobile drawer
  const [vaultOpen,       setVaultOpen]       = useState(false)   // mobile drawer
  const [vaultCollapsed,  setVaultCollapsed]  = useState(true)    // desktop hide/show starts collapsed for space optimization
  const [sidebarCollapsed,setSidebarCollapsed]= useState(false)   // desktop hide/show
  const [view,            setView]            = useState<View>('dashboard')
  const [viewHistory,     setViewHistory]     = useState<View[]>([])
  const [vaultFilter,     setVaultFilter]     = useState<VaultFilter>('all')
  const [userName,        setUserName]        = useState('Student')
  const [pendingTopic,    setPendingTopic]    = useState<string | undefined>(undefined)
  const [pendingQuiz,     setPendingQuiz]     = useState<PendingQuiz>(null)
  const [currentTopic,    setCurrentTopic]    = useState<string | null>(null)
  const [profileComplete, setProfileComplete] = useState(true)
  const [userId, setUserId] = useState<string>('')
  const [profileData, setProfileData] = useState<import('./lib/supabase').Profile | null>(null)

  // FIX 10: migration state
  const [migrationPrompt, setMigrationPrompt] = useState(false)
  const [migrationRunning, setMigrationRunning] = useState(false)
  const [migrationDone, setMigrationDone] = useState<string | null>(null)

  // Settings & discipline state
  const [settingsOpen,    setSettingsOpen]    = useState(false)
  const [appSettings,     setAppSettings]     = useState<AppSettings>(loadSettings)
  const [activeDiscipline, setActiveDiscipline] = useState<Discipline>(() => {
    if (typeof window === 'undefined') return 'mbbs'
    return (localStorage.getItem('mnemonicflow_discipline') as Discipline) || 'mbbs'
  })
  const [activeSubject,   setActiveSubject]   = useState<SubjectId>(() => {
    if (typeof window === 'undefined') return 'anatomy'
    return (localStorage.getItem('mnemonicflow_subject') as SubjectId) || 'anatomy'
  })

  useEffect(() => {
    setCards(vault.load())
    setMounted(true)
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      setUserId(user.id)
      const name = (user.user_metadata?.full_name as string | undefined) ?? user.email?.split('@')[0] ?? 'Student'
      setUserName(name)
      // Check profile completeness
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profileError) {
        console.error('[Profile] Failed to load profile:', profileError.message)
        setProfileComplete(false)
        return
      }

      setProfileData(profile)

      if (!profile?.program || !profile?.academic_year || !profile?.college) {
        setProfileComplete(false)
      }
      // Sync discipline from profile if available
      if (profile?.program) {
        setActiveDiscipline(profile.program as Discipline)
      }
      // Cache user ID for persistence layer
      setCachedUserId(user.id)
    })
  }, [])

  // Phase 5: auth state change listener — updates learner state on sign-in/out
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        setUserId(session.user.id)
        setCachedUserId(session.user.id)
        const name = (session.user.user_metadata?.full_name as string | undefined) ?? session.user.email?.split('@')[0] ?? 'Student'
        setUserName(name)
        // Reload profile data
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()
        if (profile) {
          setProfileData(profile)
          if (profile.program) {
            setActiveDiscipline(profile.program as Discipline)
            if (profile.academic_year && profile.college) {
              setProfileComplete(true)
            }
          }
        }
        // Refresh vault from localStorage (Supabase sync happens on next retrieval)
        setCards(vault.load())

        // FIX 10: detect migratable local data after sign-in
        const migratable = detectMigratableData()
        if (migratable.vault || migratable.retrieval) {
          setMigrationPrompt(true)
        }

        // FIX 11: flush analytics queue after sign-in (non-blocking)
        const queuedEvents = analytics.flush()
        if (queuedEvents.length > 0) {
          fetch('/api/analytics', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ events: queuedEvents }),
          }).catch(() => {
            // If sync fails, re-queue events (best-effort)
            // Events remain in queue for next flush attempt
          })
        }
      } else if (event === 'SIGNED_OUT') {
        setUserId('')
        setUserName('')
        setCachedUserId(null)
        setProfileComplete(false)
        setMigrationPrompt(false)
        setCards(vault.load())
      }
    })
    return () => {
      subscription.unsubscribe()
    }
  }, [])

  // Persist subject & discipline selections to localStorage
  useEffect(() => {
    if (mounted) localStorage.setItem('mnemonicflow_subject', activeSubject)
  }, [activeSubject, mounted])
  useEffect(() => {
    if (mounted) localStorage.setItem('mnemonicflow_discipline', activeDiscipline)
  }, [activeDiscipline, mounted])

  // FIX 11: periodic analytics flush every 5 minutes when authenticated
  useEffect(() => {
    if (!userId) return
    const interval = setInterval(() => {
      const events = analytics.flush()
      if (events.length > 0) {
        fetch('/api/analytics', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ events }),
        }).catch(() => { /* keep queue for retry */ })
      }
    }, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [userId])

  // FIX 10: migration handler
  const handleMigration = useCallback(async () => {
    setMigrationRunning(true)
    try {
      const [retrievalCount, vaultCount] = await Promise.all([
        migrateRetrievalAttempts(),
        migrateVaultCards(),
      ])
      const total = retrievalCount + vaultCount
      setMigrationDone(total > 0
        ? `Imported ${total} record${total !== 1 ? 's' : ''} into your account.`
        : 'No local data found to import.')
      setMigrationPrompt(false)
    } catch {
      setMigrationDone('Migration failed. You can try again later.')
    } finally {
      setMigrationRunning(false)
    }
  }, [])

  // Body scroll lock when mobile sidebar drawer is open
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [sidebarOpen])

  // Mouse parallax — sets CSS custom properties for depth-parallax utility
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 2  // -1 to 1
      const y = (e.clientY / window.innerHeight - 0.5) * 2 // -1 to 1
      document.documentElement.style.setProperty('--mouse-x', String(x))
      document.documentElement.style.setProperty('--mouse-y', String(y))
    }
    window.addEventListener('mousemove', handleMouseMove, { passive: true })
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  // Navigate with history tracking
  const navigateTo = useCallback((newView: View) => {
    setViewHistory(prev => [...prev, view])
    setView(newView)
  }, [view])

  // Navigate back in history
  const navigateBack = useCallback(() => {
    setViewHistory(prev => {
      if (prev.length === 0) {
        setView('dashboard')
        return []
      }
      const newHistory = [...prev]
      const previousView = newHistory.pop()!
      setView(previousView)
      return newHistory
    })
  }, [])

  const refreshCards = useCallback(() => setCards(vault.load()), [])

  const handleCardSaved = useCallback((topic: string, subject: SubjectId, mnemonic: MnemonicOutput, imageUrl?: string) => {
    vault.add(topic, subject, mnemonic, imageUrl)
    refreshCards()
    // Sync to Supabase if authenticated (fire-and-forget)
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        const mnemonicId = mnemonic.mnemonicId ?? `mn_${topic.toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 40)}`
        fetch('/api/vault', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mnemonicId,
            subject,
            cardData: { topic, subject, mnemonic, imageUrl },
          }),
        }).catch(() => {})
        supabase.from('profiles').update({ total_cards: vault.load().length }).eq('id', user.id)
      }
    })
  }, [refreshCards])

  const handleDelete    = useCallback((id: string) => { vault.delete(id); refreshCards() }, [refreshCards])
  const handleToggleFav = useCallback((id: string) => { vault.toggleFavorite(id); refreshCards() }, [refreshCards])
  const handleReview    = useCallback((id: string, quality: ReviewQuality) => {
    vault.review(id, quality)
    refreshCards()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) supabase.from('profiles').update({ total_reviews: vault.load().reduce((n, c) => n + c.repetitions, 0) }).eq('id', user.id)
    })
  }, [refreshCards])
  const handleExport    = useCallback(() => {
    if (cards.length === 0) { alert('No cards to export yet!'); return }
    downloadAnkiCSV(cards)
  }, [cards])

  const goToWorkspace = useCallback((topic?: string) => {
    if (topic) setCurrentTopic(topic)
    setPendingTopic(topic)
    setViewHistory(prev => [...prev, view])
    setView('workspace')
  }, [view])

  // Trigger quiz from any source (High-Yield guide, Workspace mnemonic, Vault card, etc.)
  const handleQuizFromSource = useCallback((topic: string, subject: SubjectId) => {
    setCurrentTopic(topic)
    setPendingQuiz({ topic, subject })
    setViewHistory(prev => [...prev, view])
    setView('quiz')
  }, [view])

  // Navigate to High-Yield Notes with a specific topic
  const goToNotes = useCallback((topic: string, _subject?: SubjectId) => {
    setCurrentTopic(topic)
    setViewHistory(prev => [...prev, view])
    setView('notes')
  }, [view])

  // Refresh profile data from Supabase
  const refreshProfileData = useCallback(async () => {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single()
    if (data) setProfileData(data)
  }, [userId])

  // Profile gate completion handler
  const handleProfileComplete = useCallback((program: 'mbbs' | 'bds') => {
    setActiveDiscipline(program)
    setProfileComplete(true)
    refreshProfileData()
    // Auto-select first subject of the chosen discipline
    const subs = getSubjectsByDiscipline(program)
    if (subs.length > 0) setActiveSubject(subs[0].id)
  }, [refreshProfileData])

  const dueCount = getDueCount(cards)

  if (!mounted) return (
    <div className="flex min-h-screen bg-void items-center justify-center">
      <div className="flex items-center gap-3">
        <Logo showText={false} size="md" />
        <div className="w-5 h-5 rounded-full border-2 border-neon-green border-t-transparent animate-spin" />
        <span className="text-xs text-ink-tertiary font-mono tracking-widest">LOADING...</span>
      </div>
    </div>
  )

  // Profile gate — blocks app until profile is complete or edit is pending
  const showProfileGate = profileData && (
    profileData.profile_status === 'draft' ||
    (profileData.profile_status === 'verified' && profileData.edits_remaining > 0)
  )

  if (showProfileGate && userId) {
    return (
      <AuthGuard>
        <ProfileGate
          userId={userId}
          onComplete={handleProfileComplete}
          profileData={profileData}
          onProfileUpdate={refreshProfileData}
        />
      </AuthGuard>
    )
  }

  return (
    <AuthGuard>
      <div className="flex min-h-screen bg-void font-sans relative">

        {/* Ambient background */}
        <div className="pointer-events-none fixed inset-0 overflow-hidden">
          <div className="absolute top-0 left-1/2 w-96 h-96 rounded-full opacity-[0.03] blur-3xl -translate-x-1/2"
            style={{ background: 'radial-gradient(circle, #0df27d, transparent)' }} />
          <div className="absolute bottom-0 right-1/4 w-80 h-80 rounded-full opacity-[0.03] blur-3xl"
            style={{ background: 'radial-gradient(circle, #7c5cfc, transparent)' }} />
        </div>

        {/* ── Mobile sidebar drawer ── */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="absolute inset-0 bg-void/80 backdrop-blur-sm animate-fade-in" onClick={() => setSidebarOpen(false)} />
            <div className="absolute left-0 top-0 h-full w-72 max-w-[85vw] z-50 animate-slide-right">
              <Sidebar
                activeSubject={activeSubject}
                onSubjectChange={(s) => { setActiveSubject(s); setSidebarOpen(false) }}
                dueCount={dueCount}
                totalCards={cards.length}
                onExport={handleExport}
                collapsed={false}
                onToggleCollapsed={() => {}}
                view={view}
                onViewChange={(v) => { navigateTo(v as View); setSidebarOpen(false) }}
                onFilterSelect={(f) => {
                  setVaultFilter(f)
                  setView('workspace')
                  setSidebarOpen(false)
                  setVaultOpen(true)
                }}
                onOpenSettings={() => setSettingsOpen(true)}
                activeDiscipline={activeDiscipline}
                onDisciplineChange={setActiveDiscipline}
                onNavigateBack={navigateBack}
              />
            </div>
          </div>
        )}

        {/* ── Desktop sidebar (flex child — width syncs automatically, no margin hacks) ── */}
        <div className="hidden lg:block shrink-0 h-screen sticky top-0">
          <Sidebar
            activeSubject={activeSubject}
            onSubjectChange={setActiveSubject}
            dueCount={dueCount}
            totalCards={cards.length}
            onExport={handleExport}
            collapsed={sidebarCollapsed}
            onToggleCollapsed={() => setSidebarCollapsed(c => !c)}
            view={view}
            onViewChange={(v) => navigateTo(v as View)}
            onFilterSelect={(f) => {
              setVaultFilter(f)
              setView('workspace')
              setVaultCollapsed(false)
            }}
            onOpenSettings={() => setSettingsOpen(true)}
            activeDiscipline={activeDiscipline}
            onDisciplineChange={setActiveDiscipline}
            onNavigateBack={navigateBack}
          />
        </div>

        {/* ── Main column ── */}
        <main className="flex-1 flex flex-col min-h-screen relative z-0 min-w-0">
          {/* Top bar (desktop only — floating backdrop-blur, no border) */}
          <div className="hidden lg:flex shrink-0 items-center justify-end px-4 py-2 bg-surface/60 sticky top-0 z-20 backdrop-blur-xl">
            <UserMenu onOpenSettings={() => setSettingsOpen(true)} />
          </div>

          {/* FIX 10: Migration prompt banner */}
          {migrationPrompt && (
            <div className="mx-4 mt-2 p-3 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold text-sky-400">Local study data found</p>
                <p className="text-[9px] text-ink-tertiary mt-0.5">Import your previous retrieval history and saved cards into your account?</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={handleMigration}
                  disabled={migrationRunning}
                  className="px-3 py-1.5 rounded-lg text-[9px] font-bold bg-sky-500/15 text-sky-400 hover:bg-sky-500/25 transition-all active:scale-95 disabled:opacity-50"
                >
                  {migrationRunning ? 'Importing…' : 'Import Data'}
                </button>
                <button
                  onClick={() => setMigrationPrompt(false)}
                  className="px-3 py-1.5 rounded-lg text-[9px] font-bold bg-card/40 text-ink-tertiary hover:text-ink-secondary transition-all"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

          {/* FIX 10: Migration result notification */}
          {migrationDone && (
            <div className="mx-4 mt-2 p-3 rounded-xl bg-neon-green/10 border border-neon-green/20 flex items-center justify-between gap-3">
              <p className="text-[10px] text-neon-green">{migrationDone}</p>
              <button
                onClick={() => setMigrationDone(null)}
                className="text-[9px] text-ink-tertiary hover:text-ink-secondary"
              >
                Dismiss
              </button>
            </div>
          )}

          <div className="flex-1">
            {view === 'dashboard' ? (
              <WelcomeDashboard
                userName={userName}
                cards={cards}
                dueCount={dueCount}
                onQuickGenerate={goToWorkspace}
                onContinue={() => goToWorkspace()}
                onOpenVault={() => (window.innerWidth >= 1024 ? setVaultCollapsed(false) : setVaultOpen(true))}
                onExport={handleExport}
                profileComplete={profileComplete}
                onCompleteProfile={() => window.location.href = '/profile'}
              />
            ) : view === 'workspace' ? (
              <Workspace
                activeSubject={activeSubject}
                onSubjectChange={setActiveSubject}
                onCardSaved={handleCardSaved}
                onOpenSidebar={() => setSidebarOpen(true)}
                onOpenVault={() => setVaultOpen(true)}
                vaultCollapsed={vaultCollapsed}
                onToggleVaultCollapsed={() => setVaultCollapsed(v => !v)}
                initialTopic={pendingTopic}
                onViewChange={(v) => navigateTo(v as View)}
                onQuizFromTopic={handleQuizFromSource}
                appSettings={appSettings}
                onTopicChange={setCurrentTopic}
                onExport={handleExport}
              />
            ) : view === 'notes' ? (
              <HighYieldNotes
                discipline={activeDiscipline}
                onGenerateWithMnemonic={goToWorkspace}
                onQuizFromGuide={handleQuizFromSource}
                onNavigateBack={navigateBack}
                currentTopic={currentTopic}
              />
            ) : view === 'quiz' ? (
              <QuizArena
                discipline={activeDiscipline}
                onGenerateFromMnemonic={goToWorkspace}
                pendingQuiz={pendingQuiz}
                onPendingQuizConsumed={() => setPendingQuiz(null)}
                onNavigateBack={navigateBack}
                currentTopic={currentTopic}
              />
            ) : view === 'examiner' ? (
              <AIExaminer
                discipline={activeDiscipline}
                onNavigateBack={navigateBack}
                onQuizFromSource={handleQuizFromSource}
                onGenerateMnemonic={goToWorkspace}
                onReviewGuide={goToWorkspace}
                currentTopic={currentTopic}
              />
            ) : view === 'simulation' ? (
              <ClinicalSimulation
                discipline={activeDiscipline}
                onNavigateBack={navigateBack}
                onQuizFromSource={handleQuizFromSource}
                onGenerateMnemonic={goToWorkspace}
                onReviewGuide={goToWorkspace}
                currentTopic={currentTopic}
              />
            ) : view === 'srs' ? (
              <SRSReview
                cards={cards.filter(isDue)}
                onReview={handleReview}
                onNavigateBack={navigateBack}
              />
            ) : view === 'ar' ? (
              <ARViewer
                subject={activeSubject}
                onNavigateBack={navigateBack}
              />
            ) : null}
          </div>
        </main>

        {/* ── Vault panel: desktop static rail (only in workspace view) ── */}
        {view === 'workspace' && !vaultCollapsed && (
          <div className="hidden lg:block shrink-0 h-screen sticky top-0 w-80">
            <VaultPanel
              cards={cards}
              onDelete={handleDelete}
              onToggleFav={handleToggleFav}
              isOpen
              onClose={() => setVaultCollapsed(true)}
              variant="rail"
              filter={vaultFilter}
              onFilterChange={setVaultFilter}
              onQuizFromVault={handleQuizFromSource}
              onNotesFromVault={goToNotes}
              onExport={handleExport}
            />
          </div>
        )}

        {/* ── Vault panel: mobile/tablet drawer (available from any view) ── */}
        <div className="lg:hidden">
          <VaultPanel
            cards={cards}
            onDelete={handleDelete}
            onToggleFav={handleToggleFav}
            isOpen={vaultOpen}
            onClose={() => setVaultOpen(false)}
            variant="drawer"
            filter={vaultFilter}
            onFilterChange={setVaultFilter}
            onQuizFromVault={handleQuizFromSource}
            onNotesFromVault={goToNotes}
            onExport={handleExport}
          />
        </div>

        {/* ── Settings panel ── */}
        <SettingsPanel
          isOpen={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          settings={appSettings}
          onSettingsChange={setAppSettings}
        />

      </div>
    </AuthGuard>
  )
}
