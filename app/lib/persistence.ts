// ─────────────────────────────────────────────────────────────────────────────
// app/lib/persistence.ts
// Phase 5: Persistence abstraction layer.
//
// Routes retrieval attempts, vault cards, and analytics through either
// Supabase (authenticated) or localStorage (fallback). The UI never needs
// to know which backend is active.
//
// Priority:
//   1. Authenticated + Supabase available → Supabase
//   2. Unauthenticated / Supabase unavailable → localStorage
// ─────────────────────────────────────────────────────────────────────────────

import { supabase } from './supabase'
import { RetrievalValidation } from '../types'

// ── Auth helpers ────────────────────────────────────────────────────────────

/** Get the current authenticated user ID, or null if not signed in. */
export async function getAuthUserId(): Promise<string | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    return user?.id ?? null
  } catch {
    return null
  }
}

/** Synchronous check — returns cached user if available. */
let _cachedUserId: string | null = null
let _cachedAt = 0
const CACHE_TTL = 30_000 // 30 seconds

export async function getAuthUserIdCached(): Promise<string | null> {
  const now = Date.now()
  if (_cachedUserId && now - _cachedAt < CACHE_TTL) return _cachedUserId
  _cachedUserId = await getAuthUserId()
  _cachedAt = now
  return _cachedUserId
}

export function setCachedUserId(userId: string | null): void {
  _cachedUserId = userId
  _cachedAt = Date.now()
}

// ── Retrieval Attempts ──────────────────────────────────────────────────────

const RETRIEVAL_KEY = 'mnemonicflow_retrieval_validation_v1'

/**
 * Save a retrieval attempt. Tries Supabase first, falls back to localStorage.
 * Returns true if persisted to Supabase, false if saved locally.
 */
export async function saveRetrievalAttempt(
  attempt: RetrievalValidation & {
    subject?: string; architecture?: string; representationType?: string; memoryProblem?: string; factType?: string
  },
): Promise<boolean> {
  const userId = await getAuthUserIdCached()

  if (userId) {
    try {
      const { error } = await supabase.from('retrieval_attempts').insert({
        user_id: userId,
        mnemonic_id: attempt.mnemonicId,
        symbol_id: attempt.symbolId,
        target_fact: attempt.targetFact,
        target_answer: attempt.targetAnswer,
        retrieval_prompt: attempt.retrievalPrompt,
        test_type: attempt.testType,
        response: attempt.response,
        is_correct: attempt.isCorrect,
        false_recall: attempt.falseRecall ?? false,
        confidence: attempt.confidence,
        response_time_ms: attempt.responseTimeMs,
        delay_interval: attempt.delayInterval,
        distractors: attempt.distractors ?? null,
        subject: attempt.subject ?? null,
        architecture: attempt.architecture ?? null,
        representation_type: attempt.representationType ?? null,
        memory_problem: attempt.memoryProblem ?? null,
        fact_type: attempt.factType ?? null,
        evidence_label: null, // computed later by aggregation
        attempt_number: attempt.attemptNumber,
        tested_at: attempt.testedAt,
      })
      if (!error) return true
      console.warn('[Phase5] Supabase insert failed, falling back to localStorage:', error.message)
    } catch (err) {
      console.warn('[Phase5] Supabase error, falling back to localStorage:', err)
    }
  }

  // localStorage fallback
  saveRetrievalLocally(attempt)
  return false
}

/** Get all retrieval attempts for the current user. */
export async function getRetrievalAttempts(): Promise<RetrievalValidation[]> {
  const userId = await getAuthUserIdCached()

  if (userId) {
    try {
      const { data, error } = await supabase
        .from('retrieval_attempts')
        .select('*')
        .eq('user_id', userId)
        .order('tested_at', { ascending: true })

      if (!error && data) {
        return data.map(rowToLocal)
      }
    } catch {
      // fall through to localStorage
    }
  }

  return loadRetrievalLocally()
}

/** Get attempts for a specific mnemonic (all symbols). */
export async function getAttemptsForMnemonic(mnemonicId: string): Promise<RetrievalValidation[]> {
  const all = await getRetrievalAttempts()
  return all.filter(a => a.mnemonicId === mnemonicId)
}

