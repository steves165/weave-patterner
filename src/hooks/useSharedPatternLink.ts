import { useEffect, useRef } from 'react'
import { decodePattern, patternFromLink, SHARE_KEY, withoutParam } from '../share'
import type { Draft } from '../weave'

/**
 * Opens a pattern passed in the URL (`?pattern=…`, or `#pattern=…` in older links and from the MCP server) on load
 * and whenever the hash changes, then tidies the URL.
 */
export function useSharedPatternLink(onOpen: (name: string, draft: Draft) => void, onError: (message: string) => void) {
  // Keep the latest callbacks without re-subscribing.
  const handlers = useRef({ onOpen, onError })
  handlers.current = { onOpen, onError }

  useEffect(() => {
    const load = () => {
      const { pathname, search, hash } = window.location
      const data = patternFromLink(search, hash)
      if (!data) return
      decodePattern(data)
        .then(({ name, draft }) => handlers.current.onOpen(name, draft))
        .catch((e: Error) => handlers.current.onError(e.message))
        .finally(() => history.replaceState(null, '', withoutParam(SHARE_KEY, pathname, search, hash)))
    }
    load()
    window.addEventListener('hashchange', load)
    return () => window.removeEventListener('hashchange', load)
  }, [])
}
