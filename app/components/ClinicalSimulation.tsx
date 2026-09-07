'use client'

// ─────────────────────────────────────────────────────────────────────────────
// app/components/ClinicalSimulation.tsx  —  Phase 4: AI Clinical Simulation
// Case-based clinical encounter with two-way voice, examination/investigation
// modes, diagnosis phase, and comprehensive case debrief.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useRef, useEffect, useCallback } from 'react'
import {
  FlaskConical, ArrowLeft, Send, Loader2, Stethoscope, RotateCcw,
  ChevronDown, Search, GraduationCap, ClipboardList, Microscope,
  Activity, Syringe, Heart, Brain, Eye, Bone, BookOpen, Target, Sparkles,
} from 'lucide-react'
import { Discipline, SubjectId, ChatMessage, Difficulty, CaseDebrief } from '../types'
import { analytics } from '../lib/analytics'
import { getSubjectsByDiscipline } from '../lib/subjects'
import { cn } from '../lib/utils'
import { useVoice } from '../lib/useVoice'
import { TTSControls, STTControls } from './VoiceControls'

interface ClinicalSimulationProps {
  discipline: Discipline
  onNavigateBack?: () => void
  onQuizFromSource?: (topic: string, subject: SubjectId) => void
  onGenerateMnemonic?: (topic: string) => void
  onReviewGuide?: (topic: string) => void
  currentTopic?: string | null
}

const DIFFICULTY_OPTIONS: { value: Difficulty; label: string; desc: string; color: string }[] = [
  { value: 'Easy', label: 'Easy', desc: 'Classic Case', color: 'text-neon-green bg-neon-green/10' },
  { value: 'Medium', label: 'Medium', desc: 'Nonspecific', color: 'text-neon-physio bg-neon-physio/10' },
  { value: 'Hard', label: 'Hard', desc: 'Atypical', color: 'text-neon-patho bg-neon-patho/10' },
  { value: 'clinical-reasoning', label: 'USMLE', desc: 'Next Best Step', color: 'text-neon-micro bg-neon-micro/10' },
]

const EXAM_CATEGORIES = [
  { label: 'General Examination', icon: <Stethoscope className="w-3.5 h-3.5" /> },
  { label: 'Vital Signs', icon: <Activity className="w-3.5 h-3.5" /> },
  { label: 'Cardiovascular', icon: <Heart className="w-3.5 h-3.5" /> },
  { label: 'Respiratory', icon: <ClipboardList className="w-3.5 h-3.5" /> },
  { label: 'Abdominal', icon: <ClipboardList className="w-3.5 h-3.5" /> },
  { label: 'Neurological', icon: <Brain className="w-3.5 h-3.5" /> },
  { label: 'Musculoskeletal', icon: <Bone className="w-3.5 h-3.5" /> },
  { label: 'Ophthalmic', icon: <Eye className="w-3.5 h-3.5" /> },
]

const INVESTIGATION_OPTIONS = [
  'CBC', 'Electrolytes (U&E)', 'Renal Function', 'Liver Function',
  'ECG', 'Chest X-ray', 'Echocardiogram', 'Troponin',
  'BNP/NT-proBNP', 'Urinalysis', 'Blood Culture', 'Coagulation Profile',
  'Thyroid Function', 'HbA1c', 'Lipid Profile', 'ABG',
]

