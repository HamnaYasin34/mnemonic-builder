import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Shared button styles so every button in the app feels snappy and consistent.
 * variant: 'primary' (green CTA) | 'secondary' (outline) | 'danger'
 */
export function buttonClass(variant: 'primary' | 'secondary' | 'danger' = 'secondary', extra = ''): string {
  const base = 'inline-flex items-center justify-center gap-1.5 transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100'
  const variants: Record<string, string> = {
    primary:   'bg-neon-green text-void font-bold hover:brightness-110',
    secondary: 'bg-elevated border border-border text-ink-secondary hover:text-ink-primary hover:border-subtle',
    danger:    'text-neon-danger hover:bg-neon-danger-dim',
  }
  return cn(base, variants[variant], extra)
}

export function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now  = new Date()
  const diffMs = date.getTime() - now.getTime()
  const diffHrs = Math.round(diffMs / (1000 * 60 * 60))
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))

  if (diffMs <= 0) return 'Due now'
  if (Math.abs(diffHrs) < 24) return `Due in ${diffHrs}h`
  return `Due in ${diffDays}d`
}

export function truncate(text: string, max: number): string {
  if (text.length <= max) return text
  return text.slice(0, max).trim() + '…'
}