/** Get attempts for a specific symbol. */
export async function getAttemptsForSymbol(mnemonicId: string, symbolId: string): Promise<RetrievalValidation[]> {
  const all = await getRetrievalAttempts()
  return all.filter(a => a.mnemonicId === mnemonicId && a.symbolId === symbolId)
}

// ── localStorage helpers (same as retrieval-validation.ts) ──────────────────

function loadRetrievalLocally(): RetrievalValidation[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(RETRIEVAL_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveRetrievalLocally(attempt: RetrievalValidation): void {
  if (typeof window === 'undefined') return
  try {
    const all = loadRetrievalLocally()
    all.push(attempt)
    localStorage.setItem(RETRIEVAL_KEY, JSON.stringify(all))
  } catch {
    // quota exceeded — evict oldest 50%
    const all = loadRetrievalLocally()
    const half = Math.floor(all.length / 2)
    localStorage.setItem(RETRIEVAL_KEY, JSON.stringify(all.slice(half)))
  }
}

/** Map a Supabase row back to a RetrievalValidation. */
function rowToLocal(row: any): RetrievalValidation {
  return {
    mnemonicId: row.mnemonic_id,
    symbolId: row.symbol_id,
    targetFact: row.target_fact ?? '',
    targetAnswer: row.target_answer ?? '',
    retrievalPrompt: row.retrieval_prompt ?? '',
    cueShown: '', // not stored in DB — reconstructed from context
    response: row.response ?? '',
    isCorrect: row.is_correct,
    responseTimeMs: row.response_time_ms ?? undefined,
    confidence: row.confidence ?? undefined,
    falseRecall: row.false_recall ?? undefined,
    attemptNumber: row.attempt_number,
    testedAt: row.tested_at,
    testType: row.test_type ?? 'immediate',
    delayInterval: row.delay_interval ?? undefined,
    distractors: row.distractors ?? undefined,
  }
}

// ── Migration Detection ─────────────────────────────────────────────────────

const MIGRATION_KEY = 'mnemonicflow_phase5_migration_state'

export interface LocalMigrationState {
  vaultMigrated: boolean
  vaultMigratedAt?: string
  retrievalMigrated: boolean
  retrievalMigratedAt?: string
  bookmarksMigrated: boolean
  bookmarksMigratedAt?: string
}

export function loadMigrationState(): LocalMigrationState {
  if (typeof window === 'undefined') return { vaultMigrated: false, retrievalMigrated: false, bookmarksMigrated: false }
  try {
    const raw = localStorage.getItem(MIGRATION_KEY)
    if (!raw) return { vaultMigrated: false, retrievalMigrated: false, bookmarksMigrated: false }
    return JSON.parse(raw) as LocalMigrationState
  } catch {
    return { vaultMigrated: false, retrievalMigrated: false, bookmarksMigrated: false }
  }
}

export function saveMigrationState(state: LocalMigrationState): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(MIGRATION_KEY, JSON.stringify(state))
}

/**
 * Check if local data exists that could be migrated.
 * Returns which data stores have content.
 */
export function detectMigratableData(): { vault: boolean; retrieval: boolean; bookmarks: boolean } {
  if (typeof window === 'undefined') return { vault: false, retrieval: false, bookmarks: false }
  const vaultRaw = localStorage.getItem('mnemonicflow_vault_v2')
  const retrievalRaw = localStorage.getItem(RETRIEVAL_KEY)
  const bookmarksRaw = localStorage.getItem('mnemonicflow_bookmarks')

  let vault = false, retrieval = false, bookmarks = false
  try { if (vaultRaw) { const p = JSON.parse(vaultRaw); vault = Array.isArray(p?.cards) && p.cards.length > 0 } } catch {}
  try { if (retrievalRaw) { const p = JSON.parse(retrievalRaw); retrieval = Array.isArray(p) && p.length > 0 } } catch {}
  try { if (bookmarksRaw) { const p = JSON.parse(bookmarksRaw); bookmarks = Array.isArray(p) && p.length > 0 } } catch {}

  return { vault, retrieval, bookmarks }
}

/**
 * Migrate local retrieval attempts to Supabase.
 * Returns the number of records migrated.
 */
export async function migrateRetrievalAttempts(): Promise<number> {
  const userId = await getAuthUserId()
  if (!userId) return 0

  const state = loadMigrationState()
  if (state.retrievalMigrated) return 0

  const local = loadRetrievalLocally()
  if (local.length === 0) return 0

  let migrated = 0
  for (const attempt of local) {
    try {
      const { error } = await supabase.from('retrieval_attempts').insert({
        user_id: userId,
        mnemonic_id: attempt.mnemonicId,
        symbol_id: attempt.symbolId,
        target_fact: attempt.targetFact,
        target_answer: attempt.targetAnswer,
        retrieval_prompt: attempt.retrievalPrompt,
        test_type: attempt.testType,
        response: attempt.response,
        is_correct: attempt.isCorrect,
        false_recall: attempt.falseRecall ?? false,
        confidence: attempt.confidence,
        response_time_ms: attempt.responseTimeMs,
        delay_interval: attempt.delayInterval,
        distractors: attempt.distractors ?? null,
        attempt_number: attempt.attemptNumber,
        tested_at: attempt.testedAt,
      })
      if (!error) migrated++
    } catch {
      // continue with next
    }
  }

  // Mark migration complete
  state.retrievalMigrated = true
  state.retrievalMigratedAt = new Date().toISOString()
  saveMigrationState(state)

  // Log migration event
  try {
    await supabase.from('data_migration_log').insert({
      user_id: userId,
      migration_type: 'retrieval_attempts',
      record_count: migrated,
      status: 'completed',
    })
  } catch {}

  return migrated
}

/**
 * Migrate local vault cards to Supabase.
 * Returns the number of records migrated.
 */
export async function migrateVaultCards(): Promise<number> {
  const userId = await getAuthUserId()
  if (!userId) return 0

  const state = loadMigrationState()
  if (state.vaultMigrated) return 0

  let cards: any[] = []
  try {
    const raw = localStorage.getItem('mnemonicflow_vault_v2')
    if (raw) { const p = JSON.parse(raw); cards = p?.cards ?? [] }
  } catch {}
  if (cards.length === 0) return 0

  let migrated = 0
  for (const card of cards) {
    try {
      const mnemonicId = `mn-${card.topic?.replace(/\s+/g, '-').toLowerCase()}`
      const { error } = await supabase.from('vault_cards').insert({
        user_id: userId,
        mnemonic_id: mnemonicId,
        card_data: card,
      })
      if (!error) migrated++
    } catch {}
  }

  state.vaultMigrated = true
  state.vaultMigratedAt = new Date().toISOString()
  saveMigrationState(state)

  try {
    await supabase.from('data_migration_log').insert({
      user_id: userId,
      migration_type: 'vault_cards',
      record_count: migrated,
      status: 'completed',
    })
  } catch {}

  return migrated
}

// ── FIX 13: Learner Profile Persistence ─────────────────────────────────────

import { LearnerProfile, AdaptiveSignal } from '../types'

/**
 * Persist the computed learner profile and strategy performance to Supabase.
 * Called after retrieval evidence changes. Fire-and-forget — failures are silent.
 */
export async function persistLearnerProfile(
  profile: LearnerProfile,
  signal: AdaptiveSignal | null,
): Promise<void> {
  const userId = await getAuthUserIdCached()
  if (!userId || !signal) return

  try {
    await supabase.from('learner_memory_profiles').upsert({
      user_id: userId,
      total_attempts: signal.totalAttempts ?? 0,
      strongest_strategies: signal.strongestStrategies ?? [],
      weakest_strategies: signal.weakestStrategies ?? [],
      confidence_calibration: signal.confidenceCalibration ?? null,
      subject_signals: signal.subjectSignals ?? [],
      fact_type_signals: signal.factTypeSignals ?? [],
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })

    // Upsert strategy performance rows from strongest strategies
    const allStrategies = [
      ...(signal.strongestStrategies ?? []),
      ...(signal.weakestStrategies ?? []),
    ]
    if (allStrategies.length > 0) {
      const rows = allStrategies.map(s => ({
        user_id: userId,
        strategy: s.strategy,
        accuracy: s.accuracy ?? 0,
        evidence_level: s.evidenceLevel ?? 'insufficient',
        updated_at: new Date().toISOString(),
      }))
      await supabase.from('learner_strategy_performance').upsert(rows, {
        onConflict: 'user_id,strategy',
      })
    }
  } catch {
    // Silently fail — localStorage-based aggregation still works
  }
}
