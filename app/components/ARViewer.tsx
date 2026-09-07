'use client'

// ─────────────────────────────────────────────────────────────────────────────
// app/components/ARViewer.tsx  —  Exploratory AR entry point
// Device capability detection with CSS 3D transform fallback visualization.
// Does NOT claim full AR is implemented. Uses CSS transforms only — no heavy
// 3D libraries. Graceful degradation on unsupported browsers.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react'
import {
  Box, ArrowLeft, AlertTriangle, Smartphone, Monitor, RotateCcw,
} from 'lucide-react'
import { SubjectId } from '../types'
import { getSubject } from '../lib/subjects'
import { cn } from '../lib/utils'

interface ARViewerProps {
  subject: SubjectId
  onNavigateBack?: () => void
}

type ARStatus = 'checking' | 'supported' | 'unsupported'

export default function ARViewer({ subject, onNavigateBack }: ARViewerProps) {
  const [arStatus, setArStatus] = useState<ARStatus>('checking')
  const [rotation, setRotation] = useState({ x: -20, y: 30 })

  const subjectInfo = getSubject(subject)

  useEffect(() => {
    async function checkAR() {
      try {
        if ('xr' in navigator) {
          const xr = (navigator as any).xr
          if (xr && typeof xr.isSessionSupported === 'function') {
            const supported = await xr.isSessionSupported('immersive-ar')
            setArStatus(supported ? 'supported' : 'unsupported')
            return
          }
        }
        setArStatus('unsupported')
      } catch {
        setArStatus('unsupported')
      }
    }
    checkAR()
  }, [])

  // Auto-rotate the 3D preview
  useEffect(() => {
    const interval = setInterval(() => {
      setRotation(prev => ({ ...prev, y: prev.y + 0.5 }))
    }, 50)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="view-container">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 animate-fade-up">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button onClick={onNavigateBack} className="p-2.5 rounded-lg hover:bg-elevated/60 text-ink-tertiary hover:text-ink-secondary transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-neon-cyan/10 flex items-center justify-center">
              <Box className="w-5 h-5 text-neon-cyan" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold font-display text-ink-primary">AR Visualize</h1>
                <span className="text-[8px] font-mono px-2 py-0.5 rounded-full bg-ai/10 text-ai font-bold uppercase tracking-wider">
                  Experimental
                </span>
              </div>
              <p className="text-[10px] text-ink-tertiary">Spatial anatomy visualization</p>
            </div>
          </div>
        </div>

        {/* 3D CSS Transform Preview */}
        <div className="bg-card rounded-xl shadow-card p-6 sm:p-8">
          <div className="flex items-center justify-center" style={{ perspective: '800px', minHeight: '280px' }}>
            <div
              className="relative w-48 h-48 transition-transform duration-100"
              style={{
                transformStyle: 'preserve-3d',
                transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)`,
              }}
            >
              {/* Front face */}
              <div
                className="absolute inset-0 rounded-xl bg-neon-anatomy/8 backdrop-blur-sm flex flex-col items-center justify-center p-4"
                style={{ transform: 'translateZ(40px)' }}
              >
                <span className="text-3xl mb-2">{subjectInfo.icon}</span>
                <span className="text-xs font-bold text-ink-primary text-center">{subjectInfo.label}</span>
                <span className="text-[9px] text-ink-tertiary mt-1 text-center">Anterior</span>
              </div>
              {/* Back face */}
              <div
                className="absolute inset-0 rounded-xl bg-neon-biochem/8 backdrop-blur-sm flex flex-col items-center justify-center p-4"
                style={{ transform: 'rotateY(180deg) translateZ(40px)' }}
              >
                <span className="text-3xl mb-2">{subjectInfo.icon}</span>
                <span className="text-xs font-bold text-ink-primary text-center">{subjectInfo.label}</span>
                <span className="text-[9px] text-ink-tertiary mt-1 text-center">Posterior</span>
              </div>
              {/* Top face */}
              <div
                className="absolute inset-0 rounded-xl bg-neon-physio/5 backdrop-blur-sm flex items-center justify-center"
                style={{ transform: 'rotateX(90deg) translateZ(40px)' }}
              >
                <span className="text-[9px] text-ink-tertiary">Superior</span>
              </div>
              {/* Bottom face */}
              <div
                className="absolute inset-0 rounded-xl bg-neon-patho/5 backdrop-blur-sm flex items-center justify-center"
                style={{ transform: 'rotateX(-90deg) translateZ(40px)' }}
              >
                <span className="text-[9px] text-ink-tertiary">Inferior</span>
              </div>
            </div>
          </div>

          <p className="text-[10px] text-ink-tertiary text-center mt-3 font-mono">
            CSS 3D preview — {subjectInfo.label}
          </p>
        </div>

        {/* Device Status */}
        <div className={cn(
          'bg-card rounded-xl shadow-card p-5 space-y-3',
          arStatus === 'supported' && 'bg-neon-green/5',
        )}>
          <div className="flex items-start gap-3">
            {arStatus === 'checking' && (
              <>
                <div className="w-8 h-8 rounded-lg bg-elevated/60 flex items-center justify-center shrink-0">
                  <div className="w-4 h-4 rounded-full border-2 border-neon-green border-t-transparent animate-spin" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-ink-primary">Checking device capabilities...</p>
                  <p className="text-[10px] text-ink-tertiary mt-0.5">Detecting WebXR AR support</p>
                </div>
              </>
            )}
            {arStatus === 'unsupported' && (
              <>
                <div className="w-8 h-8 rounded-lg bg-neon-review/10 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-4 h-4 text-neon-review" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-ink-primary">AR not available on this device</p>
                  <p className="text-[10px] text-ink-tertiary mt-0.5 leading-relaxed">
                    AR visualization requires a compatible device and browser. Try Chrome on Android or Safari on iOS with WebXR support.
                    The 3D CSS preview above provides a basic spatial view.
                  </p>
                  <div className="flex items-center gap-3 mt-2 text-[9px] text-ink-muted font-mono">
                    <span className="flex items-center gap-1"><Monitor className="w-3 h-3" /> Desktop: CSS preview only</span>
                    <span className="flex items-center gap-1"><Smartphone className="w-3 h-3" /> Mobile: AR when supported</span>
                  </div>
                </div>
              </>
            )}
            {arStatus === 'supported' && (
              <>
                <div className="w-8 h-8 rounded-lg bg-neon-green/10 flex items-center justify-center shrink-0">
                  <Smartphone className="w-4 h-4 text-neon-green" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-neon-green">WebXR AR detected</p>
                  <p className="text-[10px] text-ink-tertiary mt-0.5 leading-relaxed">
                    Your device supports AR visualization. Full AR mode is planned for a future update. For now, enjoy the interactive 3D preview above.
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Info */}
        <div className="bg-card rounded-xl shadow-card p-5 space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-widest font-mono text-ink-secondary">About this feature</p>
          <p className="text-[11px] text-ink-tertiary leading-relaxed">
            AR Visualize is an exploratory feature that will eventually allow you to explore anatomical structures,
            pathology models, and dental anatomy in augmented reality. The current implementation provides a CSS 3D
            preview as a fallback. Full WebXR AR support will be added when browser compatibility improves.
          </p>
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={() => setRotation({ x: -20, y: 30 })}
              className="btn-ghost text-[10px]"
            >
              <RotateCcw className="w-3 h-3" /> Reset View
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
