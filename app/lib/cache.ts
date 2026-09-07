// ─────────────────────────────────────────────────────────────────────────────
// app/lib/cache.ts
// localStorage-based caching for AI-generated guides and quizzes.
// Pattern: Generate → Cache → Reuse (avoid redundant API calls).
// ─────────────────────────────────────────────────────────────────────────────

import { HighYieldGuide, QuizSet, ExaminerSession, SimulationSession } from '../types'

const GUIDE_CACHE_KEY = 'mnemonicflow_guide_cache'
const QUIZ_CACHE_KEY = 'mnemonicflow_quiz_cache'
const EXAMINER_CACHE_KEY = 'mnemonicflow_examiner_cache'
const SIMULATION_CACHE_KEY = 'mnemonicflow_simulation_cache'

/** Normalize topic string for consistent cache keys */
function normalizeKey(topic: string): string {
  return topic.trim().toLowerCase().replace(/\s+/g, '_')
}

interface CacheEntry<T> {
  data: T
  cachedAt: string
}

function loadCache<T>(key: string): Record<string, CacheEntry<T>> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return typeof parsed === 'object' && parsed !== null ? parsed : {}
  } catch {
    return {}
  }
}

function saveCache<T>(key: string, cache: Record<string, CacheEntry<T>>): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(key, JSON.stringify(cache))
  } catch {
    // storage full — try evicting oldest entries
    const entries = Object.entries(cache)
    if (entries.length > 1) {
      entries.sort((a, b) => new Date(a[1].cachedAt).getTime() - new Date(b[1].cachedAt).getTime())
      const trimmed = Object.fromEntries(entries.slice(Math.floor(entries.length / 2)))
      try {
        window.localStorage.setItem(key, JSON.stringify(trimmed))
      } catch {
        // still fails — give up silently
      }
    }
  }
}

// ── Guide Cache ──

export function getCachedGuide(topic: string): HighYieldGuide | null {
  const cache = loadCache<HighYieldGuide>(GUIDE_CACHE_KEY)
  const entry = cache[normalizeKey(topic)]
  return entry?.data ?? null
}

export function setCachedGuide(topic: string, guide: HighYieldGuide): void {
  const cache = loadCache<HighYieldGuide>(GUIDE_CACHE_KEY)
  cache[normalizeKey(topic)] = { data: guide, cachedAt: new Date().toISOString() }
  saveCache(GUIDE_CACHE_KEY, cache)
}

export function getAllCachedGuides(): HighYieldGuide[] {
  const cache = loadCache<HighYieldGuide>(GUIDE_CACHE_KEY)
  return Object.values(cache).map(e => e.data)
}

// ── Quiz Cache ──

export function getCachedQuiz(topic: string): QuizSet | null {
  const cache = loadCache<QuizSet>(QUIZ_CACHE_KEY)
  const entry = cache[normalizeKey(topic)]
  return entry?.data ?? null
}

export function setCachedQuiz(topic: string, quiz: QuizSet): void {
  const cache = loadCache<QuizSet>(QUIZ_CACHE_KEY)
  cache[normalizeKey(topic)] = { data: quiz, cachedAt: new Date().toISOString() }
  saveCache(QUIZ_CACHE_KEY, cache)
}

export function getAllCachedQuizzes(): QuizSet[] {
  const cache = loadCache<QuizSet>(QUIZ_CACHE_KEY)
  return Object.values(cache).map(e => e.data)
}

// ── Examiner Session Cache ──

export function getCachedExaminerSession(topic: string): ExaminerSession | null {
  const cache = loadCache<ExaminerSession>(EXAMINER_CACHE_KEY)
  const entry = cache[normalizeKey(topic)]
  return entry?.data ?? null
}

export function setCachedExaminerSession(topic: string, session: ExaminerSession): void {
  const cache = loadCache<ExaminerSession>(EXAMINER_CACHE_KEY)
  cache[normalizeKey(topic)] = { data: session, cachedAt: new Date().toISOString() }
  saveCache(EXAMINER_CACHE_KEY, cache)
}

// ── Simulation Session Cache ──

export function getCachedSimulationSession(topic: string): SimulationSession | null {
  const cache = loadCache<SimulationSession>(SIMULATION_CACHE_KEY)
  const entry = cache[normalizeKey(topic)]
  return entry?.data ?? null
}

export function setCachedSimulationSession(topic: string, session: SimulationSession): void {
  const cache = loadCache<SimulationSession>(SIMULATION_CACHE_KEY)
  cache[normalizeKey(topic)] = { data: session, cachedAt: new Date().toISOString() }
  saveCache(SIMULATION_CACHE_KEY, cache)
}
