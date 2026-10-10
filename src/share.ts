import type { AppId } from './brands'
import { type Draft, parseDraft } from './weave'

/**
 * Key for a pattern embedded in the app URL: `…/?pattern=<data>`. A query rather than a hash, so a server could read
 * it (to show the design in link previews); older links put it in the hash (`#pattern=`), and still open.
 */
export const SHARE_KEY = 'pattern'
export const APP_URL = 'https://steves165.github.io/weave-patterner/'

const toBase64Url = (bytes: Uint8Array) => {
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

const fromBase64Url = (s: string) => {
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(bin, (c) => c.charCodeAt(0))
}

const pipe = async (bytes: Uint8Array, stream: CompressionStream | DecompressionStream) =>
  new Uint8Array(await new Response(new Blob([bytes as BlobPart]).stream().pipeThrough(stream)).arrayBuffer())

/** Compresses a value as JSON into a URL-safe string (works in browsers and Node 20+). */
export async function packJson(value: unknown): Promise<string> {
  const json = JSON.stringify(value)
  return toBase64Url(await pipe(new TextEncoder().encode(json), new CompressionStream('deflate-raw')))
}

/** The value packJson packed, or an error saying the link is damaged. */
export async function unpackJson(data: string, what = 'pattern'): Promise<unknown> {
  try {
    const bytes = await pipe(fromBase64Url(data), new DecompressionStream('deflate-raw'))
    return JSON.parse(new TextDecoder().decode(bytes))
  } catch {
    throw new Error(`The ${what} link is damaged or incomplete`)
  }
}

/** Compresses a pattern into a URL-safe string. */
export const encodePattern = (name: string, draft: Draft) => packJson({ name, draft })

export async function decodePattern(data: string): Promise<{ name: string; draft: Draft }> {
  const parsed = (await unpackJson(data)) as { name?: unknown; draft?: unknown } | null
  return {
    name: typeof parsed?.name === 'string' ? parsed.name : 'Shared pattern',
    draft: parseDraft(parsed?.draft),
  }
}

export async function patternUrl(name: string, draft: Draft, base = APP_URL): Promise<string> {
  return `${base}?${SHARE_KEY}=${await encodePattern(name, draft)}`
}

/** A value passed in a link: in the query (`?key=`), or the hash (`#key=`) as older links had it. */
export function linkParam(key: string, search: string, hash = ''): string | null {
  return new URLSearchParams(search).get(key) ?? new URLSearchParams(hash.replace(/^#/, '')).get(key)
}

/** The address without `keys` in its query or hash, to tidy the URL once the link has been opened. */
export function withoutParam(keys: string | string[], pathname: string, search: string, hash = ''): string {
  const drop = typeof keys === 'string' ? [keys] : keys
  const query = new URLSearchParams(search)
  const fragment = new URLSearchParams(hash.replace(/^#/, ''))
  const hashHad = drop.some((k) => fragment.has(k))
  for (const k of drop) {
    query.delete(k)
    fragment.delete(k)
  }
  const q = query.toString()
  const h = hashHad ? fragment.toString() : hash.replace(/^#/, '')
  return `${pathname}${q ? `?${q}` : ''}${h ? `#${h}` : ''}`
}

/** The encoded pattern in a URL's query or hash, if there is one. */
export const patternFromLink = (search: string, hash = '') => linkParam(SHARE_KEY, search, hash)

export const APP_NAMES: Record<AppId, string> = {
  weave: 'Weave Patterner',
  knit: 'Knit Patterner',
  sew: 'Sew Patterner',
}
const WHAT: Record<AppId, string> = { weave: 'a weaving draft', knit: 'a knitting chart', sew: 'a sewing pattern' }
/** Where each app lives, from the site root. */
export const APP_PATHS: Record<AppId, string> = { weave: '', knit: 'knit/', sew: 'sew/' }

/** Links that open each site's own share page with the design's link filled in. */
export function shareLinks(app: AppId, title: string, link: string) {
  const e = encodeURIComponent
  const text = `${title}: ${WHAT[app]} I made with ${APP_NAMES[app]}`
  // Pinterest pins a picture at a public address: the app's own picture (the design is only in this browser).
  const picture = `${APP_URL}${APP_PATHS[app]}og-image.png`
  return {
    text,
    pinterest: `https://www.pinterest.com/pin/create/button/?url=${e(link)}&media=${e(picture)}&description=${e(text)}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${e(link)}`,
    x: `https://x.com/intent/post?text=${e(text)}&url=${e(link)}`,
    whatsapp: `https://wa.me/?text=${e(`${text} ${link}`)}`,
    email: `mailto:?subject=${e(title)}&body=${e(`${text}:\n\n${link}`)}`,
  }
}
