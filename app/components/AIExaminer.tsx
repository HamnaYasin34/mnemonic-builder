'use client'

// ─────────────────────────────────────────────────────────────────────────────
// app/components/AIExaminer.tsx  —  Phase 4: AI Viva Examiner with Voice
// Chat-based viva voce with two-way voice interaction, 4-level difficulty,
// adaptive questioning, and comprehensive performance report.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useRef, useEffect, useCallback } from 'react'
import {
  Stethoscope, ArrowLeft, Send, Loader2, Trophy, RotateCcw,
  ChevronDown, Search, GraduationCap, BookOpen, Target, Sparkles,
} from 'lucide-react'
import { Discipline, SubjectId, ChatMessage, Difficulty, VivaReport } from '../types'
import { analytics } from '../lib/analytics'
import { getSubjectsByDiscipline } from '../lib/subjects'
import { cn } from '../lib/utils'
import { useVoice } from '../lib/useVoice'
import { TTSControls, STTControls } from './VoiceControls'

interface AIExaminerProps {
  discipline: Discipline
  onNavigateBack?: () => void
  onQuizFromSource?: (topic: string, subject: SubjectId) => void
  onGenerateMnemonic?: (topic: string) => void
  onReviewGuide?: (topic: string) => void
  currentTopic?: string | null
}

const DIFFICULTY_OPTIONS: { value: Difficulty; label: string; desc: string; color: string }[] = [
  { value: 'Easy', label: 'Easy', desc: 'Fundamentals', color: 'text-neon-green bg-neon-green/10' },
  { value: 'Medium', label: 'Medium', desc: 'Standard Viva', color: 'text-neon-physio bg-neon-physio/10' },
  { value: 'Hard', label: 'Hard', desc: 'Detailed & Probing', color: 'text-neon-patho bg-neon-patho/10' },
  { value: 'clinical-reasoning', label: 'USMLE', desc: 'Clinical Reasoning', color: 'text-neon-micro bg-neon-micro/10' },
]

