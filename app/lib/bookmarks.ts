// ─────────────────────────────────────────────────────────────────────────────
// app/lib/bookmarks.ts
// Lightweight localStorage-based bookmark system for guides, quizzes, and MCQs.
// ─────────────────────────────────────────────────────────────────────────────

import { Bookmark, BookmarkType, SubjectId } from '../types'

const BOOKMARK_KEY = 'mnemonicflow_bookmarks'

function loadRaw(): Bookmark[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(BOOKMARK_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveRaw(bookmarks: Bookmark[]): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(BOOKMARK_KEY, JSON.stringify(bookmarks))
  } catch {
    // storage full or unavailable — fail silently
  }
}

function uid(): string {
  return `bm_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

export const bookmarks = {
  load(): Bookmark[] {
    return loadRaw()
  },

  add(type: BookmarkType, itemId: string, topic: string, subject: SubjectId): Bookmark {
    const all = loadRaw()
    // Prevent duplicates
    const existing = all.find(b => b.type === type && b.itemId === itemId)
    if (existing) return existing

    const bm: Bookmark = {
      id: uid(),
      type,
      itemId,
      topic,
      subject,
      createdAt: new Date().toISOString(),
    }
    all.unshift(bm)
    saveRaw(all)
    return bm
  },

  remove(bookmarkId: string): void {
    const all = loadRaw()
    saveRaw(all.filter(b => b.id !== bookmarkId))
  },

  removeByItem(type: BookmarkType, itemId: string): void {
    const all = loadRaw()
    saveRaw(all.filter(b => !(b.type === type && b.itemId === itemId)))
  },

  toggle(type: BookmarkType, itemId: string, topic: string, subject: SubjectId): boolean {
    const all = loadRaw()
    const idx = all.findIndex(b => b.type === type && b.itemId === itemId)
    if (idx !== -1) {
      all.splice(idx, 1)
      saveRaw(all)
      return false // now unbookmarked
    }
    const bm: Bookmark = {
      id: uid(),
      type,
      itemId,
      topic,
      subject,
      createdAt: new Date().toISOString(),
    }
    all.unshift(bm)
    saveRaw(all)
    return true // now bookmarked
  },

  isBookmarked(type: BookmarkType, itemId: string): boolean {
    return loadRaw().some(b => b.type === type && b.itemId === itemId)
  },

  query(filter: { type?: BookmarkType; subject?: SubjectId }): Bookmark[] {
    let all = loadRaw()
    if (filter.type) all = all.filter(b => b.type === filter.type)
    if (filter.subject) all = all.filter(b => b.subject === filter.subject)
    return all
  },

  clear(): void {
    saveRaw([])
  },
}
