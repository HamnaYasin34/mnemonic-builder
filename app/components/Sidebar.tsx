'use client'

// ─────────────────────────────────────────────────────────────────────────────
// app/components/Sidebar.tsx
// Premium sidebar with grouped navigation, bordered panels, and neon emerald accents.
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react'
import {
  LayoutGrid, BookOpen, Zap, Star, Clock, Download, ChevronRight,
  Activity, Sparkles, Scroll, Target, Settings, GraduationCap,
  Stethoscope, FlaskConical, Brain, Box,
} from 'lucide-react'
import { SUBJECTS, DISCIPLINES, getSubjectsByDiscipline } from '../lib/subjects'
import { SubjectId, VaultFilter, Discipline } from '../types'
import { cn } from '../lib/utils'
import Logo from './Logo'

// Sidebar views
export type SidebarView = 'dashboard' | 'workspace' | 'notes' | 'quiz' | 'examiner' | 'simulation' | 'srs' | 'ar'

// Navigation item shape
interface NavItemDef {
  view: SidebarView
  icon: typeof LayoutGrid
  label: string
  badgeKey?: 'due'
  badgeLabel?: string
}

// Navigation group definitions
const NAV_GROUPS: { label: string; items: NavItemDef[] }[] = [
  {
    label: 'Overview',
    items: [
      { view: 'dashboard' as SidebarView, icon: LayoutGrid, label: 'Dashboard' },
    ],
  },
  {
    label: 'Study',
    items: [
      { view: 'workspace' as SidebarView, icon: Sparkles, label: 'Generate' },
      { view: 'notes' as SidebarView, icon: Scroll, label: 'High-Yield Library' },
    ],
  },
  {
    label: 'Practice',
    items: [
      { view: 'quiz' as SidebarView, icon: Target, label: 'Quiz Arena' },
      { view: 'srs' as SidebarView, icon: Brain, label: 'SRS Review', badgeKey: 'due' as const },
      { view: 'examiner' as SidebarView, icon: Stethoscope, label: 'AI Examiner' },
      { view: 'simulation' as SidebarView, icon: FlaskConical, label: 'Clinical Simulation' },
    ],
  },
  {
    label: 'Tools',
    items: [
      { view: 'ar' as SidebarView, icon: Box, label: 'AR Visualize', badgeLabel: 'Beta' },
    ],
  },
]

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
  onOpenSettings?:  () => void
  activeDiscipline?: Discipline
  onDisciplineChange?: (d: Discipline) => void
  onNavigateBack?:  () => void
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
  onOpenSettings,
  activeDiscipline = 'mbbs',
  onDisciplineChange,
  onNavigateBack,
}: SidebarProps) {
  const [localDiscipline, setLocalDiscipline] = useState<Discipline>(activeDiscipline)
  const discipline = activeDiscipline
  const filteredSubjects = getSubjectsByDiscipline(discipline)

  const handleDisciplineChange = (d: Discipline) => {
    setLocalDiscipline(d)
    onDisciplineChange?.(d)
    // Auto-select first subject of new discipline
    const subs = getSubjectsByDiscipline(d)
    if (subs.length > 0) onSubjectChange(subs[0].id)
  }

  return (
    <aside
      className={cn(
        'relative h-full flex flex-col transition-[width] duration-300 ease-out overflow-hidden',
        'bg-surface',
        collapsed ? 'w-[68px]' : 'w-64',
      )}
    >
      {/* ── Logo / Header ── */}
      <div className={cn(
        'flex items-center px-5 py-5 shrink-0',
        collapsed && 'justify-center px-0 gap-0',
      )}>
        <Logo showText={!collapsed} size="md" className={cn(collapsed && 'gap-0')} />
        {!collapsed && (
          <button
            onClick={onToggleCollapsed}
            title="Collapse sidebar"
            className="shrink-0 ml-auto p-1.5 rounded-lg text-ink-tertiary hover:text-ink-secondary hover:bg-elevated/60 transition-colors"
          >
            <ChevronRight className="w-3.5 h-3.5 rotate-180" />
          </button>
        )}
      </div>

      {collapsed && (
        <button
          onClick={onToggleCollapsed}
          title="Expand sidebar"
          className="shrink-0 mx-auto -mt-1 mb-1 p-1.5 rounded-lg text-ink-tertiary hover:text-ink-secondary hover:bg-elevated/60 transition-colors"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      )}

      {/* ── Grouped Navigation ── */}
      <div className={cn('px-3 pt-2 shrink-0 space-y-3', collapsed && 'px-2 space-y-1')}>
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            {!collapsed && (
              <div className="px-2.5 pb-1">
                <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-ink-tertiary font-mono">{group.label}</span>
              </div>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon
                const isActive = view === item.view
                const badgeCount = item.badgeKey === 'due' ? (dueCount > 0 ? dueCount : undefined) : undefined
                return (
                  <NavItem
                    key={item.view}
                    collapsed={collapsed}
                    icon={<Icon className="w-4 h-4" />}
                    label={item.label}
                    active={isActive}
                    onClick={() => onViewChange?.(item.view)}
                    badge={badgeCount}
                    badgeLabel={item.badgeLabel}
                  />
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* ── Stats strip ── */}
      {!collapsed && (
        <div className="flex gap-2 mx-3 mt-4 mb-1 animate-fade-in shrink-0">
          <div className="flex-1 p-2.5 text-center">
            <div className="text-base font-bold font-mono text-ink-primary">{totalCards}</div>
            <div className="text-[10px] text-ink-secondary uppercase tracking-wider">Cards</div>
          </div>
          <div className={cn(
            'flex-1 p-2.5 text-center',
            dueCount > 0 && 'bg-neon-review/5',
          )}>
            <div className={cn(
              'text-base font-bold font-mono',
              dueCount > 0 ? 'text-neon-review' : 'text-ink-primary',
            )}>
              {dueCount}
            </div>
            <div className="text-[10px] text-ink-secondary uppercase tracking-wider">Due</div>
          </div>
        </div>
      )}

      {/* ── Quick filters ── */}
      {!collapsed ? (
        <div className="px-3 pt-3 pb-1 space-y-0.5 shrink-0">
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
        </div>
      ) : (
        <div className="px-2 pt-2 pb-1 space-y-1 shrink-0">
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
              dueCount > 0 ? "text-neon-review hover:bg-neon-review/8" : "text-ink-tertiary hover:text-ink-secondary hover:bg-elevated/60"
            )}
          >
            <Clock className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── Spacer ── */}
      <div className="my-2 shrink-0" />

      {/* ── SUBJECTS section header ── */}
      {!collapsed && (
        <div className="px-5 pb-1 shrink-0">
          <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-ink-tertiary font-mono">Subjects</span>
        </div>
      )}

      {/* ── Discipline Tabs (MBBS / BDS) ── */}
      {!collapsed ? (
        <div className="px-3 pb-2 shrink-0">
          <div className="flex gap-1 p-0.5">
            {DISCIPLINES.map(d => (
              <button
                key={d.id}
                onClick={() => handleDisciplineChange(d.id)}
                className={cn(
                  'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all duration-300 ease-out min-h-[44px]',
                  discipline === d.id
                    ? 'bg-elevated text-ink-primary shadow-sm'
                    : 'text-ink-tertiary hover:text-ink-secondary hover:bg-elevated/30'
                )}
              >
                <span className="text-xs">{d.icon}</span>
                <span>{d.label}</span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="px-2 pb-2 flex justify-center shrink-0">
          <button
            onClick={() => handleDisciplineChange(discipline === 'mbbs' ? 'bds' : 'mbbs')}
            title={`Switch to ${discipline === 'mbbs' ? 'BDS' : 'MBBS'}`}
            className="p-1.5 rounded-lg text-ink-tertiary hover:text-ink-secondary hover:bg-elevated/60 transition-colors"
          >
            <GraduationCap className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── Subject list ── */}
      <div className={cn('flex-1 min-h-0 overflow-y-auto overscroll-contain px-3 space-y-0.5 scrollbar-thin', collapsed && 'px-2')}>
        {!collapsed && (
          <div className="text-[10px] text-ink-secondary uppercase tracking-widest px-2 mb-2 font-mono flex items-center gap-1.5">
            <span>{discipline === 'mbbs' ? '🩺' : '🦷'}</span>
            <span>{discipline.toUpperCase()} Subjects</span>
          </div>
        )}
        {filteredSubjects.map((subject, i) => {
          const isActive = activeSubject === subject.id && view === 'workspace'
          return (
            <button
              key={subject.id}
              onClick={() => { onSubjectChange(subject.id); onViewChange?.('workspace') }}
              title={collapsed ? subject.label : undefined}
              style={{
                ...(i < 10 ? { animationDelay: `${i * 40}ms` } : {}),
              }}
              className={cn(
                'relative w-full flex items-center gap-2.5 px-2.5 py-2.5 rounded-xl text-left transition-all duration-200 group animate-slide-right min-h-[44px]',
                isActive
                  ? 'bg-elevated/60'
                  : 'hover:bg-elevated/30 hover:translate-x-[2px]',
                collapsed && 'justify-center px-0',
              )}
            >
              {/* Active accent bar — borderless left indicator */}
              {isActive && (
                <span
                  className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-[3px] rounded-full"
                  style={{ backgroundColor: subject.accent }}
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
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ backgroundColor: subject.accent }}
                    />
                  )}
                </>
              )}
            </button>
          )
        })}
      </div>

      {/* ── Bottom actions ── */}
      <div className={cn('p-3 space-y-1 shrink-0', collapsed && 'px-2')}>
        <button
          onClick={onExport}
          title={collapsed ? 'Export Anki CSV' : undefined}
          className={cn(
            'w-full flex items-center gap-2 px-2.5 py-2.5 rounded-xl text-xs font-medium',
            'text-ink-tertiary hover:text-neon-pharma hover:bg-neon-pharma/8',
            'transition-all duration-150 active:scale-[0.98]',
            collapsed && 'justify-center',
          )}
        >
          <Download className="w-3.5 h-3.5 shrink-0" />
          {!collapsed && 'Anki Export'}
        </button>
        <button
          onClick={() => onOpenSettings?.()}
          title={collapsed ? 'Settings' : undefined}
          className={cn(
            'w-full flex items-center gap-2 px-2.5 py-2.5 rounded-xl text-xs font-medium',
            'text-ink-tertiary hover:text-ink-secondary hover:bg-elevated/40',
            'transition-all duration-150 active:scale-[0.98]',
            collapsed && 'justify-center',
          )}
        >
          <Settings className="w-3.5 h-3.5 shrink-0" />
          {!collapsed && 'Settings'}
        </button>
      </div>
    </aside>
  )
}

// ── Nav item with subtle emerald tint active state ──────────────────────────
function NavItem({
  collapsed, icon, label, active, onClick, disabled = false, badge, badgeLabel,
}: {
  collapsed:    boolean
  icon:         React.ReactNode
  label:        string
  active:       boolean
  onClick:      () => void
  disabled?:    boolean
  badge?:       number
  badgeLabel?:  string
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={disabled ? `${label} — Coming Soon` : collapsed ? label : undefined}
      className={cn(
        'relative w-full flex items-center gap-2.5 px-2.5 py-2.5 rounded-lg text-left transition-all duration-200 min-h-[44px]',
        disabled
          ? 'text-ink-tertiary/40 cursor-not-allowed'
          : active
            ? 'text-neon-green font-semibold bg-neon-green/[0.05] shadow-[0_0_12px_rgba(13,242,125,0.06)]'
            : 'text-ink-secondary hover:text-ink-primary hover:bg-elevated/30 hover:shadow-[0_0_8px_rgba(13,242,125,0.03)]',
        collapsed && 'justify-center px-0',
      )}
    >
      {/* Active left accent bar with glow */}
      {!disabled && active && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[2px] rounded-full bg-neon-green" />
      )}
      <span className="shrink-0">{icon}</span>
      {!collapsed && (
        <span className="text-xs font-semibold flex items-center gap-1.5 flex-1 min-w-0">
          <span className="truncate">{label}</span>
          {badge !== undefined && badge > 0 && (
            <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full font-mono bg-neon-review/10 text-neon-review shrink-0">
              {badge}
            </span>
          )}
          {badgeLabel && (
            <span className="text-[9px] font-mono text-ink-tertiary uppercase tracking-wider shrink-0">{badgeLabel}</span>
          )}
          {disabled && (
            <span className="text-[9px] font-mono text-ink-tertiary/60 uppercase tracking-wider">Soon</span>
          )}
        </span>
      )}
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
      className="w-full flex items-center gap-2.5 px-2.5 py-2.5 rounded-xl text-left hover:bg-elevated/50 hover:translate-x-[2px] transition-all duration-200 group active:scale-[0.98] min-h-[44px]"
    >
      <span className="text-ink-secondary group-hover:text-ink-primary transition-colors">{icon}</span>
      <span className="flex-1 text-xs text-ink-secondary group-hover:text-ink-primary transition-colors">
        {label}
      </span>
      {badge !== undefined && badge > 0 && (
        <span className={cn(
          'text-[9px] font-bold px-1.5 py-0.5 rounded-full font-mono',
          badgeVariant === 'review'
            ? 'bg-neon-review/10 text-neon-review'
            : 'bg-subtle text-ink-tertiary',
        )}>
          {badge}
        </span>
      )}
    </button>
  )
}
