import type { Draft } from './weave'

export const MAX_PATTERNS = 200

export interface SavedPattern {
  name: string
  draft: Draft
  updatedAt: number
}

const DB_NAME = 'weave-patterner'
const STORE = 'patterns'

let dbPromise: Promise<IDBDatabase> | null = null

function openDb(): Promise<IDBDatabase> {
  dbPromise ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'name' })
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => {
      dbPromise = null
      reject(req.error)
    }
  })
  return dbPromise
}

const promisify = <T,>(req: IDBRequest<T>) =>
  new Promise<T>((resolve, reject) => {
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })

async function withStore<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => Promise<T>): Promise<T> {
  const tx = (await openDb()).transaction(STORE, mode)
  const done = new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = tx.onabort = () => reject(tx.error ?? new Error('Transaction aborted'))
  })
  const result = await fn(tx.objectStore(STORE))
  await done
  return result
}

/** All saved patterns, most recently updated first. */
export async function listPatterns(): Promise<SavedPattern[]> {
  const all = await withStore('readonly', (s) => promisify(s.getAll() as IDBRequest<SavedPattern[]>))
  return all.sort((a, b) => b.updatedAt - a.updatedAt)
}

/** Saves under `name`, overwriting any pattern already using it. Fails if this would exceed MAX_PATTERNS. */
export function savePattern(name: string, draft: Draft): Promise<void> {
  return withStore('readwrite', async (s) => {
    const exists = (await promisify(s.getKey(name))) !== undefined
    if (!exists && (await promisify(s.count())) >= MAX_PATTERNS)
      throw new Error(`You can save up to ${MAX_PATTERNS} patterns. Delete one to make room.`)
    await promisify(s.put({ name, draft, updatedAt: Date.now() } satisfies SavedPattern))
  })
}

export function deletePattern(name: string): Promise<void> {
  return withStore('readwrite', async (s) => {
    await promisify(s.delete(name))
  })
}

export function renamePattern(from: string, to: string): Promise<void> {
  return withStore('readwrite', async (s) => {
    if ((await promisify(s.getKey(to))) !== undefined) throw new Error(`A pattern called "${to}" already exists`)
    const p = (await promisify(s.get(from))) as SavedPattern | undefined
    if (!p) throw new Error(`Pattern "${from}" no longer exists`)
    await promisify(s.put({ ...p, name: to }))
    await promisify(s.delete(from))
  })
}

/** The next unused "Pattern N" name. */
export function nextPatternName(existing: string[]): string {
  const nums = existing.map((n) => /^Pattern (\d+)$/.exec(n)?.[1]).filter(Boolean).map(Number)
  return `Pattern ${Math.max(0, ...nums) + 1}`
}