function uid(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

export default function ClinicalSimulation({ discipline, onNavigateBack, onQuizFromSource, onGenerateMnemonic, onReviewGuide, currentTopic }: ClinicalSimulationProps) {
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
  const [patientName, setPatientName] = useState('Patient')
  const [sessionEnded, setSessionEnded] = useState(false)
  const [caseDebrief, setCaseDebrief] = useState<CaseDebrief | null>(null)
  const [error, setError] = useState('')
  const [showActions, setShowActions] = useState(false)
  const [actionCategory, setActionCategory] = useState<'history' | 'examination' | 'investigation' | 'diagnosis'>('examination')
  const [inputMode, setInputMode] = useState<'voice' | 'text'>('voice')

  // Phase 5: analytics on session end
  useEffect(() => {
    if (sessionEnded && topic) {
      analytics.log('simulation_completed', topic, undefined, {
        hasDebrief: !!caseDebrief,
        performanceScore: caseDebrief?.performanceScore ?? 0,
      })
    }
  }, [sessionEnded]) // eslint-disable-line react-hooks/exhaustive-deps
  const [showDiagnosisForm, setShowDiagnosisForm] = useState(false)
  const [diagnosisInput, setDiagnosisInput] = useState('')
  const [differentialsInput, setDifferentialsInput] = useState('')
  const [managementInput, setManagementInput] = useState('')

  const chatEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const subjects = getSubjectsByDiscipline(discipline)

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Auto-speak new patient messages
  useEffect(() => {
    if (!ttsSupported || messages.length === 0) return
    const lastMsg = messages[messages.length - 1]
    if (lastMsg.role === 'patient' && !lastMsg.isSpoken && !sessionEnded) {
      speak(lastMsg.content)
      setMessages(prev => prev.map((m, i) => i === prev.length - 1 ? { ...m, isSpoken: true } : m))
    }
  }, [messages, ttsSupported, sessionEnded, speak])

  // Send message to simulation API
  const sendToSimulation = useCallback(async (studentMessage?: string, requestDebrief = false) => {
    setIsLoading(true)
    setError('')
    const subject = subjectFilter !== 'all' ? subjectFilter : 'medicine'

    const history = messages.slice(-20).filter(m => m.role !== 'system').map(m => ({
      role: m.role, content: m.content,
    }))

    try {
      const res = await fetch('/api/simulation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topic.trim(), subject, history,
          studentMessage: studentMessage || undefined,
          patientName, difficulty,
          requestDebrief,
        }),
      })
      const data = await res.json()
      if (!data.success) {
        setError('The patient is unavailable. Please try again.')
        return
      }

      if (data.data.patientName && patientName === 'Patient') {
        setPatientName(data.data.patientName)
      }

      const patientMsg: ChatMessage = {
        id: uid(), role: 'patient', content: data.data.patientResponse,
        timestamp: new Date().toISOString(),
      }
      setMessages(prev => [...prev, patientMsg])

      if (data.data.caseDebrief) {
        setCaseDebrief(data.data.caseDebrief)
      }
      if (data.data.encounterComplete || requestDebrief) {
        setSessionEnded(true)
      }
    } catch {
      setError('Could not connect. Please check your connection and try again.')
    } finally {
      setIsLoading(false)
    }
  }, [topic, subjectFilter, messages, patientName, difficulty])

  // Start session
  const startSession = useCallback(async () => {
    if (!topic.trim()) return
    setIsSetup(true)
    const systemMsg: ChatMessage = {
      id: uid(), role: 'system',
      content: `Clinical encounter: ${topic.trim()} — ${subjectFilter !== 'all' ? subjectFilter : 'medicine'} (${difficulty})`,
      timestamp: new Date().toISOString(),
    }
    setMessages([systemMsg])
    setIsLoading(true)
    setError('')
    const subject = subjectFilter !== 'all' ? subjectFilter : 'medicine'
    try {
      const res = await fetch('/api/simulation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: topic.trim(), subject, history: [], patientName, difficulty }),
      })
      const data = await res.json()
      if (!data.success) {
        setError('Could not start the encounter. Please try again.')
        setIsLoading(false)
        return
      }
      if (data.data.patientName) setPatientName(data.data.patientName)
      const patientMsg: ChatMessage = {
        id: uid(), role: 'patient', content: data.data.patientResponse,
        timestamp: new Date().toISOString(),
      }
      setMessages([systemMsg, patientMsg])
    } catch {
      setError('Could not connect. Please check your connection and try again.')
    } finally {
      setIsLoading(false)
    }
  }, [topic, subjectFilter, patientName, difficulty])

  // Submit student message
  const handleSubmit = useCallback(async (text?: string) => {
    const msgText = text || inputValue.trim()
    if (!msgText || isLoading || sessionEnded) return
    const clinicianMsg: ChatMessage = {
      id: uid(), role: 'clinician', content: msgText, timestamp: new Date().toISOString(),
    }
    setMessages(prev => [...prev, clinicianMsg])
    setInputValue('')
    clearTranscript()
    if (isListening) stopListening()
    await sendToSimulation(msgText)
  }, [inputValue, isLoading, sessionEnded, sendToSimulation, clearTranscript, isListening, stopListening])

  // Handle STT stop
  const handleSTTStop = useCallback(() => {
    stopListening()
  }, [stopListening])

  // Auto-populate input from STT transcript
  useEffect(() => {
    if (!isListening && transcript && !isLoading && inputMode === 'voice') {
      const trimmed = transcript.trim()
      if (trimmed && trimmed.length > 2) {
        setInputValue(trimmed)
      }
    }
  }, [isListening, transcript, isLoading, inputMode])

  // Request examination
  const requestExamination = useCallback(async (examType: string) => {
    const clinicianMsg: ChatMessage = {
      id: uid(), role: 'clinician',
      content: `[Clinical Action: ${examType} Examination]`,
      timestamp: new Date().toISOString(),
    }
    setMessages(prev => [...prev, clinicianMsg])
    setShowActions(false)
    await sendToSimulation(`I would like to perform a ${examType} examination. Please describe the findings.`)
  }, [sendToSimulation])

  // Request investigation
  const requestInvestigation = useCallback(async (investigation: string) => {
    const clinicianMsg: ChatMessage = {
      id: uid(), role: 'clinician',
      content: `[Investigation Request: ${investigation}]`,
      timestamp: new Date().toISOString(),
    }
    setMessages(prev => [...prev, clinicianMsg])
    setShowActions(false)
    await sendToSimulation(`I would like to order a ${investigation}. Please provide the results.`)
  }, [sendToSimulation])

  // Submit diagnosis
  const submitDiagnosis = useCallback(async () => {
    const fullDiagnosis = `My diagnosis is: ${diagnosisInput}${differentialsInput ? `. My differentials are: ${differentialsInput}` : ''}${managementInput ? `. My management plan: ${managementInput}` : ''}`
    const clinicianMsg: ChatMessage = {
      id: uid(), role: 'clinician',
      content: `[Diagnosis Submission]\n${fullDiagnosis}`,
      timestamp: new Date().toISOString(),
    }
    setMessages(prev => [...prev, clinicianMsg])
    setShowDiagnosisForm(false)
    setShowActions(false)
    // Request debrief after diagnosis
    await sendToSimulation(`Here is my assessment:\n${fullDiagnosis}\n\nPlease provide the case debrief and teaching feedback.`, true)
  }, [diagnosisInput, differentialsInput, managementInput, sendToSimulation])

  // End session without diagnosis
  const endSession = useCallback(async () => {
    setShowActions(false)
    const endMsg: ChatMessage = {
      id: uid(), role: 'system', content: 'Encounter ended by clinician.',
      timestamp: new Date().toISOString(),
    }
    setMessages(prev => [...prev, endMsg])
    await sendToSimulation('I am ending the encounter. Please provide the case debrief.', true)
  }, [sendToSimulation])

  // Reset
  const resetSession = useCallback(() => {
    setIsSetup(false)
    setMessages([])
    setInputValue('')
    setPatientName('Patient')
    setSessionEnded(false)
    setCaseDebrief(null)
    setError('')
    setTopic('')
    setShowActions(false)
    setShowDiagnosisForm(false)
    setDiagnosisInput('')
    setDifferentialsInput('')
    setManagementInput('')
    stopSpeech()
    if (isListening) stopListening()
    clearTranscript()
  }, [stopSpeech, isListening, stopListening, clearTranscript])

  // ── SETUP VIEW ──
  if (!isSetup) {
    return (
      <div className="view-container">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 animate-fade-up">
          <div className="flex items-center gap-3">
            <button onClick={onNavigateBack} className="p-2.5 rounded-lg hover:bg-elevated/60 text-ink-tertiary hover:text-ink-secondary transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-neon-biochem/10 flex items-center justify-center">
                <FlaskConical className="w-5 h-5 text-neon-biochem" />
              </div>
              <div>
                <h1 className="text-lg font-bold font-display text-ink-primary">Clinical Simulation</h1>
                <p className="text-[10px] text-ink-tertiary">Case-based encounter with voice — you are the doctor</p>
              </div>
            </div>
          </div>

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
              <label className="text-[10px] font-bold uppercase tracking-widest font-mono text-ink-tertiary">Clinical Scenario / Topic</label>
              <input
                type="text"
                value={topic}
                onChange={e => setTopic(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && startSession()}
                placeholder="e.g. Diabetes Mellitus, Chest Pain, Acute Abdomen..."
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
                        ? opt.color + ' font-bold ring-2 ring-current/20'
                        : 'bg-card/30 text-ink-tertiary hover:text-ink-secondary hover:bg-card/50'
                    )}
                  >
                    <span className="text-[11px] font-bold">{opt.label}</span>
                    <span className="text-[8px] opacity-70">{opt.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={startSession}
              disabled={!topic.trim() || isLoading}
              className="glow-btn w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-xs font-bold bg-neon-biochem text-void disabled:opacity-30 disabled:pointer-events-none shadow-card-sm min-h-[48px]"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Stethoscope className="w-4 h-4" />}
              Begin Patient Encounter
            </button>
          </div>

          <div className="bg-card rounded-xl shadow-card p-4">
            <h3 className="section-label text-ink-tertiary mb-2">How it works</h3>
            <ul className="space-y-1.5 text-[11px] text-ink-secondary leading-relaxed">
              <li>The AI plays a <strong className="text-ink-primary">realistic patient</strong> who speaks aloud</li>
              <li>Take history, request examinations, and order investigations</li>
              <li>Press <strong className="text-neon-green">Speak</strong> to talk to the patient, or type</li>
              <li>Submit your diagnosis when ready for a comprehensive debrief</li>
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
          <div className="w-8 h-8 rounded-lg bg-neon-biochem/10 flex items-center justify-center">
            <FlaskConical className="w-4 h-4 text-neon-biochem" />
          </div>
          <div className="min-w-0">
            <h2 className="text-xs font-bold text-ink-primary truncate">{patientName}</h2>
            <div className="text-[9px] text-ink-tertiary">{topic}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!sessionEnded && (
            <>
              <button onClick={() => setShowActions(a => !a)} className={cn(
                'text-[10px] px-3 py-2.5 rounded-lg transition-all min-h-[44px] flex items-center',
                showActions ? 'bg-neon-biochem/10 text-neon-biochem' : 'bg-card/30 text-ink-tertiary hover:text-ink-secondary hover:bg-card/50'
              )}>
                Actions
              </button>
              <button onClick={endSession} className="text-[10px] px-3 py-2.5 rounded-lg bg-neon-danger/8 text-neon-danger hover:bg-neon-danger/12 transition-all min-h-[44px] flex items-center">
                End
              </button>
            </>
          )}
        </div>
      </div>

      {/* Clinical Actions Panel */}
      {showActions && !sessionEnded && (
        <div className="shrink-0 bg-elevated/20 max-h-[40vh] overflow-y-auto scrollbar-none">
          {/* Category tabs */}
          <div className="flex gap-1 px-4 pt-2 pb-1">
            {(['history', 'examination', 'investigation', 'diagnosis'] as const).map(cat => (
              <button
                key={cat}
                onClick={() => setActionCategory(cat)}
                className={cn(
                  'text-[9px] font-mono font-bold uppercase tracking-wider px-3 py-2 rounded-lg transition-all',
                  actionCategory === cat ? 'bg-neon-biochem/10 text-neon-biochem' : 'text-ink-tertiary hover:text-ink-secondary'
                )}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="px-4 py-2">
            {actionCategory === 'history' && (
              <div className="flex gap-2 flex-wrap">
                {['Presenting Complaint', 'Onset & Duration', 'Associated Symptoms', 'Past Medical History', 'Medications & Allergies', 'Family History', 'Social History', 'Risk Factors', 'Systems Review'].map(item => (
                  <button key={item} onClick={() => { setShowActions(false); handleSubmit(`I would like to ask about your ${item.toLowerCase()}.`) }}
                    className="flex items-center gap-1.5 px-3 py-2.5 rounded-lg text-[10px] font-semibold bg-card/60 text-ink-secondary hover:text-ink-primary hover:bg-card/80 transition-all active:scale-95 min-h-[44px]">
                    <ClipboardList className="w-3 h-3" /> {item}
                  </button>
                ))}
              </div>
            )}

            {actionCategory === 'examination' && (
              <div className="flex gap-2 flex-wrap">
                {EXAM_CATEGORIES.map(exam => (
                  <button key={exam.label} onClick={() => requestExamination(exam.label)}
                    className="flex items-center gap-1.5 px-3 py-2.5 rounded-lg text-[10px] font-semibold bg-card/60 text-ink-secondary hover:text-ink-primary hover:bg-card/80 transition-all active:scale-95 min-h-[44px]">
                    {exam.icon} {exam.label}
                  </button>
                ))}
              </div>
            )}

            {actionCategory === 'investigation' && (
              <div className="flex gap-2 flex-wrap">
                {INVESTIGATION_OPTIONS.map(inv => (
                  <button key={inv} onClick={() => requestInvestigation(inv)}
                    className="flex items-center gap-1.5 px-3 py-2.5 rounded-lg text-[10px] font-semibold bg-card/60 text-ink-secondary hover:text-ink-primary hover:bg-card/80 transition-all active:scale-95 min-h-[44px]">
                    <Microscope className="w-3 h-3" /> {inv}
                  </button>
                ))}
              </div>
            )}

            {actionCategory === 'diagnosis' && (
              <div className="space-y-3">
                <p className="text-[10px] text-ink-tertiary">Submit your clinical assessment to end the encounter and receive the case debrief.</p>
                {!showDiagnosisForm ? (
                  <button onClick={() => setShowDiagnosisForm(true)}
                    className="glow-btn w-full flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold bg-neon-biochem text-void min-h-[48px]">
                    <Syringe className="w-4 h-4" /> Make Diagnosis
                  </button>
                ) : (
                  <div className="space-y-3 bg-card/40 rounded-xl p-4">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold uppercase tracking-widest font-mono text-ink-tertiary">Most Likely Diagnosis</label>
                      <input value={diagnosisInput} onChange={e => setDiagnosisInput(e.target.value)} placeholder="e.g. Congestive Heart Failure"
                        className="w-full bg-surface rounded-lg px-3 py-2.5 text-sm text-ink-primary placeholder:text-ink-tertiary/50 focus:outline-none focus:ring-2 focus:ring-neon-biochem/15 min-h-[44px]" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold uppercase tracking-widest font-mono text-ink-tertiary">Differential Diagnoses</label>
                      <input value={differentialsInput} onChange={e => setDifferentialsInput(e.target.value)} placeholder="e.g. Pneumonia, PE, Pericarditis"
                        className="w-full bg-surface rounded-lg px-3 py-2.5 text-sm text-ink-primary placeholder:text-ink-tertiary/50 focus:outline-none focus:ring-2 focus:ring-neon-biochem/15 min-h-[44px]" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold uppercase tracking-widest font-mono text-ink-tertiary">Initial Management</label>
                      <textarea value={managementInput} onChange={e => setManagementInput(e.target.value)} placeholder="Your management plan..."
                        rows={2} className="w-full bg-surface rounded-lg px-3 py-2.5 text-sm text-ink-primary placeholder:text-ink-tertiary/50 focus:outline-none focus:ring-2 focus:ring-neon-biochem/15 resize-none" />
                    </div>
                    <div className="flex gap-2">
                      <button onClick={submitDiagnosis} disabled={!diagnosisInput.trim() || isLoading}
                        className="glow-btn flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold bg-neon-biochem text-void disabled:opacity-30 min-h-[44px]">
                        Submit & Get Debrief
                      </button>
                      <button onClick={() => setShowDiagnosisForm(false)}
                        className="px-4 py-2.5 rounded-lg text-xs text-ink-tertiary bg-card/30 hover:bg-card/50 transition-all min-h-[44px]">
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

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
          const isPatient = msg.role === 'patient'
          const isClinicalAction = msg.content.startsWith('[Clinical Action:') || msg.content.startsWith('[Investigation Request:') || msg.content.startsWith('[Diagnosis Submission]')
          return (
            <div key={msg.id} className={cn('flex', isPatient ? 'justify-start' : 'justify-end')}>
              <div className={cn(
                'max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3',
                isPatient
                  ? 'bg-card/60 rounded-bl-md'
                  : isClinicalAction
                    ? 'bg-neon-biochem/8 rounded-br-md'
                    : 'bg-neon-green/10 rounded-br-md',
              )}>
                {isPatient && (
                  <div className="text-[9px] font-mono text-neon-biochem font-bold mb-1">{patientName}</div>
                )}
                <p className={cn(
                  'text-sm leading-relaxed whitespace-pre-line',
                  isClinicalAction ? 'text-neon-biochem italic text-xs font-mono' : 'text-ink-primary',
                )}>
                  {msg.content}
                </p>
                {/* TTS Controls on patient messages */}
                {isPatient && (
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
            <div className="bg-card/60 rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-ink-tertiary/40 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-ink-tertiary/40 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-ink-tertiary/40 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span className="text-[10px] text-ink-tertiary font-mono">patient responding...</span>
              </div>
            </div>
          </div>
        )}
        {error && (
          <div className="text-center">
            <span className="text-[11px] text-neon-danger bg-neon-danger/8 px-3 py-1.5 rounded-lg">{error}</span>
          </div>
        )}

        {/* Case Debrief */}
        {sessionEnded && caseDebrief && (
          <div className="space-y-4 animate-fade-up">
            {/* Diagnosis Header */}
            <div className="bg-neon-biochem/8 rounded-2xl p-5 space-y-5">
              <h3 className="text-[10px] font-bold uppercase tracking-widest font-mono text-neon-biochem flex items-center gap-1.5">
                <FlaskConical className="w-3.5 h-3.5" /> Case Debrief
              </h3>

              {/* Prominent Diagnosis */}
              <div className="space-y-1">
                <p className="text-[9px] font-mono uppercase tracking-widest text-ink-tertiary">Diagnosis</p>
                <h2 className="text-xl sm:text-2xl font-bold font-display text-ink-primary leading-tight">{caseDebrief.mostLikelyDiagnosis}</h2>
              </div>

              {/* Score + Summary Row */}
              <div className="flex items-center gap-4">
                <div className="text-center shrink-0">
                  <div className={cn(
                    'text-2xl font-bold font-mono',
                    caseDebrief.performanceScore >= 80 ? 'text-neon-green' : caseDebrief.performanceScore >= 50 ? 'text-neon-physio' : 'text-neon-danger'
                  )}>{caseDebrief.performanceScore}%</div>
                  <div className="text-[9px] text-ink-tertiary uppercase tracking-wider">Score</div>
                </div>
                <div className="flex-1">
                  <p className="text-[11px] text-ink-secondary leading-relaxed">{caseDebrief.caseSummary}</p>
                </div>
              </div>

              {/* Key Clues */}
              {caseDebrief.keyClues.length > 0 && (
                <div>
                  <h4 className="text-[9px] font-bold uppercase tracking-widest font-mono text-neon-green mb-1.5">Key Clinical Clues</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {caseDebrief.keyClues.map((c, i) => (
                      <span key={i} className="text-[10px] px-2 py-1 rounded-lg bg-neon-green/10 text-neon-green">{c}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Differentials */}
              {caseDebrief.differentials.length > 0 && (
                <div>
                  <h4 className="text-[9px] font-bold uppercase tracking-widest font-mono text-neon-physio mb-1.5">Important Differentials</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {caseDebrief.differentials.map((d, i) => (
                      <span key={i} className="text-[10px] px-2 py-1 rounded-lg bg-neon-physio/10 text-neon-physio">{d}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Missed History */}
              {caseDebrief.missedHistory.length > 0 && (
                <div>
                  <h4 className="text-[9px] font-bold uppercase tracking-widest font-mono text-neon-anatomy mb-1.5">History You Missed</h4>
                  <ul className="space-y-1">
                    {caseDebrief.missedHistory.map((h, i) => (
                      <li key={i} className="text-[11px] text-ink-secondary">• {h}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Missed Exam */}
              {caseDebrief.missedExamFindings.length > 0 && (
                <div>
                  <h4 className="text-[9px] font-bold uppercase tracking-widest font-mono text-neon-patho mb-1.5">Examinations You Should Have Requested</h4>
                  <ul className="space-y-1">
                    {caseDebrief.missedExamFindings.map((e, i) => (
                      <li key={i} className="text-[11px] text-ink-secondary">• {e}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Missed Investigations */}
              {caseDebrief.missedInvestigations.length > 0 && (
                <div>
                  <h4 className="text-[9px] font-bold uppercase tracking-widest font-mono text-neon-micro mb-1.5">Investigations You Should Have Considered</h4>
                  <ul className="space-y-1">
                    {caseDebrief.missedInvestigations.map((inv, i) => (
                      <li key={i} className="text-[11px] text-ink-secondary">• {inv}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Interpretation & Management */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-card/40 rounded-xl p-3">
                  <h4 className="text-[9px] font-bold uppercase tracking-widest font-mono text-ink-tertiary mb-1">Correct Interpretation</h4>
                  <p className="text-[11px] text-ink-secondary leading-relaxed">{caseDebrief.correctInterpretation}</p>
                </div>
                <div className="bg-card/40 rounded-xl p-3">
                  <h4 className="text-[9px] font-bold uppercase tracking-widest font-mono text-ink-tertiary mb-1">Initial Management</h4>
                  <p className="text-[11px] text-ink-secondary leading-relaxed">{caseDebrief.initialManagement}</p>
                </div>
              </div>

              {/* Red Flags */}
              {caseDebrief.redFlags.length > 0 && (
                <div>
                  <h4 className="text-[9px] font-bold uppercase tracking-widest font-mono text-neon-danger mb-1.5">Red Flags</h4>
                  <ul className="space-y-1">
                    {caseDebrief.redFlags.map((f, i) => (
                      <li key={i} className="text-[11px] text-neon-danger">• {f}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Revision */}
              {caseDebrief.recommendedRevision.length > 0 && (
                <div>
                  <h4 className="text-[9px] font-bold uppercase tracking-widest font-mono text-ink-tertiary mb-1.5">Recommended Revision</h4>
                  <ul className="space-y-1">
                    {caseDebrief.recommendedRevision.map((r, i) => (
                      <li key={i} className="text-[11px] text-ink-secondary">• {r}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Integration CTAs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button onClick={resetSession} className="glow-btn flex flex-col items-center gap-1.5 py-3 rounded-xl text-[10px] font-bold bg-neon-biochem text-void min-h-[60px]">
                <RotateCcw className="w-4 h-4" /> New Case
              </button>
              {onReviewGuide && (
                <button onClick={() => onReviewGuide(topic)} className="flex flex-col items-center gap-1.5 py-3 rounded-xl text-[10px] font-bold bg-card text-ink-secondary hover:text-ink-primary transition-all min-h-[60px]">
                  <BookOpen className="w-4 h-4" /> Guide
                </button>
              )}
              {onQuizFromSource && (
                <button onClick={() => onQuizFromSource(topic, subjectFilter !== 'all' ? subjectFilter : 'medicine')} className="flex flex-col items-center gap-1.5 py-3 rounded-xl text-[10px] font-bold bg-card text-ink-secondary hover:text-ink-primary transition-all min-h-[60px]">
                  <Target className="w-4 h-4" /> Quiz
                </button>
              )}
              {onGenerateMnemonic && (
                <button onClick={() => onGenerateMnemonic(topic)} className="flex flex-col items-center gap-1.5 py-3 rounded-xl text-[10px] font-bold bg-card text-ink-secondary hover:text-ink-primary transition-all min-h-[60px]">
                  <Sparkles className="w-4 h-4" /> Mnemonic
                </button>
              )}
            </div>
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
                    inputMode === 'voice' ? 'bg-neon-biochem/10 text-neon-biochem' : 'text-ink-tertiary hover:text-ink-secondary'
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
                      className="shrink-0 px-4 h-11 rounded-xl bg-neon-biochem text-void hover:brightness-110 active:scale-95 disabled:opacity-30 disabled:pointer-events-none transition-all flex items-center gap-1.5 text-xs font-bold"
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
                  placeholder="Ask the patient a question..."
                  rows={1}
                  disabled={isLoading}
                  className="flex-1 bg-surface rounded-xl px-4 py-3 text-sm text-ink-primary placeholder:text-ink-tertiary/50 focus:outline-none focus:ring-2 focus:ring-neon-green/15 transition-all resize-none min-h-[44px]"
                />
                <button
                  onClick={() => handleSubmit()}
                  disabled={!inputValue.trim() || isLoading}
                  className="shrink-0 w-11 h-11 rounded-xl bg-neon-biochem text-void hover:brightness-110 active:scale-95 disabled:opacity-30 disabled:pointer-events-none transition-all flex items-center justify-center"
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
