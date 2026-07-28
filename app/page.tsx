'use client'

import { useState, useEffect, useCallback } from 'react'
import Sidebar, { SidebarView } from './components/Sidebar'
import Workspace        from './components/Workspace'
import VaultPanel       from './components/VaultPanel'
import WelcomeDashboard from './components/WelcomeDashboard'
import UserMenu         from './components/UserMenu'
import AuthGuard        from './components/AuthGuard'
import HighYieldNotes, { generateHighYieldNotes, HighYieldNotesData } from './components/HighYieldNotes'
import QuizArena, { generateDynamicQuiz, QuizQuestion } from './components/QuizArena'
import { supabase } from './lib/supabase'
import { vault, downloadAnkiCSV, getDueCount } from './lib/vault'
import { Flashcard, SubjectId, MnemonicOutput, ReviewQuality, VaultFilter } from './types'
import { cn } from './lib/utils'

type View = 'dashboard' | 'workspace' | 'notes' | 'quiz'

export default function MnemonicFlowPro() {
  const [cards,           setCards]           = useState<Flashcard[]>([])
  const [activeSubject,   setActiveSubject]   = useState<SubjectId>('anatomy')
  const [mounted,         setMounted]         = useState(false)
  const [sidebarOpen,     setSidebarOpen]     = useState(false)   // mobile drawer
  const [vaultOpen,       setVaultOpen]       = useState(false)   // mobile drawer
  const [vaultCollapsed,  setVaultCollapsed]  = useState(true)    // desktop hide/show starts collapsed for space optimization
  const [sidebarCollapsed,setSidebarCollapsed]= useState(false)   // desktop hide/show
  const [view,            setView]            = useState<View>('dashboard')
  const [vaultFilter,     setVaultFilter]     = useState<VaultFilter>('all')
  const [userName,        setUserName]        = useState('Student')
  const [pendingTopic,    setPendingTopic]    = useState<string | undefined>(undefined)

  // Premium High Yield Notes & Quiz states
  const [highYieldNotes,  setHighYieldNotes]  = useState<HighYieldNotesData | null>(null)
  const [quizQuestions,   setQuizQuestions]   = useState<QuizQuestion[] | null>(null)

  useEffect(() => {
    setCards(vault.load())
    setMounted(true)
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      const name = (user.user_metadata?.full_name as string | undefined) ?? user.email?.split('@')[0] ?? 'Student'
      setUserName(name)
    })
  }, [])

  const refreshCards = useCallback(() => setCards(vault.load()), [])

  const handleCardSaved = useCallback((topic: string, subject: SubjectId, mnemonic: MnemonicOutput, imageUrl?: string) => {
    vault.add(topic, subject, mnemonic, imageUrl)
    refreshCards()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) supabase.from('profiles').update({ total_cards: vault.load().length }).eq('id', user.id)
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
    setPendingTopic(topic)
    setView('workspace')
  }, [])

  // Hook point when a mnemonic is successfully generated in Workspace
  const handleMnemonicGenerated = useCallback((topic: string, subjectLabel: string, result: MnemonicOutput) => {
    const notes = generateHighYieldNotes(topic, subjectLabel, result)
    const questions = generateDynamicQuiz(topic, result)
    setHighYieldNotes(notes)
    setQuizQuestions(questions)
  }, [])

  const dueCount = getDueCount(cards)

  if (!mounted) return (
    <div className="flex min-h-screen bg-void items-center justify-center">
      <div className="flex items-center gap-3">
        <div className="w-5 h-5 rounded-full border-2 border-neon-green border-t-transparent animate-spin" />
        <span className="text-xs text-ink-tertiary font-mono tracking-widest">LOADING...</span>
      </div>
    </div>
  )

  return (
    <AuthGuard>
      <div className="flex min-h-screen bg-void font-sans relative">

        {/* Ambient background */}
        <div className="pointer-events-none fixed inset-0 overflow-hidden">
          <div className="absolute top-0 left-1/2 w-96 h-96 rounded-full opacity-[0.04] blur-3xl -translate-x-1/2"
            style={{ background: 'radial-gradient(circle, #0df27d, transparent)' }} />
          <div className="absolute bottom-0 right-1/4 w-80 h-80 rounded-full opacity-[0.03] blur-3xl"
            style={{ background: 'radial-gradient(circle, #c77dff, transparent)' }} />
          <div className="absolute inset-0 opacity-[0.012]"
            style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
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
                onViewChange={(v) => { setView(v as View); setSidebarOpen(false) }}
                onFilterSelect={(f) => {
                  setVaultFilter(f)
                  setView('workspace')
                  setSidebarOpen(false)
                  setVaultOpen(true)
                }}
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
            onViewChange={(v) => setView(v as View)}
            onFilterSelect={(f) => {
              setVaultFilter(f)
              setView('workspace')
              setVaultCollapsed(false)
            }}
          />
        </div>

        {/* ── Main column ── */}
        <main className="flex-1 flex flex-col min-h-screen relative z-0 lg:border-x lg:border-border min-w-0">
          {/* Top bar (desktop only — mobile controls live in each view's own header) */}
          <div className="hidden lg:flex shrink-0 items-center justify-end px-4 py-2 border-b border-border bg-[rgba(9,9,9,0.9)] sticky top-0 z-20 backdrop-blur-md">
            <UserMenu />
          </div>

          <div className="flex-1">
            {view === 'dashboard' ? (
              <WelcomeDashboard
                userName={userName}
                cards={cards}
                dueCount={dueCount}
                onQuickGenerate={goToWorkspace}
                onContinue={() => goToWorkspace()}
                onOpenVault={() => (window.innerWidth >= 1024 ? setVaultCollapsed(false) : setVaultOpen(true))}
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
                onMnemonicGenerated={handleMnemonicGenerated}
                onViewChange={setView}
              />
            ) : view === 'notes' ? (
              <HighYieldNotes
                notes={highYieldNotes}
                onGoToGenerate={() => setView('workspace')}
              />
            ) : (
              <QuizArena
                questions={quizQuestions}
                onGoToGenerate={() => setView('workspace')}
              />
            )}
          </div>
        </main>

        {/* ── Vault panel: desktop static rail (only in workspace view) ── */}
        {view === 'workspace' && !vaultCollapsed && (
          <div className="hidden lg:block shrink-0 h-screen sticky top-0 w-80">
            <VaultPanel
              cards={cards}
              onDelete={handleDelete}
              onToggleFav={handleToggleFav}
              onReview={handleReview}
              isOpen
              onClose={() => setVaultCollapsed(true)}
              variant="rail"
              filter={vaultFilter}
              onFilterChange={setVaultFilter}
            />
          </div>
        )}

        {/* ── Vault panel: mobile/tablet drawer (available from any view) ── */}
        <div className="lg:hidden">
          <VaultPanel
            cards={cards}
            onDelete={handleDelete}
            onToggleFav={handleToggleFav}
            onReview={handleReview}
            isOpen={vaultOpen}
            onClose={() => setVaultOpen(false)}
            variant="drawer"
            filter={vaultFilter}
            onFilterChange={setVaultFilter}
          />
        </div>

      </div>
    </AuthGuard>
  )
}
