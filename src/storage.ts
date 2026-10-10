import type { Draft } from './weave'

export const MAX_PATTERNS = 200

/** A pattern saved in the browser: a weaving draft, or (in Knit Patterner) a knitting chart. */
export interface Saved<T> {
  name: string
  draft: T
  updatedAt: number
  /** Offered as a preset, beside the built-in ones (weaving drafts). */
  preset?: boolean
}
export type SavedPattern = Saved<Draft>

/** The saving and loading a pattern library needs, whatever kind of pattern it holds. */
export interface PatternStore<T> {
  listPatterns: () => Promise<Saved<T>[]>
  savePattern: (name: string, draft: T) => Promise<void>
  deletePattern: (name: string) => Promise<void>
  renamePattern: (from: string, to: string) => Promise<void>
  /** Marks a pattern to be offered as a preset, or not. */
  setPreset: (name: string, preset: boolean) => Promise<void>
}

const STORE = 'patterns'

const promisify = <T>(req: IDBRequest<T>) =>
  new Promise<T>((resolve, reject) => {
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })

/** Named patterns kept in the browser's IndexedDB database `dbName`, up to MAX_PATTERNS of them. */
export function patternStore<T>(dbName: string): PatternStore<T> {
  let dbPromise: Promise<IDBDatabase> | null = null

  function openDb(): Promise<IDBDatabase> {
    dbPromise ??= new Promise((resolve, reject) => {
      const req = indexedDB.open(dbName, 1)
      req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'name' })
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => {
        dbPromise = null
        reject(req.error)
      }
    })
    return dbPromise
  }

  async function withStore<R>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => Promise<R>): Promise<R> {
    const tx = (await openDb()).transaction(STORE, mode)
    const done = new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve()
      tx.onerror = tx.onabort = () => reject(tx.error ?? new Error('Transaction aborted'))
    })
    const result = await fn(tx.objectStore(STORE))
    await done
    return result
  }

  return {
    /** All saved patterns, most recently updated first. */
    async listPatterns() {
      const all = await withStore('readonly', (s) => promisify(s.getAll() as IDBRequest<Saved<T>[]>))
      return all.sort((a, b) => b.updatedAt - a.updatedAt)
    },
    /** Saves under `name`, overwriting any pattern already using it. Fails if this would exceed MAX_PATTERNS. */
    savePattern: (name, draft) =>
      withStore('readwrite', async (s) => {
        const exists = (await promisify(s.getKey(name))) !== undefined
        if (!exists && (await promisify(s.count())) >= MAX_PATTERNS)
          throw new Error(`You can save up to ${MAX_PATTERNS} patterns. Delete one to make room.`)
        // Saving over a pattern keeps it a preset if it was one.
        const old = exists ? ((await promisify(s.get(name))) as Saved<T> | undefined) : undefined
        await promisify(
          s.put({ name, draft, updatedAt: Date.now(), ...(old?.preset ? { preset: true } : {}) } satisfies Saved<T>),
        )
      }),
    deletePattern: (name) =>
      withStore('readwrite', async (s) => {
        await promisify(s.delete(name))
      }),
    renamePattern: (from, to) =>
      withStore('readwrite', async (s) => {
        if ((await promisify(s.getKey(to))) !== undefined) throw new Error(`A pattern called "${to}" already exists`)
        const p = (await promisify(s.get(from))) as Saved<T> | undefined
        if (!p) throw new Error(`Pattern "${from}" no longer exists`)
        await promisify(s.put({ ...p, name: to }))
        await promisify(s.delete(from))
      }),
    setPreset: (name, preset) =>
      withStore('readwrite', async (s) => {
        const p = (await promisify(s.get(name))) as Saved<T> | undefined
        if (!p) throw new Error(`Pattern "${name}" no longer exists`)
        const { preset: _, ...rest } = p
        await promisify(s.put(preset ? { ...rest, preset: true } : rest))
      }),
  }
}

/** Weave Patterner's saved drafts. */
export const weaveStore = patternStore<Draft>('weave-patterner')
export const { listPatterns, savePattern, deletePattern, renamePattern } = weaveStore

/** The next unused "Pattern N" name. */
export function nextPatternName(existing: string[]): string {
  const nums = existing
    .map((n) => /^Pattern (\d+)$/.exec(n)?.[1])
    .filter(Boolean)
    .map(Number)
  return `Pattern ${Math.max(0, ...nums) + 1}`
}
