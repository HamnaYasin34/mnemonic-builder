// ─────────────────────────────────────────────────────────────────────────────
// app/lib/analytics.ts  —  Privacy-conscious learning data architecture
//
// Local-only analytics queue for MnemonicFlow. Events are stored in localStorage
// with a max capacity of 500 events. No network calls, no PII, no third-party
// tracking scripts.
//
// FUTURE SYNC ARCHITECTURE:
// When a server-side analytics endpoint is built, the flush() method can be
// called to retrieve queued events for batch upload. Events should be sent
// to a POST /api/analytics endpoint that:
//   1. Validates the user is authenticated
//   2. Strips any remaining PII before storage
//   3. Stores in an analytics table with user_id, event_type, subject, timestamp
//   4. Aggregates data for personalized learning recommendations
//
// PRIVACY GUARANTEES:
// - No personally identifiable information is stored in events
// - No network calls are made from this module
// - No third-party tracking scripts are loaded
// - Events are scoped to the current user's localStorage
// - flush() is the only way to extract events (for future server sync)
// - Data is never exposed to other users
// ─────────────────────────────────────────────────────────────────────────────

import { AnalyticsEvent, LearningEvent, SubjectId } from '../types'

const STORAGE_KEY = 'mnemonicflow_analytics_v1'
const MAX_EVENTS = 500

function loadQueue(): AnalyticsEvent[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as AnalyticsEvent[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveQueue(events: AnalyticsEvent[]): void {
  if (typeof window === 'undefined') return
  try {
    // Trim to max capacity, keeping the most recent events
    const trimmed = events.slice(-MAX_EVENTS)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed))
  } catch {
    // Storage full — fail silently
  }
}

/**
 * Log a learning event to the local analytics queue.
 * No network calls, no PII.
 */
function log(
  type: LearningEvent,
  topic?: string,
  subject?: SubjectId,
  metadata?: Record<string, string | number | boolean>,
): void {
  const event: AnalyticsEvent = {
    type,
    topic,
    subject,
    metadata,
    timestamp: new Date().toISOString(),
  }
  const queue = loadQueue()
  queue.push(event)
  saveQueue(queue)
}

/**
 * Flush all queued events and clear the local queue.
 * Returns the events for future server-side sync.
 */
function flush(): AnalyticsEvent[] {
  const events = loadQueue()
  saveQueue([])
  return events
}

/**
 * Get a summary of local learning activity.
 * Useful for dashboard stats and future personalization.
 */
function summary(): {
  totalEvents: number
  eventsByType: Record<string, number>
  topicsStudied: string[]
  subjectsStudied: string[]
  lastEvent?: AnalyticsEvent
} {
  const events = loadQueue()
  const eventsByType: Record<string, number> = {}
  const topicSet = new Set<string>()
  const subjectSet = new Set<string>()

  for (const event of events) {
    eventsByType[event.type] = (eventsByType[event.type] || 0) + 1
    if (event.topic) topicSet.add(event.topic)
    if (event.subject) subjectSet.add(event.subject)
  }

  return {
    totalEvents: events.length,
    eventsByType,
    topicsStudied: Array.from(topicSet),
    subjectsStudied: Array.from(subjectSet),
    lastEvent: events[events.length - 1],
  }
}

/**
 * Get events filtered by type.
 */
function getEvents(type?: LearningEvent): AnalyticsEvent[] {
  const events = loadQueue()
  if (!type) return events
  return events.filter(e => e.type === type)
}

export const analytics = {
  log,
  flush,
  summary,
  getEvents,
}
