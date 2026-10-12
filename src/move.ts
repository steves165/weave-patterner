/**
 * Moving to weave-patterner.com from steves165.github.io/weave-patterner. Browsers keep saved data per site, so the
 * patterns and settings saved at the old address stay there. Every page under steves165.github.io shares that
 * storage, though, so a small page there (the mover, in the steves165/patterner-move repo; its source is
 * move/index.html) reads it and hands it to the app that opened it, which adds it in.
 */
import { MAX_PATTERNS } from './storage'

export const OLD_ORIGIN = 'https://steves165.github.io'
export const MOVER_URL = `${OLD_ORIGIN}/patterner-move/`
/** Where the apps live now. */
export const NEW_HOSTS = ['weave-patterner.com', 'www.weave-patterner.com']
/** The apps' pattern libraries (IndexedDB databases, each with a `patterns` store keyed by name). */
export const PATTERN_DBS = ['weave-patterner', 'knit-patterner', 'sew-patterner']
/** Remembers the offer was taken or turned down, so it isn't made again. */
export const MOVED_KEY = 'wp-moved'
/** Set to show the offer anywhere (for tests). */
export const OFFER_KEY = 'wp-move-offer'
/** What was brought over, for the notice after the reload. */
const DONE_KEY = 'wp-move-done'

export interface MoveData {
  type: 'patterner-move'
  version: 1
  /** localStorage items the apps own. */
  local: Record<string, string>
  /** Saved patterns, by database. */
  patterns: Record<string, { name: string; draft: unknown; updatedAt: number; preset?: boolean }[]>
}

export interface MoveResult {
  patterns: number
  renamed: number
  skipped: number
  settings: number
}

const safe = <T>(f: () => T, fallback: T): T => {
  try {
    return f()
  } catch {
    return fallback
  }
}

/** Whether the app is at its new address (or a test says so): the Load dialog then offers the move. */
export function onNewAddress(): boolean {
  if (typeof window === 'undefined') return false
  return NEW_HOSTS.includes(location.hostname) || safe(() => localStorage.getItem(OFFER_KEY) === '1', false)
}

/** Whether to offer bringing data over: on the new address, until it's been done or turned down. */
export const moveOffered = () => onNewAddress() && !safe(() => localStorage.getItem(MOVED_KEY), null)

export const dismissMove = () => safe(() => localStorage.setItem(MOVED_KEY, 'dismissed'), undefined)

/** The mover's message, if it is one. */
export function asMoveData(x: unknown): MoveData | null {
  const m = x as MoveData
  if (!m || typeof m !== 'object' || m.type !== 'patterner-move' || m.version !== 1) return null
  if (!m.local || typeof m.local !== 'object' || !m.patterns || typeof m.patterns !== 'object') return null
  return m
}

/** A name not in `taken`: "Name (old address)", then "Name (old address 2)" and so on. */
export function freeName(name: string, taken: Set<string>): string {
  for (let i = 1; ; i++) {
    const n = `${name} (old address${i > 1 ? ` ${i}` : ''})`
    if (!taken.has(n)) return n
  }
}

const promisify = <T>(req: IDBRequest<T>) =>
  new Promise<T>((resolve, reject) => {
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })

function openDb(name: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(name, 1)
    req.onupgradeneeded = () => req.result.createObjectStore('patterns', { keyPath: 'name' })
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

/**
 * Adds what the mover sent. Settings replace this address's (it has had little use yet); patterns are added beside
 * the ones here, keeping both when names clash (unless they're the same), up to MAX_PATTERNS.
 */
export async function applyMove(data: MoveData): Promise<MoveResult> {
  const result: MoveResult = { patterns: 0, renamed: 0, skipped: 0, settings: 0 }
  for (const [k, v] of Object.entries(data.local)) {
    if (typeof v !== 'string' || k === MOVED_KEY || k === OFFER_KEY || k === DONE_KEY) continue
    safe(() => {
      localStorage.setItem(k, v)
      result.settings++
    }, undefined)
  }
  for (const db of PATTERN_DBS) {
    const incoming = (data.patterns[db] ?? []).filter((p) => p && typeof p.name === 'string' && p.draft)
    if (!incoming.length) continue
    const conn = await openDb(db)
    try {
      const tx = conn.transaction('patterns', 'readwrite')
      const store = tx.objectStore('patterns')
      const here = (await promisify(store.getAll())) as { name: string; draft: unknown }[]
      const byName = new Map(here.map((p) => [p.name, p]))
      const taken = new Set(byName.keys())
      let count = here.length
      for (const p of incoming) {
        const same = byName.get(p.name)
        if (same && JSON.stringify(same.draft) === JSON.stringify(p.draft)) continue
        if (count >= MAX_PATTERNS) {
          result.skipped++
          continue
        }
        const name = same ? freeName(p.name, taken) : p.name
        if (same) result.renamed++
        taken.add(name)
        await promisify(
          store.put({
            name,
            draft: p.draft,
            updatedAt: Number(p.updatedAt) || Date.now(),
            ...(p.preset ? { preset: true } : {}),
          }),
        )
        count++
        result.patterns++
      }
      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve()
        tx.onerror = tx.onabort = () => reject(tx.error ?? new Error('Could not save the patterns'))
      })
    } finally {
      conn.close()
    }
  }
  safe(() => localStorage.setItem(MOVED_KEY, 'done'), undefined)
  return result
}

/**
 * Opens the mover in a new tab or window (from a click, so it isn't blocked), waits for what it sends, adds it and
 * reloads the page to show it. Fails if the window can't open or nothing arrives.
 */
export function bringOver(timeoutMs = 60_000): Promise<MoveResult> {
  return new Promise((resolve, reject) => {
    const win = window.open(MOVER_URL, 'patterner-move')
    if (!win) {
      reject(new Error('Your browser blocked the window. Allow pop-ups for this site and try again.'))
      return
    }
    const timer = window.setTimeout(() => {
      window.removeEventListener('message', onMessage)
      reject(new Error('Nothing came from the old address. Try again, or check you saved patterns there.'))
    }, timeoutMs)
    async function onMessage(e: MessageEvent) {
      if (e.origin !== OLD_ORIGIN || e.source !== win) return
      const data = asMoveData(e.data)
      if (!data) return
      window.removeEventListener('message', onMessage)
      window.clearTimeout(timer)
      try {
        const r = await applyMove(data)
        safe(() => sessionStorage.setItem(DONE_KEY, JSON.stringify(r)), undefined)
        resolve(r)
        location.reload()
      } catch (err) {
        reject(err instanceof Error ? err : new Error(String(err)))
      }
    }
    window.addEventListener('message', onMessage)
  })
}

/** What was just brought over, once (shown after the reload). */
export function takeMoveResult(): MoveResult | null {
  return safe(() => {
    const v = sessionStorage.getItem(DONE_KEY)
    sessionStorage.removeItem(DONE_KEY)
    return v ? (JSON.parse(v) as MoveResult) : null
  }, null)
}

/** "Brought over 3 patterns and your settings." */
export function describeMove(r: MoveResult): string {
  const n = r.patterns
  const parts = [
    n ? `Brought over ${n} pattern${n === 1 ? '' : 's'}` : 'No new patterns to bring over',
    r.settings ? 'and your settings' : '',
  ].filter(Boolean)
  let s = `${parts.join(' ')}.`
  if (r.renamed) s += ` ${r.renamed} with names already used here end in “(old address)”.`
  if (r.skipped) s += ` ${r.skipped} didn’t fit: you can keep up to ${MAX_PATTERNS} patterns.`
  return s
}
