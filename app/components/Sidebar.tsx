'use client'

// ─────────────────────────────────────────────────────────────────────────────
// app/components/Sidebar.tsx
// Glassmorphic left sidebar with medical subject navigation and premium routes.
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react'
import {
  LayoutGrid, BookOpen, Zap, Star, Clock, Download, ChevronRight,
  Activity, Sparkles, Scroll, Target, Settings, Info
} from 'lucide-react'
import { SUBJECTS } from '../lib/subjects'
import { SubjectId, VaultFilter } from '../types'
import { cn } from '../lib/utils'

export type SidebarView = 'dashboard' | 'workspace' | 'notes' | 'quiz'

interface SidebarProps {
  activeSubject:    SubjectId | null
  onSubjectChange: (id: SubjectId) => void
  dueCount:         number
  totalCards:       number
  onExport:         () => void
  collapsed:        boolean
  onToggleCollapsed:() => void
  view?:            SidebarView
  onViewChange?:    (v: SidebarView) => void
  onFilterSelect?:  (f: VaultFilter) => void
}

export default function Sidebar({
  activeSubject,
  onSubjectChange,
  dueCount,
  totalCards,
  onExport,
  collapsed,
  onToggleCollapsed,
  view = 'workspace',
  onViewChange,
  onFilterSelect,
}: SidebarProps) {
  return (
    <aside
      className={cn(
        'relative h-full flex flex-col transition-[width] duration-300 ease-out',
        'bg-[rgba(10,10,10,0.85)] backdrop-blur-xl',
        'border-r border-border',
        collapsed ? 'w-[68px]' : 'w-64',
      )}
    >
      {/* Subtle scanline overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.015]"
        style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.8) 2px, rgba(255,255,255,0.8) 3px)' }}
      />

      {/* ── Logo / Header ── */}
      <div className={cn(
        'flex items-center gap-3 px-5 py-5 border-b border-border shrink-0',
        collapsed && 'justify-center px-0',
      )}>
        <div className="relative shrink-0">
          <div className="w-9 h-9 rounded-xl bg-neon-green-dim border border-neon-green-border flex items-center justify-center shadow-glow-sm">
            <Activity className="w-4.5 h-4.5 text-neon-green" strokeWidth={2.5} />
          </div>
          <div className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-neon-green animate-pulse-glow" />
        </div>
        {!collapsed && (
          <div className="min-w-0 animate-fade-in">
            <div className="text-xs font-bold tracking-widest text-neon-green uppercase font-mono truncate">
              MnemonicFlow
            </div>
            <div className="text-[10px] text-ink-tertiary tracking-wide">Pro Edition</div>
          </div>
        )}
        {!collapsed && (
          <button
            onClick={onToggleCollapsed}
            title="Collapse sidebar"
            className="ml-auto shrink-0 p-1.5 rounded-lg text-ink-tertiary hover:text-ink-secondary hover:bg-elevated transition-colors"
          >
            <ChevronRight className="w-3.5 h-3.5 rotate-180" />
          </button>
        )}
      </div>

      {collapsed && (
        <button
          onClick={onToggleCollapsed}
          title="Expand sidebar"
          className="shrink-0 mx-auto -mt-1 mb-1 p-1.5 rounded-lg text-ink-tertiary hover:text-ink-secondary hover:bg-elevated transition-colors"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      )}

      {/* ── Top-level view switch ── */}
      <div className={cn('px-3 pt-3 space-y-1', collapsed && 'px-2')}>
        <NavItem
          collapsed={collapsed}
          icon={<LayoutGrid className="w-4 h-4" />}
          label="Dashboard"
          active={view === 'dashboard'}
          onClick={() => onViewChange?.('dashboard')}
        />
        <NavItem
          collapsed={collapsed}
          icon={<Sparkles className="w-4 h-4" />}
          label="Generate"
          active={view === 'workspace'}
          onClick={() => onViewChange?.('workspace')}
        />
        <NavItem
          collapsed={collapsed}
          icon={<Scroll className="w-4 h-4" />}
          label="High-Yield Notes"
          active={view === 'notes'}
          onClick={() => onViewChange?.('notes')}
        />
        <NavItem
          collapsed={collapsed}
          icon={<Target className="w-4 h-4" />}
          label="Quiz Arena"
          active={view === 'quiz'}
          onClick={() => onViewChange?.('quiz')}
        />
      </div>

      {/* ── Stats strip ── */}
      {!collapsed && (
        <div className="flex gap-2 mx-3 mt-4 mb-1 animate-fade-in">
          <div className="flex-1 bg-elevated rounded-xl p-2.5 border border-border text-center">
            <div className="text-base font-bold font-mono text-ink-primary">{totalCards}</div>
            <div className="text-[9px] text-ink-tertiary uppercase tracking-wider">Cards</div>
          </div>
          <div className={cn(
            'flex-1 rounded-xl p-2.5 border text-center',
            dueCount > 0
              ? 'bg-neon-review-dim border-neon-review-border'
              : 'bg-elevated border-border',
          )}>
            <div className={cn(
              'text-base font-bold font-mono',
              dueCount > 0 ? 'text-neon-review' : 'text-ink-primary',
            )}>
              {dueCount}
            </div>
            <div className="text-[9px] text-ink-tertiary uppercase tracking-wider">Due</div>
          </div>
        </div>
      )}

      {/* ── Quick filters ── */}
      {!collapsed ? (
        <div className="px-3 pt-3 pb-1 space-y-0.5">
          <SidebarBtn
            icon={<BookOpen className="w-3.5 h-3.5" />}
            label="Vault"
            badge={totalCards}
            onClick={() => onFilterSelect?.('all')}
          />
          <SidebarBtn
            icon={<Star className="w-3.5 h-3.5" />}
            label="Favorites"
            onClick={() => onFilterSelect?.('favorites')}
          />
          <SidebarBtn
            icon={<Clock className="w-3.5 h-3.5" />}
            label="Review Due"
            badge={dueCount}
            badgeVariant="review"
            onClick={() => onFilterSelect?.('due')}
          />
          <SidebarBtnWithTooltip
            icon={<Settings className="w-3.5 h-3.5" />}
            label="Settings"
            tooltip="Settings mode is reserved for premium MnemonicFlow institutional accounts."
          />
        </div>
      ) : (
        <div className="px-2 pt-2 pb-1 space-y-1">
          <button
            onClick={() => onFilterSelect?.('all')}
            title={`All Cards (${totalCards})`}
            className="w-full flex items-center justify-center py-2 rounded-xl text-ink-tertiary hover:text-ink-secondary hover:bg-elevated/60 transition-colors"
          >
            <BookOpen className="w-4 h-4" />
          </button>
          <button
            onClick={() => onFilterSelect?.('due')}
            title={`Review Due (${dueCount})`}
            className={cn(
              "w-full flex items-center justify-center py-2 rounded-xl transition-colors",
              dueCount > 0 ? "text-neon-review hover:bg-neon-review-dim" : "text-ink-tertiary hover:text-ink-secondary hover:bg-elevated/60"
            )}
          >
            <Clock className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── Divider ── */}
      <div className={cn('border-t border-border my-3 mx-3', collapsed && 'mx-2')} />

      {/* ── Subject list ── */}
      <div className={cn('flex-1 overflow-y-auto px-3 space-y-0.5 scrollbar-none', collapsed && 'px-2')}>
        {!collapsed && (
          <div className="text-[9px] text-ink-tertiary uppercase tracking-widest px-2 mb-2 font-mono">
            Subjects
          </div>
        )}
        {SUBJECTS.map((subject, i) => {
          const isActive = activeSubject === subject.id && view === 'workspace'
          return (
            <button
              key={subject.id}
              onClick={() => { onSubjectChange(subject.id); onViewChange?.('workspace') }}
              title={collapsed ? subject.label : undefined}
              style={{ animationDelay: `${i * 40}ms` }}
              className={cn(
                'relative w-full flex items-center gap-2.5 px-2.5 py-2.5 rounded-xl text-left transition-all duration-150 group animate-slide-right',
                isActive
                  ? 'bg-elevated border border-subtle'
                  : 'hover:bg-elevated/50 border border-transparent',
                collapsed && 'justify-center px-0',
              )}
            >
              {/* Active accent bar */}
              {isActive && (
                <span
                  className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-[3px] rounded-full"
                  style={{ backgroundColor: subject.accent, boxShadow: `0 0 8px ${subject.accent}` }}
                />
              )}

              <span
                className={cn('shrink-0 text-base leading-none', collapsed && 'text-lg')}
                title={subject.label}
              >
                {subject.icon}
              </span>

              {!collapsed && (
                <>
                  <div className="flex-1 min-w-0">
                    <div className={cn(
                      'text-xs font-medium truncate leading-tight',
                      isActive ? 'text-ink-primary' : 'text-ink-secondary group-hover:text-ink-primary',
                    )}>
                      {subject.label}
                    </div>
                    {isActive && (
                      <div className="text-[9px] text-ink-tertiary truncate">{subject.description}</div>
                    )}
                  </div>

                  {isActive && (
                    <div
                      className="w-1 h-1 rounded-full shrink-0"
                      style={{ backgroundColor: subject.accent, boxShadow: `0 0 6px ${subject.accent}` }}
                    />
                  )}
                </>
              )}
            </button>
          )
        })}
      </div>

      {/* ── Bottom actions ── */}
      <div className={cn('border-t border-border p-3 space-y-1 shrink-0', collapsed && 'px-2')}>
        <button
          onClick={onExport}
          title={collapsed ? 'Export Anki CSV' : undefined}
          className={cn(
            'w-full flex items-center gap-2 px-2.5 py-2.5 rounded-xl text-xs font-medium',
            'text-ink-tertiary hover:text-neon-pharma hover:bg-neon-pharma-dim',
            'border border-transparent hover:border-neon-pharma-border transition-all duration-150 active:scale-[0.98]',
            collapsed && 'justify-center',
          )}
        >
          <Download className="w-3.5 h-3.5 shrink-0" />
          {!collapsed && 'Export Anki CSV'}
        </button>
      </div>
    </aside>
  )
}

// ── Top-level nav item (Dashboard / Generate) ─────────────────────────────────
function NavItem({
  collapsed, icon, label, active, onClick,
}: {
  collapsed: boolean
  icon:      React.ReactNode
  label:     string
  active:    boolean
  onClick:   () => void
}) {
  return (
    <button
      onClick={onClick}
      title={collapsed ? label : undefined}
      className={cn(
        'w-full flex items-center gap-2.5 px-2.5 py-2.5 rounded-xl text-left transition-all duration-150',
        active
          ? 'bg-neon-green-dim border border-neon-green-border text-neon-green font-bold shadow-sm'
          : 'text-ink-secondary hover:text-ink-primary hover:bg-elevated/60 border border-transparent',
        collapsed && 'justify-center px-0',
      )}
    >
      <span className="shrink-0">{icon}</span>
      {!collapsed && <span className="text-xs font-semibold">{label}</span>}
    </button>
  )
}

// ── Mini sidebar button ────────────────────────────────────────────────────────
function SidebarBtn({
  icon, label, badge, badgeVariant = 'default', onClick,
}: {
  icon:          React.ReactNode
  label:         string
  badge?:        number
  badgeVariant?: 'default' | 'review'
  onClick?:      () => void
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left hover:bg-elevated/50 transition-colors group active:scale-[0.98]"
    >
      <span className="text-ink-tertiary group-hover:text-ink-secondary transition-colors">{icon}</span>
      <span className="flex-1 text-xs text-ink-secondary group-hover:text-ink-primary transition-colors">
        {label}
      </span>
      {badge !== undefined && badge > 0 && (
        <span className={cn(
          'text-[9px] font-bold px-1.5 py-0.5 rounded-full font-mono',
          badgeVariant === 'review'
            ? 'bg-neon-review-dim text-neon-review'
            : 'bg-subtle text-ink-tertiary',
        )}>
          {badge}
        </span>
      )}
    </button>
  )
}

// ── Sidebar button with custom institutional premium tooltip ──────────────────
function SidebarBtnWithTooltip({
  icon, label, tooltip
}: {
  icon:    React.ReactNode
  label:   string
  tooltip: string
}) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative w-full">
      <button
        type="button"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onClick={() => alert(tooltip)}
        className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left text-ink-tertiary/75 hover:bg-elevated/30 transition-colors group active:scale-[0.98]"
      >
        <span className="text-ink-tertiary/60 group-hover:text-ink-secondary transition-colors">{icon}</span>
        <span className="flex-1 text-xs text-ink-tertiary/75 group-hover:text-ink-secondary transition-colors">
          {label}
        </span>
      </button>

      {show && (
        <div className="absolute left-full top-0 ml-2 w-48 p-2 rounded-lg bg-void border border-border text-[10px] text-ink-secondary z-50 shadow-card-lg animate-fade-in leading-normal flex gap-1.5">
          <Info className="w-3.5 h-3.5 text-neon-physio shrink-0" />
          <span>{tooltip}</span>
        </div>
      )}
    </div>
  )
}
