import { type ComponentType, lazy } from 'react'

const RELOADED_KEY = 'wp-reloaded-for-update'
/** A second failure this soon after reloading for one isn't a deploy: show the error instead of reloading again. */
const RETRY_AFTER = 60_000

/** A part of the app that couldn't be downloaded (offline, or gone after a deploy and still gone after a reload). */
export class LoadError extends Error {
  constructor(cause: unknown) {
    super(`Couldn’t load part of the app: ${cause instanceof Error ? cause.message : String(cause)}`, { cause })
    this.name = 'LoadError'
  }
}

/**
 * Loads a part of the app downloaded on first use. Each deploy replaces every file on the site, so a page opened
 * before it asks for files that are gone; then the page reloads, once, to get the new version (the pattern is kept in
 * the browser, so it comes back). The promise never settles while the page reloads, so the loader stays up.
 */
export async function loadPart<T>(load: () => Promise<T>): Promise<T> {
  try {
    return await load()
  } catch (e) {
    if (reloadOnce()) return new Promise<T>(() => {})
    throw new LoadError(e)
  }
}

function reloadOnce(): boolean {
  try {
    const last = Number(sessionStorage.getItem(RELOADED_KEY))
    if (last && Date.now() - last < RETRY_AFTER) return false
    sessionStorage.setItem(RELOADED_KEY, String(Date.now()))
  } catch {
    // Without storage a reload couldn't tell it had been tried, and might loop.
    return false
  }
  location.reload()
  return true
}

/** React.lazy for a module's default export, reloading for a new version as `loadPart` does. */
// biome-ignore lint/suspicious/noExplicitAny: React.lazy takes any component; each keeps its own prop types
export function lazyPart<C extends ComponentType<any>>(load: () => Promise<{ default: C }>) {
  return lazy(() => loadPart(load))
}

/** React.lazy for a named export (a dialog loaded the first time it's needed, keeping the main download small). */
// biome-ignore lint/suspicious/noExplicitAny: as above
export function lazyNamed<K extends string, C extends ComponentType<any>>(
  load: () => Promise<{ [k in K]: C }>,
  name: K,
) {
  return lazy(async () => ({ default: (await loadPart(load))[name] }))
}
