// ─────────────────────────────────────────────────────────────────────────────
// app/lib/useVoice.ts  —  Phase 4: Browser-native TTS + STT hook
// Uses window.speechSynthesis for TTS and SpeechRecognition for STT.
// Graceful fallback to typing when unsupported.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback, useRef } from 'react'
import { preprocessForSpeech } from './medical-pronunciation'

// ── Web Speech API type declarations (not in all TS lib targets) ──
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList
  resultIndex: number
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string
  message: string
}

interface SpeechRecognitionResultList {
  length: number
  item(index: number): SpeechRecognitionResult
  [index: number]: SpeechRecognitionResult
}

interface SpeechRecognitionResult {
  isFinal: boolean
  length: number
  item(index: number): SpeechRecognitionAlternative
  [index: number]: SpeechRecognitionAlternative
}

interface SpeechRecognitionAlternative {
  transcript: string
  confidence: number
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  start(): void
  stop(): void
  abort(): void
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null
  onend: (() => void) | null
  onstart: (() => void) | null
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionInstance
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance
  }
}

// ── Detect browser support ──
const getSpeechRecognitionCtor = (): (new () => SpeechRecognitionInstance) | null => {
  if (typeof window === 'undefined') return null
  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null
}

const isTTSSupported = (): boolean => {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

// ── Hook ──
export interface UseVoiceReturn {
  // TTS
  ttsSupported: boolean
  isSpeaking: boolean
  speak: (text: string) => void
  pauseSpeech: () => void
  resumeSpeech: () => void
  stopSpeech: () => void

  // STT
  sttSupported: boolean
  isListening: boolean
  transcript: string
  interimTranscript: string
  startListening: () => void
  stopListening: () => void
  clearTranscript: () => void
  sttError: string | null
}

export function useVoice(): UseVoiceReturn {
  // ── TTS state ──
  const [ttsSupported] = useState(isTTSSupported)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)

  // Pick a good voice on mount
  const preferredVoiceRef = useRef<SpeechSynthesisVoice | null>(null)

  useEffect(() => {
    if (!ttsSupported) return

    const pickVoice = () => {
      const voices = window.speechSynthesis.getVoices()
      // Prefer English voices; prefer female-sounding ones for examiner feel
      const english = voices.filter(v => v.lang.startsWith('en'))
      const preferred = english.find(v =>
        /female|samantha|karen|victoria|fiona|moira|tessa/i.test(v.name)
      ) ?? english.find(v => v.lang === 'en-GB') ?? english[0] ?? null
      preferredVoiceRef.current = preferred
    }

    // Voices may load asynchronously
    pickVoice()
    window.speechSynthesis.onvoiceschanged = pickVoice

    return () => {
      window.speechSynthesis.onvoiceschanged = null
      window.speechSynthesis.cancel()
    }
  }, [ttsSupported])

  const speak = useCallback((text: string) => {
    if (!ttsSupported) return
    window.speechSynthesis.cancel() // stop any ongoing speech

    // Preprocess text: expand abbreviations, add natural pauses
    const processed = preprocessForSpeech(text)

    const utterance = new SpeechSynthesisUtterance(processed)
    if (preferredVoiceRef.current) utterance.voice = preferredVoiceRef.current
    utterance.rate = 0.92
    utterance.pitch = 1.0
    utterance.volume = 1.0

    utterance.onstart = () => setIsSpeaking(true)
    utterance.onend = () => setIsSpeaking(false)
    utterance.onerror = () => setIsSpeaking(false)

    utteranceRef.current = utterance
    window.speechSynthesis.speak(utterance)
  }, [ttsSupported])

  const pauseSpeech = useCallback(() => {
    if (ttsSupported) window.speechSynthesis.pause()
  }, [ttsSupported])

  const resumeSpeech = useCallback(() => {
    if (ttsSupported) window.speechSynthesis.resume()
  }, [ttsSupported])

  const stopSpeech = useCallback(() => {
    if (ttsSupported) {
      window.speechSynthesis.cancel()
      setIsSpeaking(false)
    }
  }, [ttsSupported])

  // ── STT state ──
  const [sttSupported] = useState(() => getSpeechRecognitionCtor() !== null)
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [interimTranscript, setInterimTranscript] = useState('')
  const [sttError, setSttError] = useState<string | null>(null)
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null)

  const startListening = useCallback(() => {
    const Ctor = getSpeechRecognitionCtor()
    if (!Ctor) {
      setSttError('Speech recognition is not supported in this browser.')
      return
    }

    // Stop any previous instance
    if (recognitionRef.current) {
      try { recognitionRef.current.abort() } catch { /* ignore */ }
    }

    setSttError(null)
    setTranscript('')
    setInterimTranscript('')

    const recognition = new Ctor()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'

    recognition.onstart = () => setIsListening(true)

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalText = ''
      let interimText = ''

      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i]
        if (result.isFinal) {
          finalText += result[0].transcript + ' '
        } else {
          interimText += result[0].transcript
        }
      }

      if (finalText.trim()) setTranscript(finalText.trim())
      setInterimTranscript(interimText)
    }

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === 'not-allowed') {
        setSttError('Microphone permission denied. Please allow microphone access.')
      } else if (event.error === 'no-speech') {
        // Not a real error — just silence
      } else if (event.error === 'aborted') {
        // User aborted — ignore
      } else {
        setSttError(`Speech recognition error: ${event.error}`)
      }
      setIsListening(false)
    }

    recognition.onend = () => {
      setIsListening(false)
    }

    recognitionRef.current = recognition
    try {
      recognition.start()
    } catch {
      setSttError('Failed to start speech recognition.')
    }
  }, [])

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop() } catch { /* ignore */ }
    }
    setIsListening(false)
  }, [])

  const clearTranscript = useCallback(() => {
    setTranscript('')
    setInterimTranscript('')
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.abort() } catch { /* ignore */ }
      }
      if (ttsSupported) window.speechSynthesis.cancel()
    }
  }, [ttsSupported])

  return {
    ttsSupported,
    isSpeaking,
    speak,
    pauseSpeech,
    resumeSpeech,
    stopSpeech,
    sttSupported,
    isListening,
    transcript,
    interimTranscript,
    startListening,
    stopListening,
    clearTranscript,
    sttError,
  }
}
