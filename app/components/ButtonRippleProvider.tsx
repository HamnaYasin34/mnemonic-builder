'use client'

// ─────────────────────────────────────────────────────────────────────────────
// app/components/ButtonRippleProvider.tsx
// Lightweight global listener that adds .has-ripple + pointer-position CSS
// custom properties to every <button> on pointerdown. This enables the
// universal CSS ::before ripple to originate from the actual click point.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect } from 'react'

export default function ButtonRippleProvider() {
  useEffect(() => {
    const handler = (e: PointerEvent) => {
      const target = e.target
      if (!(target instanceof HTMLElement)) return

      // Find the closest <button> (handles clicks on child elements too)
      const btn = target.closest('button:not(:disabled)') as HTMLElement | null
      if (!btn) return

      // Calculate click position relative to the button
      const rect = btn.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top

      // Set CSS custom properties for the ::before ripple position
      btn.style.setProperty('--ripple-x', `${x}px`)
      btn.style.setProperty('--ripple-y', `${y}px`)

      // Add the has-ripple class to enable the ::before pseudo-element
      btn.classList.add('has-ripple')
    }

    document.addEventListener('pointerdown', handler, { passive: true })
    return () => document.removeEventListener('pointerdown', handler)
  }, [])

  return null
}
