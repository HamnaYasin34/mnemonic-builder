'use client'

// ─────────────────────────────────────────────────────────────────────────────
// app/components/Logo.tsx
// Reusable MnemonicFlow logo component. Uses the provided logo image at
// /logo.png. Falls back to the Activity icon + text if the image fails.
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react'
import { Activity } from 'lucide-react'
import { cn } from '../lib/utils'

interface LogoProps {
  /** Show text label beside the icon */
  showText?: boolean
  /** Additional className for the wrapper */
  className?: string
  /** Size variant */
  size?: 'sm' | 'md' | 'lg'
}

const sizeMap = {
  sm: { icon: 'w-7 h-7', text: 'text-xs', gap: 'gap-2' },
  md: { icon: 'w-9 h-9', text: 'text-sm', gap: 'gap-3' },
  lg: { icon: 'w-12 h-12', text: 'text-lg', gap: 'gap-3' },
}

export default function Logo({ showText = true, className, size = 'md' }: LogoProps) {
  const [imgError, setImgError] = useState(false)
  const sizes = sizeMap[size]

  return (
    <div className={cn('flex items-center', sizes.gap, className)}>
      {/* Logo image or fallback icon */}
      <div className={cn('shrink-0 rounded-xl bg-neon-green/[0.07] flex items-center justify-center overflow-hidden', sizes.icon)}>
        {!imgError ? (
          <img
            src="/logo.png"
            alt="MnemonicFlow"
            className="w-full h-full object-contain"
            onError={() => setImgError(true)}
          />
        ) : (
          <Activity className={cn(
            'text-neon-green',
            size === 'sm' ? 'w-3.5 h-3.5' : size === 'lg' ? 'w-6 h-6' : 'w-4.5 h-4.5'
          )} strokeWidth={2} />
        )}
      </div>

      {/* Text label */}
      {showText && (
        <div className="min-w-0 animate-fade-in">
          <div className={cn(
            'font-bold tracking-wide text-ink-primary font-display truncate',
            sizes.text
          )}>
            MnemonicFlow
          </div>
        </div>
      )}
    </div>
  )
}
