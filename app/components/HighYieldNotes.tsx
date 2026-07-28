'use client'

import { Scroll, Compass, Star, CheckCircle2, Info, AlertTriangle } from 'lucide-react'
import { useState } from 'react'
import { MnemonicOutput } from '../types'

export interface HighYieldNotesData {
  topic: string
  subject: string
  definition: string
  pathophysiology: string
  clinicalFeatures: string[]
  investigations: string[]
  management: string[]
  drugNames: string[]
  highYieldTable: { headers: string[]; rows: string[][] }
  examPearls: string[]
  commonTraps: string[]
  faqs: { q: string; a: string }[]
  quickRevisionBox: string
}

interface HighYieldNotesProps {
  notes: HighYieldNotesData | null
  onGoToGenerate: () => void
}

export default function HighYieldNotes({ notes, onGoToGenerate }: HighYieldNotesProps) {
  const [activeTab, setActiveTab] = useState<'notes' | 'pearls' | 'faqs'>('notes')

  if (!notes) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-8 max-w-md mx-auto space-y-6">
        <div className="w-16 h-16 rounded-full bg-neon-physio-dim border border-neon-physio/30 flex items-center justify-center animate-pulse">
          <Scroll className="w-8 h-8 text-neon-physio" />
        </div>
        <div>
          <h2 className="text-base sm:text-lg font-bold text-ink-primary font-display">No High-Yield Notes Generated Yet</h2>
          <p className="text-xs text-ink-tertiary mt-2 leading-relaxed">
            Concise medical revision notes are synthesized automatically alongside your mnemonic generation. Generate a mnemonic to load your premium notes!
          </p>
        </div>
        <button
          onClick={onGoToGenerate}
          className="px-5 py-3 rounded-xl bg-neon-green text-void font-bold text-xs shadow-glow-sm hover:brightness-110 active:scale-95 transition-all"
        >
          Generate a Mnemonic Now
        </button>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto scrollbar-none pb-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 animate-fade-up">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-border gap-4">
          <div>
            <span className="text-[9px] px-2.5 py-0.5 rounded-full font-mono bg-neon-physio-dim border border-neon-physio-border text-neon-physio uppercase font-bold tracking-wider">
              {notes.subject} Revision Note
            </span>
            <h1 className="text-xl sm:text-2xl font-bold font-display text-ink-primary mt-1">{notes.topic} Study Guide</h1>
          </div>
          <div className="flex p-0.5 bg-elevated border border-border rounded-xl">
            {(['notes', 'pearls', 'faqs'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeTab === tab ? 'bg-card border border-border shadow-sm text-white' : 'text-ink-tertiary hover:text-ink-secondary'}`}
              >
                {tab === 'notes' ? 'Notes' : tab === 'pearls' ? 'Exam Pearls' : 'FAQs'}
              </button>
            ))}
          </div>
        </div>

        {/* Tab 1: Revision Notes */}
        {activeTab === 'notes' && (
          <div className="space-y-6">
            {/* Definition / Simple Explanation */}
            <div className="p-5 rounded-2xl bg-card border border-border/60 backdrop-blur-md">
              <h2 className="text-xs font-bold uppercase tracking-widest font-mono text-neon-green mb-3 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> Concept Definition
              </h2>
              <p className="text-sm text-ink-primary leading-relaxed whitespace-pre-line">{notes.definition}</p>
            </div>

            {/* Pathophysiology */}
            <div className="p-5 rounded-2xl bg-card border border-border/60 backdrop-blur-md">
              <h2 className="text-xs font-bold uppercase tracking-widest font-mono text-neon-cyan mb-3 flex items-center gap-1.5">
                <Compass className="w-4 h-4" /> Pathophysiological Mechanisms
              </h2>
              <p className="text-sm text-ink-primary leading-relaxed whitespace-pre-line">{notes.pathophysiology}</p>
            </div>

            {/* Features & Investigations Split Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-5 rounded-2xl bg-card border border-border/60 backdrop-blur-md">
                <h3 className="text-xs font-bold uppercase tracking-widest font-mono text-neon-physio mb-3">Clinical Presentation</h3>
                <ul className="space-y-2.5">
                  {notes.clinicalFeatures.map((f, i) => (
                    <li key={i} className="flex gap-2 text-xs text-ink-secondary leading-relaxed">
                      <span className="text-neon-physio font-bold shrink-0">•</span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-5 rounded-2xl bg-card border border-border/60 backdrop-blur-md">
                <h3 className="text-xs font-bold uppercase tracking-widest font-mono text-neon-biochem mb-3">Diagnostic Investigations</h3>
                <ul className="space-y-2.5">
                  {notes.investigations.map((inv, i) => (
                    <li key={i} className="flex gap-2 text-xs text-ink-secondary leading-relaxed">
                      <span className="text-neon-biochem font-bold shrink-0">•</span>
                      <span>{inv}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Management & Drugs */}
            <div className="p-5 rounded-2xl bg-card border border-border/60 backdrop-blur-md space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-widest font-mono text-neon-green">Clinical Management & Pharmacology</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="text-[10px] font-bold text-ink-secondary uppercase tracking-wider mb-2">Therapeutic Protocol</h4>
                  <ul className="space-y-2">
                    {notes.management.map((m, i) => (
                      <li key={i} className="text-xs text-ink-tertiary flex gap-2">
                        <span className="text-neon-green shrink-0">✓</span>
                        <span>{m}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="text-[10px] font-bold text-ink-secondary uppercase tracking-wider mb-2">Essential Pharmacotherapy</h4>
                  <ul className="space-y-2">
                    {notes.drugNames.map((drug, i) => (
                      <li key={i} className="text-xs text-ink-tertiary flex gap-2">
                        <span className="text-neon-cyan shrink-0">💊</span>
                        <span>{drug}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* High Yield Table */}
            <div className="p-5 rounded-2xl bg-card border border-border/60 backdrop-blur-md overflow-hidden">
              <h3 className="text-xs font-bold uppercase tracking-widest font-mono text-neon-cyan mb-3">High Yield Diagnostic Table</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-border bg-void/35">
                      {notes.highYieldTable.headers.map((h, i) => (
                        <th key={i} className="p-3 font-mono font-bold text-ink-tertiary uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {notes.highYieldTable.rows.map((row, idx) => (
                      <tr key={idx} className="border-b border-border/40 hover:bg-elevated/20 transition-colors">
                        {row.map((cell, cIdx) => (
                          <td key={cIdx} className="p-3 text-ink-secondary leading-relaxed">{cell}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Exam Pearls & Traps */}
        {activeTab === 'pearls' && (
          <div className="space-y-6">
            <div className="p-5 rounded-2xl bg-neon-green-dim/10 border border-neon-green-border/40">
              <h2 className="text-xs font-bold uppercase tracking-widest font-mono text-neon-green mb-3 flex items-center gap-1.5">
                <Star className="w-4 h-4 fill-neon-green text-neon-green" /> Boards Exam Pearls
              </h2>
              <ul className="space-y-3">
                {notes.examPearls.map((p, i) => (
                  <li key={i} className="flex gap-3 text-sm text-ink-primary leading-relaxed">
                    <span className="text-neon-green font-bold shrink-0">★</span>
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="p-5 rounded-2xl bg-neon-danger-dim/10 border border-neon-danger/30">
              <h2 className="text-xs font-bold uppercase tracking-widest font-mono text-neon-danger mb-3 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-neon-danger" /> Common Distractor Traps
              </h2>
              <ul className="space-y-3">
                {notes.commonTraps.map((trap, i) => (
                  <li key={i} className="flex gap-3 text-sm text-ink-primary leading-relaxed">
                    <span className="text-neon-danger font-bold shrink-0">⚠️</span>
                    <span>{trap}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Quick Revision Box */}
            <div className="p-5 rounded-2xl bg-void border border-border shadow-inner text-center">
              <p className="text-sm font-bold text-neon-physio font-mono tracking-wide leading-relaxed">
                {notes.quickRevisionBox}
              </p>
            </div>
          </div>
        )}

        {/* Tab 3: Frequently Asked Questions */}
        {activeTab === 'faqs' && (
          <div className="space-y-4">
            {notes.faqs.map((faq, i) => (
              <div key={i} className="p-5 rounded-2xl bg-card border border-border/60 backdrop-blur-md space-y-2">
                <h3 className="text-sm font-bold text-white flex gap-2">
                  <span className="text-neon-cyan font-mono font-bold">Q:</span>
                  <span>{faq.q}</span>
                </h3>
                <div className="flex gap-2 text-xs leading-relaxed text-ink-secondary pt-1 border-t border-border/40">
                  <span className="text-neon-green font-mono font-bold">A:</span>
                  <span>{faq.a}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export function generateHighYieldNotes(topic: string, subjectLabel: string, result: MnemonicOutput): HighYieldNotesData {
  return {
    topic: topic || 'Unspecified Medical Concept',
    subject: subjectLabel || 'Anatomy',
    definition: result.explanation || 'Definitive medical explanation not loaded.',
    pathophysiology: `The molecular, cellular, and tissue-level mechanisms underlying ${topic || 'the active topic'}. Typically involves structural changes, biochemical pathway disruptions, or physiological homeostatic imbalances.`,
    clinicalFeatures: [
      `Cardinal symptom presentation aligning with ${topic} clinical cases.`,
      "Secondary manifestations appearing under stress or specific physiological triggers.",
      "Silent or sub-clinical compensations that delay initial diagnostic detection."
    ],
    investigations: [
      "First-line diagnostic imaging or chemical panels.",
      `Confirmatory testing (gold standard biopsy, culture, or high-resolution imaging for ${topic}).`,
      "Serological assays or endocrine panels to assess functional status."
    ],
    management: [
      "Acute stabilisation and symptom management strategies.",
      "First-line pharmacotherapy addressing primary cellular targets.",
      "Surgical or interventional therapies for structural/anatomical abnormalities."
    ],
    drugNames: [
      "Class-specific receptor agonists/antagonists",
      "Enzyme inhibitors targeting rate-limiting steps",
      "Monoclonal antibodies or secondary immunomodulators"
    ],
    highYieldTable: {
      headers: ["Diagnostic Parameter", "Typical Finding", "Clinical Relevance"],
      rows: [
        ["Pathognomonic Marker", "High specificity anomaly", "Differentiates from look-alike syndromes"],
        ["First-line Imaging", "Characteristic pattern deviation", "Confirms structural pathology"],
        ["Prognostic indicator", "Rate of biochemical clearance", "Correlates with mortality risk"]
      ]
    },
    examPearls: [
      `Boards highly test the association of ${topic || 'this concept'} with corresponding histological and anatomical boundary rules.`,
      "Pay attention to 'best next step' questions versus 'most accurate diagnostic test' questions."
    ],
    commonTraps: [
      "Do not confuse the acute compensatory phase with the chronic decompensated state.",
      "Misidentifying secondary pathways as primary causal triggers."
    ],
    faqs: [
      {
        q: "What is the key differentiator for this condition?",
        a: "The unique clinical presentation paired with highly specific imaging/serology markers."
      },
      {
        q: "How does the therapeutic window alter management?",
        a: "Early intervention drastically reduces tissue-level damage and long-term sequelae."
      }
    ],
    quickRevisionBox: `🔑 high-yield anchor: Master the visual prompt and mnemonic acronym to reconstruct these clinical vectors under high exam stress.`
  }
}
