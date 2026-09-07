import { Flashcard, VaultState, MnemonicOutput, SubjectId, ReviewQuality, VaultFilter } from '../types'
import { getMnemonicAttempts } from './retrieval-validation'
import { deriveMnemonicId } from './retrieval-validation'

const STORAGE_KEY = 'mnemonicflow_vault_v2'
const VERSION = 2

function emptyVault(): VaultState {
  return { cards: [], version: VERSION }
}

// ── SWAP POINT: replace these two functions to move from localStorage to Supabase ──
function loadRaw(): VaultState {
  if (typeof window === 'undefined') return emptyVault()
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return emptyVault()
    const parsed = JSON.parse(raw) as VaultState
    if (!parsed.cards) return emptyVault()
    return parsed
  } catch {
    return emptyVault()
  }
}

function saveRaw(state: VaultState): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // storage full or unavailable — fail silently, don't crash the app
  }
}
// ── END SWAP POINT ──────────────────────────────────────────────────────────

function uid(): string {
  return `card_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

/**
 * SM-2 spaced repetition algorithm.
 * quality: 0 (total blackout) .. 5 (perfect recall)
 */
export function sm2(
  quality: ReviewQuality,
  interval: number,
  easeFactor: number,
  repetitions: number,
): { interval: number; easeFactor: number; repetitions: number } {
  let newEase = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
  newEase = Math.max(1.3, newEase)

  if (quality < 3) {
    return { interval: 1, easeFactor: newEase, repetitions: 0 }
  }

  let newInterval: number
  const newReps = repetitions + 1
  if (newReps === 1) newInterval = 1
  else if (newReps === 2) newInterval = 6
  else newInterval = Math.round(interval * newEase)

  return { interval: newInterval, easeFactor: newEase, repetitions: newReps }
}

export function isDue(card: Flashcard): boolean {
  return new Date(card.nextReview).getTime() <= Date.now()
}

export function getDueCount(cards: Flashcard[]): number {
  return cards.filter(isDue).length
}

// ── FIX 8: Evidence-aware SRS priority layer ──────────────────────────────────
// Post-processing on top of SM-2: reads retrieval evidence and adjusts review
// priority without changing SM-2 intervals, repetitions, or ease factors.

/**
 * Compute an evidence-based priority score for a flashcard.
 * Higher score = more review priority. Returns 0 when no evidence exists.
 */
export function computeEvidencePriority(card: Flashcard): number {
  const mnId = deriveMnemonicId(card.topic)
  const attempts = getMnemonicAttempts(mnId)
  if (attempts.length === 0) return 0

  let score = 0
  const falseRecalls = attempts.filter(a => a.falseRecall).length
  if (falseRecalls > 0) score += 3
  const highConfErrors = attempts.filter(a => !a.isCorrect && (a.confidence ?? 0) >= 4).length
  if (highConfErrors > 0) score += 3
  const accuracy = attempts.filter(a => a.isCorrect).length / attempts.length
  if (accuracy < 0.5 && attempts.length >= 2) score += 2
  const delayedFails = attempts.filter(a => a.delayInterval && !a.isCorrect).length
  if (delayedFails > 0) score += 2
  const recent = attempts.slice(-3)
  if (recent.filter(a => !a.isCorrect).length >= 2) score += 1
  return score
}

/** Evidence priority label for UI display. */
export function evidencePriorityLabel(score: number): string | null {
  if (score >= 5) return 'Needs Reinforcement'
  if (score >= 3) return 'Review Priority'
  return null
}

/**
 * Apply conservative evidence adjustment to SM-2 interval.
 * Only applies when evidence is strong and the card has a difficulty signal.
 * Caps adjustment to prevent negative or zero intervals.
 */
export function applyEvidenceIntervalAdjustment(interval: number, evidenceScore: number): number {
  if (evidenceScore >= 5 && interval > 1) return Math.max(1, Math.round(interval * 0.5))
  if (evidenceScore >= 3 && interval > 2) return Math.max(1, Math.round(interval * 0.75))
  return interval
}

/** Sort flashcards by evidence priority (highest first), then by due date. */
export function prioritizeCards(cards: Flashcard[]): Flashcard[] {
  const scored = cards.map(c => ({ card: c, priority: computeEvidencePriority(c) }))
  return scored
    .sort((a, b) => {
      if (b.priority !== a.priority) return b.priority - a.priority
      return new Date(a.card.nextReview).getTime() - new Date(b.card.nextReview).getTime()
    })
    .map(s => s.card)
}

export const vault = {
  load(): Flashcard[] {
    return loadRaw().cards
  },

  /** FIX 8: load cards with evidence-based priority sorting */
  loadPrioritized(): Flashcard[] {
    return prioritizeCards(loadRaw().cards)
  },

  add(topic: string, subject: SubjectId, mnemonic: MnemonicOutput, imageUrl?: string): Flashcard {
    const state = loadRaw()
    const now = new Date()
    const card: Flashcard = {
      id: uid(),
      topic,
      subject,
      mnemonic,
      imageUrl,
      interval: 1,
      easeFactor: 2.5,
      repetitions: 0,
      nextReview: addDays(now, 1).toISOString(),
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      isFavorite: false,
    }
    state.cards = [card, ...state.cards]
    saveRaw(state)
    return card
  },

  review(cardId: string, quality: ReviewQuality): Flashcard | null {
    const state = loadRaw()
    const idx = state.cards.findIndex(c => c.id === cardId)
    if (idx === -1) return null

    const card = state.cards[idx]
    const result = sm2(quality, card.interval, card.easeFactor, card.repetitions)

    // FIX 8: apply evidence-aware interval adjustment as post-processing
    const evidenceScore = computeEvidencePriority(card)
    const adjustedInterval = applyEvidenceIntervalAdjustment(result.interval, evidenceScore)

    const now = new Date()

    const updated: Flashcard = {
      ...card,
      interval: adjustedInterval,
      easeFactor: result.easeFactor,
      repetitions: result.repetitions,
      nextReview: addDays(now, adjustedInterval).toISOString(),
      lastReview: now.toISOString(),
      updatedAt: now.toISOString(),
    }
    state.cards[idx] = updated
    saveRaw(state)
    return updated
  },

  toggleFavorite(cardId: string): void {
    const state = loadRaw()
    const idx = state.cards.findIndex(c => c.id === cardId)
    if (idx === -1) return
    state.cards[idx] = { ...state.cards[idx], isFavorite: !state.cards[idx].isFavorite, updatedAt: new Date().toISOString() }
    saveRaw(state)
  },

  delete(cardId: string): void {
    const state = loadRaw()
    state.cards = state.cards.filter(c => c.id !== cardId)
    saveRaw(state)
  },

  query(filter: VaultFilter, cards?: Flashcard[]): Flashcard[] {
    const all = cards ?? loadRaw().cards
    if (filter === 'all') return all
    if (filter === 'due') return all.filter(isDue)
    if (filter === 'favorites') return all.filter(c => c.isFavorite)
    return all.filter(c => c.subject === filter)
  },

  clear(): void {
    saveRaw(emptyVault())
  },
}

export function downloadAnkiCSV(cards: Flashcard[]): void {
  const rows = cards.map(card => {
    // Phase 2 format: front = question, back = answer + explanation + optional mnemonic
    const front = card.mnemonic.ankiFront.replace(/\t/g, ' ').replace(/\n/g, '<br>')
    const backParts = [
      card.mnemonic.ankiBack,
      '',
      card.mnemonic.explanation || '',
    ]
    // Only include mnemonic if explicitly present (optional in Phase 2)
    if (card.mnemonic.mnemonic) {
      backParts.push('', `Memory Aid: ${card.mnemonic.mnemonic}`)
    }
    if (card.imageUrl) {
      backParts.push('', `Image: <a href="${card.imageUrl}">${card.imageUrl}</a>`)
    }
    const back = backParts.join('\n').replace(/\t/g, ' ').replace(/\n/g, '<br>')

    return `${front}\t${back}\tMnemonicFlow Pro::${card.subject}`
  })

  const header = '#separator:tab\n#html:true\n#deck:MnemonicFlow Pro\n#notetype:Basic\n#columns:Front\tBack\tTags\n'
  const csv = header + rows.join('\n')

  const blob = new Blob([csv], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'MnemonicFlow_Anki.txt'
  a.click()
  URL.revokeObjectURL(url)
}