function uid(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

export default function AIExaminer({ discipline, onNavigateBack, onQuizFromSource, onGenerateMnemonic, onReviewGuide, currentTopic }: AIExaminerProps) {
  const { ttsSupported, isSpeaking, speak, pauseSpeech, resumeSpeech, stopSpeech,
          sttSupported, isListening, transcript, interimTranscript, startListening, stopListening, clearTranscript, sttError } = useVoice()

  // Setup state
  const [topic, setTopic] = useState('')

  // Pre-fill topic from cross-view context
  useEffect(() => { if (currentTopic) setTopic(currentTopic) }, [currentTopic])
  const [subjectFilter, setSubjectFilter] = useState<SubjectId | 'all'>('all')
  const [difficulty, setDifficulty] = useState<Difficulty>('Medium')
  const [isSetup, setIsSetup] = useState(false)

  // Session state
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [questionCount, setQuestionCount] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)
  const [currentDifficulty, setCurrentDifficulty] = useState<Difficulty>('Medium')
  const [sessionEnded, setSessionEnded] = useState(false)
  const [sessionReport, setSessionReport] = useState<VivaReport | null>(null)
  const [error, setError] = useState('')
  const [inputMode, setInputMode] = useState<'voice' | 'text'>('voice')

  // Phase 5: analytics on session end
  useEffect(() => {
    if (sessionEnded && topic) {
      analytics.log('viva_completed', topic, undefined, {
        correctCount,
        difficulty: currentDifficulty,
        hasReport: !!sessionReport,
      })
    }
  }, [sessionEnded]) // eslint-disable-line react-hooks/exhaustive-deps

  const chatEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const subjects = getSubjectsByDiscipline(discipline)

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Auto-speak new examiner messages
  useEffect(() => {
    if (!ttsSupported || messages.length === 0) return
    const lastMsg = messages[messages.length - 1]
    if (lastMsg.role === 'examiner' && !lastMsg.isSpoken && !sessionEnded) {
      speak(lastMsg.content)
      setMessages(prev => prev.map((m, i) => i === prev.length - 1 ? { ...m, isSpoken: true } : m))
    }
  }, [messages, ttsSupported, sessionEnded, speak])

  // Send message to examiner API
  const sendToExaminer = useCallback(async (studentAnswer?: string) => {
    setIsLoading(true)
    setError('')
    const subject = subjectFilter !== 'all' ? subjectFilter : 'medicine'

    const history = messages.slice(-20).map(m => ({ role: m.role, content: m.content }))

    try {
      const res = await fetch('/api/examiner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topic.trim(),
          subject,
          history,
          studentAnswer: studentAnswer || undefined,
          difficulty: currentDifficulty,
          questionNumber: questionCount,
        }),
      })
      const data = await res.json()
      if (!data.success) {
        setError('The examiner is unavailable. Please try again.')
        return
      }

      const examinerMsg: ChatMessage = {
        id: uid(),
        role: 'examiner',
        content: data.data.response,
        timestamp: new Date().toISOString(),
        evaluation: data.data.evaluation,
        difficulty: data.data.nextDifficulty,
      }

      if (studentAnswer && data.data.evaluation) {
        setQuestionCount(q => q + 1)
        if (data.data.evaluation === 'correct') setCorrectCount(c => c + 1)
      }
      if (data.data.nextDifficulty) {
        setCurrentDifficulty(data.data.nextDifficulty as Difficulty)
      }

      // Check for session report (final question)
      if (data.data.sessionReport) {
        setSessionReport(data.data.sessionReport)
        setMessages(prev => [...prev, examinerMsg])
        setSessionEnded(true)
        return
      }

      if (data.data.questionNumber && data.data.questionNumber >= 10) {
        setMessages(prev => [...prev, examinerMsg])
        setSessionEnded(true)
        return
      }

      setMessages(prev => [...prev, examinerMsg])
    } catch {
      setError('Could not connect. Please check your connection and try again.')
    } finally {
      setIsLoading(false)
    }
  }, [topic, subjectFilter, messages, currentDifficulty, questionCount])

  // Start session
  const startSession = useCallback(async () => {
    if (!topic.trim()) return
    setIsSetup(true)
    setCurrentDifficulty(difficulty)
    const systemMsg: ChatMessage = {
      id: uid(),
      role: 'system',
      content: `Viva session: ${topic.trim()} — ${subjectFilter !== 'all' ? subjectFilter : 'medicine'} (${difficulty})`,
      timestamp: new Date().toISOString(),
    }
    setMessages([systemMsg])
    setIsLoading(true)
    setError('')
    const subject = subjectFilter !== 'all' ? subjectFilter : 'medicine'
    try {
      const res = await fetch('/api/examiner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: topic.trim(), subject, history: [], difficulty, questionNumber: 0 }),
      })
      const data = await res.json()
      if (!data.success) {
        setError('Could not start the session. Please try again.')
        setIsLoading(false)
        return
      }
      const examinerMsg: ChatMessage = {
        id: uid(), role: 'examiner', content: data.data.response,
        timestamp: new Date().toISOString(), difficulty: data.data.nextDifficulty,
      }
      setMessages([systemMsg, examinerMsg])
      if (data.data.nextDifficulty) setCurrentDifficulty(data.data.nextDifficulty as Difficulty)
    } catch {
      setError('Could not connect. Please check your connection and try again.')
    } finally {
      setIsLoading(false)
    }
  }, [topic, subjectFilter, difficulty])

  // Submit student answer
  const handleSubmit = useCallback(async (answerText?: string) => {
    const text = answerText || inputValue.trim()
    if (!text || isLoading || sessionEnded) return
    const studentMsg: ChatMessage = {
      id: uid(), role: 'student', content: text, timestamp: new Date().toISOString(),
    }
    setMessages(prev => [...prev, studentMsg])
    setInputValue('')
    clearTranscript()
    if (isListening) stopListening()
    await sendToExaminer(text)
  }, [inputValue, isLoading, sessionEnded, sendToExaminer, clearTranscript, isListening, stopListening])

  // Handle STT stop → auto-submit
  const handleSTTStop = useCallback(() => {
    stopListening()
    // Small delay to let final transcript settle
    setTimeout(() => {
      // We'll handle this via the transcript effect
    }, 300)
  }, [stopListening])

  // Auto-submit when STT stops and has transcript
  useEffect(() => {
    if (!isListening && transcript && !isLoading && inputMode === 'voice') {
      // Only auto-submit if we actually have a meaningful transcript
      const trimmed = transcript.trim()
      if (trimmed && trimmed.length > 2) {
        setInputValue(trimmed)
      }
    }
  }, [isListening, transcript, isLoading, inputMode])

  // End session early
  const endSession = useCallback(() => {
    setSessionEnded(true)
    stopSpeech()
    const endMsg: ChatMessage = {
      id: uid(), role: 'system', content: 'Session ended by student.', timestamp: new Date().toISOString(),
    }
    setMessages(prev => [...prev, endMsg])
  }, [stopSpeech])

  // Reset session
  const resetSession = useCallback(() => {
    setIsSetup(false)
    setMessages([])
    setInputValue('')
    setCurrentDifficulty(difficulty)
    setQuestionCount(0)
    setCorrectCount(0)
    setSessionEnded(false)
    setSessionReport(null)
    setError('')
    setTopic('')
    stopSpeech()
    if (isListening) stopListening()
    clearTranscript()
  }, [difficulty, stopSpeech, isListening, stopListening, clearTranscript])

  // ── SETUP VIEW ──
  if (!isSetup) {
    return (
      <div className="view-container">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 animate-fade-up">
          {/* Header */}
          <div className="flex items-center gap-3">
            <button onClick={onNavigateBack} className="p-2.5 rounded-lg hover:bg-elevated/60 text-ink-tertiary hover:text-ink-secondary transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-neon-anatomy/10 flex items-center justify-center">
                <Stethoscope className="w-5 h-5 text-neon-anatomy" />
              </div>
              <div>
                <h1 className="text-lg font-bold font-display text-ink-primary">AI Examiner</h1>
                <p className="text-[10px] text-ink-tertiary">Viva voce with voice — AI conducts the exam, you speak or type answers</p>
              </div>
            </div>
          </div>

          {/* Setup Card */}
          <div className="bg-card rounded-xl shadow-card p-5 space-y-4">
            {/* Subject */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest font-mono text-ink-tertiary flex items-center gap-1.5">
                <GraduationCap className="w-3 h-3" /> Subject
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-tertiary pointer-events-none" />
                <select
                  value={subjectFilter}
                  onChange={e => setSubjectFilter(e.target.value as SubjectId | 'all')}
                  className="w-full bg-surface rounded-xl pl-9 pr-4 py-3 text-sm text-ink-primary focus:outline-none focus:ring-2 focus:ring-neon-green/15 appearance-none cursor-pointer min-h-[44px]"
                >
                  <option value="all">All Subjects</option>
                  {subjects.map(s => (
                    <option key={s.id} value={s.id}>{s.icon} {s.label}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-tertiary pointer-events-none" />
              </div>
            </div>

            {/* Topic */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest font-mono text-ink-tertiary">Topic</label>
              <input
                type="text"
                value={topic}
                onChange={e => setTopic(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && startSession()}
                placeholder="e.g. Diabetes Mellitus, Brachial Plexus, Heart Failure..."
                className="w-full bg-surface rounded-xl px-4 py-3 text-sm text-ink-primary placeholder:text-ink-tertiary/50 focus:outline-none focus:ring-2 focus:ring-neon-green/15 transition-all min-h-[44px]"
              />
            </div>

            {/* Difficulty */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest font-mono text-ink-tertiary">Difficulty</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {DIFFICULTY_OPTIONS.filter(opt => discipline !== 'bds' || opt.value !== 'clinical-reasoning').map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setDifficulty(opt.value)}
                    className={cn(
                      'flex flex-col items-center gap-0.5 p-3 rounded-xl text-center transition-all min-h-[44px]',
                      difficulty === opt.value
                        ? opt.color + ' font-bold'
                        : 'bg-card/30 text-ink-tertiary hover:text-ink-secondary hover:bg-card/50'
                    )}
                  >
                    <span className="text-[11px] font-bold">{opt.label}</span>
                    <span className="text-[8px] opacity-70">{opt.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Start */}
            <button
              onClick={startSession}
              disabled={!topic.trim() || isLoading}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-xs font-bold bg-neon-anatomy text-void hover:brightness-110 active:scale-[0.98] disabled:opacity-30 disabled:pointer-events-none transition-all shadow-card-sm min-h-[48px]"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Stethoscope className="w-4 h-4" />}
              Start Viva Session
            </button>
          </div>

          {/* Info */}
          <div className="bg-card rounded-xl shadow-card p-4">
            <h3 className="text-[10px] font-bold uppercase tracking-widest font-mono text-ink-tertiary mb-2">How it works</h3>
            <ul className="space-y-1.5 text-[11px] text-ink-secondary leading-relaxed">
              <li>The AI acts as a <strong className="text-ink-primary">senior medical examiner</strong> and asks questions aloud</li>
              <li>Press <strong className="text-neon-green">Speak Answer</strong> to respond by voice, or type your answer</li>
              <li>The examiner evaluates your response and adapts difficulty</li>
              <li>Session ends after 10 questions with a detailed performance report</li>
              <li>Browser-native voice for natural speech interaction</li>
            </ul>
          </div>
        </div>
      </div>
    )
  }

  // ── SESSION / RESULTS VIEW ──
  return (
    <div className="h-full flex flex-col">
      {/* Session Header */}
      <div className="shrink-0 flex items-center justify-between px-4 sm:px-6 py-3 bg-card/20 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <button onClick={onNavigateBack} className="p-2.5 rounded-lg hover:bg-elevated/60 text-ink-tertiary hover:text-ink-secondary transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="w-8 h-8 rounded-lg bg-neon-anatomy/10 flex items-center justify-center">
            <Stethoscope className="w-4 h-4 text-neon-anatomy" />
          </div>
          <div className="min-w-0">
            <h2 className="text-xs font-bold text-ink-primary truncate">{topic}</h2>
            <div className="flex items-center gap-2 text-[9px] text-ink-tertiary">
              <span>Q{questionCount}</span>
              <span>·</span>
              <span className={cn(
                'font-bold',
                currentDifficulty === 'Easy' ? 'text-neon-green' :
                currentDifficulty === 'Hard' ? 'text-neon-danger' :
                currentDifficulty === 'clinical-reasoning' ? 'text-neon-micro' : 'text-neon-physio'
              )}>{currentDifficulty === 'clinical-reasoning' ? 'USMLE' : currentDifficulty}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-neon-green font-bold">{correctCount}/{questionCount}</span>
          {!sessionEnded && (
            <button onClick={endSession} className="text-[10px] px-3 py-2.5 rounded-lg bg-elevated/40 text-ink-tertiary hover:text-ink-secondary transition-all min-h-[44px] flex items-center">
              End
            </button>
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto scrollbar-none px-4 sm:px-6 py-4 space-y-4">
        {messages.map(msg => {
          if (msg.role === 'system') {
            return (
              <div key={msg.id} className="text-center">
                <span className="text-[9px] font-mono text-ink-tertiary/60 bg-card/30 px-3 py-1 rounded-full">{msg.content}</span>
              </div>
            )
          }
          const isExaminer = msg.role === 'examiner'
          return (
            <div key={msg.id} className={cn('flex', isExaminer ? 'justify-start' : 'justify-end')}>
              <div className={cn(
                'max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 space-y-1',
                isExaminer
                  ? 'bg-card/40 rounded-bl-md'
                  : 'bg-neon-green/10 rounded-br-md',
              )}>
                {/* Evaluation badge */}
                {msg.evaluation && (
                  <div className={cn(
                    'inline-flex items-center gap-1 text-[9px] font-mono font-bold px-2 py-0.5 rounded-full mb-1',
                    msg.evaluation === 'correct' && 'bg-neon-green/10 text-neon-green',
                    msg.evaluation === 'partial' && 'bg-neon-physio/10 text-neon-physio',
                    msg.evaluation === 'incorrect' && 'bg-neon-danger/10 text-neon-danger',
                  )}>
                    {msg.evaluation === 'correct' ? '✓ Correct' : msg.evaluation === 'partial' ? '~ Partial' : '✗ Incorrect'}
                  </div>
                )}
                <p className="text-sm text-ink-primary leading-relaxed whitespace-pre-line">{msg.content}</p>
                {/* TTS Controls on examiner messages */}
                {isExaminer && (
                  <TTSControls
                    text={msg.content}
                    isSpeaking={isSpeaking}
                    onSpeak={speak}
                    onPause={pauseSpeech}
                    onResume={resumeSpeech}
                    onStop={stopSpeech}
                    ttsSupported={ttsSupported}
                  />
                )}
              </div>
            </div>
          )
        })}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-card/40 rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-ink-tertiary/40 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-ink-tertiary/40 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-ink-tertiary/40 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span className="text-[10px] text-ink-tertiary font-mono">thinking...</span>
              </div>
            </div>
          </div>
        )}
        {error && (
          <div className="text-center">
            <span className="text-[11px] text-neon-danger bg-neon-danger/10 px-3 py-1.5 rounded-lg">{error}</span>
          </div>
        )}

        {/* Session Results */}
        {sessionEnded && (
          <div className="bg-card rounded-xl shadow-card p-6 space-y-5 animate-fade-up">
            <div className="text-center">
              <Trophy className="w-8 h-8 text-neon-physio mx-auto mb-2" />
              <h3 className="text-sm font-bold font-display text-ink-primary">Viva Performance Report</h3>
              <p className="text-[10px] text-ink-tertiary mt-1">{topic}</p>
            </div>

            {/* Score Grid */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-elevated rounded-xl p-3 text-center">
                <div className="text-lg font-bold font-mono text-ink-primary">{questionCount}</div>
                <div className="text-[9px] text-ink-tertiary uppercase tracking-wider">Questions</div>
              </div>
              <div className="bg-neon-green/10 rounded-xl p-3 text-center">
                <div className="text-lg font-bold font-mono text-neon-green">{correctCount}</div>
                <div className="text-[9px] text-ink-tertiary uppercase tracking-wider">Correct</div>
              </div>
              <div className="bg-elevated rounded-xl p-3 text-center">
                <div className="text-lg font-bold font-mono text-ink-primary">{questionCount > 0 ? Math.round((correctCount / questionCount) * 100) : 0}%</div>
                <div className="text-[9px] text-ink-tertiary uppercase tracking-wider">Score</div>
              </div>
            </div>

            {/* Detailed report from API */}
            {sessionReport && (
              <div className="space-y-3">
                {sessionReport.strongAreas.length > 0 && (
                  <div>
                    <h4 className="text-[9px] font-bold uppercase tracking-widest font-mono text-neon-green mb-1.5">Strong Areas</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {sessionReport.strongAreas.map((s, i) => (
                        <span key={i} className="text-[10px] px-2 py-1 rounded-lg bg-neon-green/10 text-neon-green">{s}</span>
                      ))}
                    </div>
                  </div>
                )}
                {sessionReport.weakAreas.length > 0 && (
                  <div>
                    <h4 className="text-[9px] font-bold uppercase tracking-widest font-mono text-neon-danger mb-1.5">Weak Areas</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {sessionReport.weakAreas.map((s, i) => (
                        <span key={i} className="text-[10px] px-2 py-1 rounded-lg bg-neon-danger/10 text-neon-danger">{s}</span>
                      ))}
                    </div>
                  </div>
                )}
                {sessionReport.misconceptions.length > 0 && (
                  <div>
                    <h4 className="text-[9px] font-bold uppercase tracking-widest font-mono text-neon-physio mb-1.5">Misconceptions</h4>
                    <ul className="space-y-1">
                      {sessionReport.misconceptions.map((m, i) => (
                        <li key={i} className="text-[11px] text-ink-secondary">• {m}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {sessionReport.suggestedRevision.length > 0 && (
                  <div>
                    <h4 className="text-[9px] font-bold uppercase tracking-widest font-mono text-ink-tertiary mb-1.5">Suggested Revision</h4>
                    <ul className="space-y-1">
                      {sessionReport.suggestedRevision.map((s, i) => (
                        <li key={i} className="text-[11px] text-ink-secondary">• {s}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Integration CTAs */}
            <div className="flex flex-col sm:flex-row gap-2">
              <button onClick={resetSession} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold bg-neon-anatomy text-void hover:brightness-110 active:scale-[0.98] transition-all min-h-[44px]">
                <RotateCcw className="w-4 h-4" /> New Session
              </button>
              {onQuizFromSource && (
                <button onClick={() => onQuizFromSource(topic, subjectFilter !== 'all' ? subjectFilter : 'medicine')} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold bg-neon-micro/10 text-neon-micro hover:bg-neon-micro/20 transition-all min-h-[44px]">
                  <Target className="w-4 h-4" /> Practice Quiz
                </button>
              )}
              {onGenerateMnemonic && (
                <button onClick={() => onGenerateMnemonic(topic)} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold bg-elevated/40 text-ink-secondary hover:text-ink-primary transition-all min-h-[44px]">
                  <Sparkles className="w-4 h-4" /> Mnemonic
                </button>
              )}
            </div>
            {onReviewGuide && (
              <button onClick={() => onReviewGuide(topic)} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-bold text-ink-tertiary hover:text-ink-secondary bg-elevated/40 transition-all min-h-[44px]">
                <BookOpen className="w-3.5 h-3.5" /> Review High-Yield Guide
              </button>
            )}
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input Area */}
      {!sessionEnded && (
        <div className="shrink-0 px-4 sm:px-6 py-3 bg-card/20 backdrop-blur-md space-y-2">
          <div className="max-w-3xl mx-auto">
            {/* Mode toggle */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex gap-1">
                <button
                  onClick={() => setInputMode('voice')}
                  className={cn(
                    'text-[9px] font-mono font-bold px-2.5 py-1 rounded-lg transition-all',
                    inputMode === 'voice' ? 'bg-neon-anatomy/10 text-neon-anatomy' : 'text-ink-tertiary hover:text-ink-secondary'
                  )}
                >
                  VOICE
                </button>
                <button
                  onClick={() => { setInputMode('text'); if (isListening) stopListening() }}
                  className={cn(
                    'text-[9px] font-mono font-bold px-2.5 py-1 rounded-lg transition-all',
                    inputMode === 'text' ? 'bg-neon-green/10 text-neon-green' : 'text-ink-tertiary hover:text-ink-secondary'
                  )}
                >
                  TYPE
                </button>
              </div>
              {isSpeaking && (
                <button onClick={stopSpeech} className="text-[9px] font-mono text-neon-danger hover:text-neon-danger/80 transition-colors">
                  Stop Speaking
                </button>
              )}
            </div>

            {/* Voice input */}
            {inputMode === 'voice' && (
              <div className="space-y-2">
                <STTControls
                  isListening={isListening}
                  onStart={startListening}
                  onStop={handleSTTStop}
                  transcript={transcript}
                  interimTranscript={interimTranscript}
                  sttSupported={sttSupported}
                  sttError={sttError}
                  disabled={isLoading}
                />
                {/* Submit after STT */}
                {(transcript || inputValue) && !isListening && (
                  <div className="flex gap-2">
                    <input
                      value={inputValue || transcript}
                      onChange={e => setInputValue(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                      placeholder="Edit transcript or type..."
                      className="flex-1 bg-surface rounded-xl px-4 py-2.5 text-sm text-ink-primary placeholder:text-ink-tertiary/50 focus:outline-none focus:ring-2 focus:ring-neon-green/15 transition-all min-h-[44px]"
                    />
                    <button
                      onClick={() => handleSubmit()}
                      disabled={!inputValue.trim() && !transcript.trim() || isLoading}
                      className="glow-btn shrink-0 px-4 h-11 rounded-xl bg-neon-green text-void disabled:opacity-30 disabled:pointer-events-none flex items-center gap-1.5 text-xs font-bold"
                    >
                      <Send className="w-3.5 h-3.5" /> Send
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Text input */}
            {inputMode === 'text' && (
              <div className="flex gap-2">
                <textarea
                  ref={inputRef}
                  value={inputValue}
                  onChange={e => setInputValue(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleSubmit()
                    }
                  }}
                  placeholder="Type your answer..."
                  rows={1}
                  disabled={isLoading}
                  className="flex-1 bg-surface rounded-xl px-4 py-3 text-sm text-ink-primary placeholder:text-ink-tertiary/50 focus:outline-none focus:ring-2 focus:ring-neon-green/15 transition-all resize-none min-h-[44px]"
                />
                <button
                  onClick={() => handleSubmit()}
                  disabled={!inputValue.trim() || isLoading}
                  className="glow-btn shrink-0 w-11 h-11 rounded-xl bg-neon-green text-void disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
