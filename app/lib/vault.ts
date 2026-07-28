import { Flashcard, VaultState, MnemonicOutput, SubjectId, ReviewQuality, VaultFilter } from '../types'

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

export const vault = {
  load(): Flashcard[] {
    return loadRaw().cards
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
    const now = new Date()

    const updated: Flashcard = {
      ...card,
      interval: result.interval,
      easeFactor: result.easeFactor,
      repetitions: result.repetitions,
      nextReview: addDays(now, result.interval).toISOString(),
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
    const front = card.mnemonic.ankiFront.replace(/\t/g, ' ').replace(/\n/g, '<br>')
    const back = [
      card.mnemonic.ankiBack,
      '',
      `Mnemonic: ${card.mnemonic.mnemonic ?? ''}`,
      '',
      `Story: ${card.mnemonic.story}`,
      ...(card.imageUrl ? ['', `Image: <a href="${card.imageUrl}">${card.imageUrl}</a>`] : []),
    ].join('\n').replace(/\t/g, ' ').replace(/\n/g, '<br>')

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