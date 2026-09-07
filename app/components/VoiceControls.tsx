'use client'

// ─────────────────────────────────────────────────────────────────────────────
// app/components/VoiceControls.tsx  —  Phase 4: Reusable voice UI
// TTS inline controls (play/pause/replay/stop + waveform indicator)
// STT recording button with waveform animation and live transcript
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useCallback } from 'react'
import {
  Play, Pause, RotateCcw, Square, Mic, MicOff, Volume2,
} from 'lucide-react'
import { cn } from '../lib/utils'

// ── TTS Inline Controls ──────────────────────────────────────────────────────
interface TTSControlsProps {
  text: string
  isSpeaking: boolean
  onSpeak: (text: string) => void
  onPause: () => void
  onResume: () => void
  onStop: () => void
  ttsSupported: boolean
}

export function TTSControls({
  text, isSpeaking, onSpeak, onPause, onResume, onStop, ttsSupported,
}: TTSControlsProps) {
  const [hasPlayed, setHasPlayed] = useState(false)

  const handlePlay = useCallback(() => {
    onSpeak(text)
    setHasPlayed(true)
  }, [text, onSpeak])

  const handleReplay = useCallback(() => {
    onStop()
    setTimeout(() => {
      onSpeak(text)
      setHasPlayed(true)
    }, 100)
  }, [text, onSpeak, onStop])

  if (!ttsSupported) return null

  return (
    <div className="flex items-center gap-1 mt-1.5">
      {/* Speaking waveform indicator */}
      {isSpeaking && (
        <div className="flex items-center gap-0.5 mr-1">
          {[0, 1, 2, 3, 4].map(i => (
            <span
              key={i}
              className="w-[2px] bg-neon-green rounded-full animate-pulse"
              style={{
                height: `${8 + Math.sin(i * 1.2) * 6}px`,
                animationDelay: `${i * 120}ms`,
                animationDuration: '0.6s',
              }}
            />
          ))}
          <span className="text-[8px] font-mono text-neon-green/70 ml-1">speaking</span>
        </div>
      )}

      {/* Play / Pause */}
      {!isSpeaking ? (
        <button
          onClick={handlePlay}
          title="Play aloud"
          className="p-1.5 rounded-md text-ink-tertiary hover:text-ink-secondary hover:bg-elevated/60 transition-colors min-w-[32px] min-h-[32px] flex items-center justify-center"
        >
          <Play className="w-3 h-3" />
        </button>
      ) : (
        <button
          onClick={onPause}
          title="Pause"
          className="p-1.5 rounded-md text-neon-green hover:bg-neon-green/10 transition-colors min-w-[32px] min-h-[32px] flex items-center justify-center"
        >
          <Pause className="w-3 h-3" />
        </button>
      )}

      {/* Resume (only if paused — we approximate: hasPlayed && not speaking) */}
      {hasPlayed && !isSpeaking && (
        <button
          onClick={onResume}
          title="Resume"
          className="p-1.5 rounded-md text-ink-tertiary hover:text-ink-secondary hover:bg-elevated/60 transition-colors min-w-[32px] min-h-[32px] flex items-center justify-center"
        >
          <Volume2 className="w-3 h-3" />
        </button>
      )}

      {/* Replay */}
      {hasPlayed && (
        <button
          onClick={handleReplay}
          title="Replay"
          className="p-1.5 rounded-md text-ink-tertiary hover:text-ink-secondary hover:bg-elevated/60 transition-colors min-w-[32px] min-h-[32px] flex items-center justify-center"
        >
          <RotateCcw className="w-3 h-3" />
        </button>
      )}

      {/* Stop */}
      {isSpeaking && (
        <button
          onClick={onStop}
          title="Stop"
          className="p-1.5 rounded-md text-ink-tertiary hover:text-neon-danger hover:bg-neon-danger/10 transition-colors min-w-[32px] min-h-[32px] flex items-center justify-center"
        >
          <Square className="w-3 h-3" />
        </button>
      )}
    </div>
  )
}

// ── STT Recording Button + Waveform ──────────────────────────────────────────
interface STTControlsProps {
  isListening: boolean
  onStart: () => void
  onStop: () => void
  transcript: string
  interimTranscript: string
  sttSupported: boolean
  sttError: string | null
  disabled?: boolean
}

export function STTControls({
  isListening, onStart, onStop, transcript, interimTranscript,
  sttSupported, sttError, disabled = false,
}: STTControlsProps) {
  if (!sttSupported) {
    return (
      <div className="flex items-center gap-2 text-[10px] text-ink-tertiary font-mono">
        <MicOff className="w-3.5 h-3.5" />
        <span>Voice not supported — type below</span>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {/* Transcript display */}
      {(transcript || interimTranscript) && (
        <div className="bg-void/40 rounded-lg px-3 py-2 text-sm text-ink-primary min-h-[36px]">
          {transcript && <span>{transcript}</span>}
          {interimTranscript && (
            <span className="text-ink-tertiary italic ml-1">{interimTranscript}</span>
          )}
        </div>
      )}

      <div className="flex items-center gap-3">
        {/* Record button */}
        <button
          onClick={isListening ? onStop : onStart}
          disabled={disabled}
          className={cn(
            'relative flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-xs font-bold transition-all min-h-[48px] min-w-[48px]',
            isListening
              ? 'bg-neon-danger text-white shadow-[0_0_20px_rgba(255,77,77,0.4)]'
              : 'bg-neon-green text-void hover:brightness-110 active:scale-[0.98]',
            disabled && 'opacity-30 pointer-events-none',
          )}
        >
          {/* Recording pulse ring */}
          {isListening && (
            <span className="absolute inset-0 rounded-xl animate-ping bg-neon-danger/30 pointer-events-none" />
          )}
          {isListening ? (
            <>
              <Mic className="w-4 h-4" />
              <span>Done Speaking</span>
            </>
          ) : (
            <>
              <Mic className="w-4 h-4" />
              <span>Speak Answer</span>
            </>
          )}
        </button>

        {/* Waveform bars when recording */}
        {isListening && (
          <div className="flex items-center gap-[3px]">
            {[0, 1, 2, 3, 4, 5, 6].map(i => (
              <span
                key={i}
                className="w-[3px] bg-neon-danger rounded-full animate-pulse"
                style={{
                  height: `${12 + Math.sin(i * 0.9) * 10}px`,
                  animationDelay: `${i * 80}ms`,
                  animationDuration: '0.5s',
                }}
              />
            ))}
            <span className="text-[9px] font-mono text-neon-danger ml-2 animate-pulse">REC</span>
          </div>
        )}
      </div>

      {/* STT Error */}
      {sttError && (
        <p className="text-[10px] text-neon-danger font-mono">{sttError}</p>
      )}
    </div>
  )
}
