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
/** What was brought over or restored, for the notice after the reload. */
const DONE_KEY = 'wp-move-done'

/** The localStorage items the apps own (the mover page keeps a copy of this list). */
const OWN_PREFIXES = ['weave-', 'wp-', 'knit-', 'sew-', 'thread-progress:']
const OWN_EXTRA = ['mui-mode']
/** Never carried over: the analytics choice (asked again) and the move's own state. */
const NOT_CARRIED = ['weave-analytics-consent', MOVED_KEY, OFFER_KEY, DONE_KEY]
/** The pattern being worked on in each app: moved to the new address, but not in backups (so a restore keeps it). */
const WORKING = ['weave-current', 'knit-current', 'sew-current']

/** Whether a localStorage item is the apps' own, to carry to another address (`working`) or device. */
export const carried = (key: string, working = false) =>
  !NOT_CARRIED.includes(key) &&
  (working || !WORKING.includes(key)) &&
  (OWN_EXTRA.includes(key) || OWN_PREFIXES.some((p) => key.startsWith(p)))

export interface MoveData {
  type: 'patterner-move'
  version: 1
  /** localStorage items the apps own. */
  local: Record<string, string>
  /** Saved patterns, by database. */
  patterns: Record<string, { name: string; draft: unknown; updatedAt: number; preset?: boolean }[]>
}

export interface MoveResult {
  /** Brought from the old address, or restored from a backup file. */
  kind: 'move' | 'backup'
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

/** Whether patterns have been brought over from the old address already. */
export const moved = () => safe(() => localStorage.getItem(MOVED_KEY) === 'done', false)

/** The mover's message, if it is one. */
export function asMoveData(x: unknown): MoveData | null {
  const m = x as MoveData
  if (!m || typeof m !== 'object' || m.type !== 'patterner-move' || m.version !== 1) return null
  if (!m.local || typeof m.local !== 'object' || !m.patterns || typeof m.patterns !== 'object') return null
  return m
}

/** A name not in `taken`: "Name (old address)", then "Name (old address 2)" and so on. */
export function freeName(name: string, taken: Set<string>, from = 'old address'): string {
  for (let i = 1; ; i++) {
    const n = `${name} (${from}${i > 1 ? ` ${i}` : ''})`
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
 * Adds what the mover sent, or a backup holds. Settings replace the ones here (unless `settings` is false); patterns
 * are added beside the ones here, keeping both when names clash (unless they're the same), up to MAX_PATTERNS.
 */
export async function applyMove(
  data: MoveData,
  { kind = 'move', settings = true }: { kind?: MoveResult['kind']; settings?: boolean } = {},
): Promise<MoveResult> {
  const result: MoveResult = { kind, patterns: 0, renamed: 0, skipped: 0, settings: 0 }
  for (const [k, v] of Object.entries(settings ? data.local : {})) {
    if (typeof v !== 'string' || !carried(k, kind === 'move')) continue
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
        // Already here, under its own name or as a copy an earlier move or restore made ("Name (from backup)").
        const json = JSON.stringify(p.draft)
        const copies = here.filter((h) => h.name === p.name || h.name.startsWith(`${p.name} (`))
        if (copies.some((h) => JSON.stringify(h.draft) === json)) continue
        if (count >= MAX_PATTERNS) {
          result.skipped++
          continue
        }
        const name = same ? freeName(p.name, taken, kind === 'backup' ? 'from backup' : 'old address') : p.name
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
  if (kind === 'move') safe(() => localStorage.setItem(MOVED_KEY, 'done'), undefined)
  return result
}

/** Everything the apps keep in this browser: every app's saved patterns, and their settings. */
export async function collectBundle(): Promise<MoveData> {
  const local: Record<string, string> = {}
  safe(() => {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      const v = k === null ? null : localStorage.getItem(k)
      if (k !== null && v !== null && carried(k)) local[k] = v
    }
  }, undefined)
  const patterns: MoveData['patterns'] = {}
  for (const db of PATTERN_DBS) {
    const conn = await openDb(db)
    try {
      patterns[db] = await promisify(conn.transaction('patterns').objectStore('patterns').getAll())
    } finally {
      conn.close()
    }
  }
  return { type: 'patterner-move', version: 1, local, patterns }
}

/** Shows what came in: the page reloads (the apps read their settings as they start), then says so. */
export function reloadWith(r: MoveResult) {
  safe(() => sessionStorage.setItem(DONE_KEY, JSON.stringify(r)), undefined)
  location.reload()
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
        resolve(r)
        reloadWith(r)
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
  const backup = r.kind === 'backup'
  const parts = [
    n
      ? `${backup ? 'Restored' : 'Brought over'} ${n} pattern${n === 1 ? '' : 's'}`
      : `No new patterns to ${backup ? 'restore' : 'bring over'}`,
    r.settings ? 'and your settings' : '',
  ].filter(Boolean)
  let s = `${parts.join(' ')}.`
  if (r.renamed) s += ` ${r.renamed} with names already used here end in “(${backup ? 'from backup' : 'old address'})”.`
  if (r.skipped) s += ` ${r.skipped} didn’t fit: you can keep up to ${MAX_PATTERNS} patterns.`
  return s
}
