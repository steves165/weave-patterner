import { type Draft, parseDraft } from './weave'

/** Hash key for a pattern embedded in the app URL: `…/#pattern=<data>`. */
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

/** Compresses a pattern into a URL-safe string (works in browsers and Node 20+). */
export async function encodePattern(name: string, draft: Draft): Promise<string> {
  const json = JSON.stringify({ name, draft })
  return toBase64Url(await pipe(new TextEncoder().encode(json), new CompressionStream('deflate-raw')))
}

export async function decodePattern(data: string): Promise<{ name: string; draft: Draft }> {
  let parsed: { name?: unknown; draft?: unknown }
  try {
    const bytes = await pipe(fromBase64Url(data), new DecompressionStream('deflate-raw'))
    parsed = JSON.parse(new TextDecoder().decode(bytes))
  } catch {
    throw new Error('The pattern link is damaged or incomplete')
  }
  return {
    name: typeof parsed.name === 'string' ? parsed.name : 'Shared pattern',
    draft: parseDraft(parsed.draft),
  }
}

export async function patternUrl(name: string, draft: Draft, base = APP_URL): Promise<string> {
  return `${base}#${SHARE_KEY}=${await encodePattern(name, draft)}`
}

/** The encoded pattern in a URL hash, if there is one. */
export function patternFromHash(hash: string): string | null {
  return new URLSearchParams(hash.replace(/^#/, '')).get(SHARE_KEY)
}
