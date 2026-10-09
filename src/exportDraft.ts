import { encodeBmp, indexColors } from './bmp'
import { computeDrawdown, type Draft, exportFile } from './weave'
import { toWif } from './wif'

export type ExportFormat = 'json' | 'wif' | 'liftplan'
export type ImageFormat = 'png' | 'svg' | 'bmp' | 'bmp-color'

/** A file-system-safe base name for a pattern. */
export const fileBase = (name: string | null) => (name ?? 'pattern').replace(/[\\/:*?"<>|]+/g, '_')

/** File name, contents and MIME type for exporting a draft. */
export function exportDraft(name: string | null, draft: Draft, format: ExportFormat) {
  const title = name ?? 'pattern'
  const base = fileBase(name)
  if (format === 'json')
    return { fileName: `${base}.weave.json`, content: exportFile(title, draft), type: 'application/json' }
  return {
    fileName: `${base}${format === 'liftplan' ? ' (liftplan)' : ''}.wif`,
    content: toWif(title, draft, { liftplan: format === 'liftplan' }),
    type: 'text/plain',
  }
}

/** Starts a browser download of `content`. */
export function download(fileName: string, content: string | Blob, type: string) {
  const url = URL.createObjectURL(content instanceof Blob ? content : new Blob([content], { type }))
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  a.click()
  URL.revokeObjectURL(url)
}

/**
 * The drawdown as a bitmap, one pixel per crossing, as on screen (pick 1 at the top; end 1 at the left, or the right
 * when the draft is drawn that way). `structure`: black where the warp is up and white where the weft is, for
 * jacquard looms. `colors`: the threads' colours.
 */
export function draftBitmap(draft: Draft, kind: 'structure' | 'colors', endOneRight = false): Uint8Array<ArrayBuffer> {
  const ends = Array.from({ length: draft.ends }, (_, i) => (endOneRight ? draft.ends - 1 - i : i))
  const rows = computeDrawdown(draft).map((row) => ends.map((e) => row[e]))
  if (kind === 'structure')
    return encodeBmp(
      rows.map((row) => row.map((up) => (up ? 1 : 0))),
      ['#ffffff', '#000000'],
    )
  const { pixels, palette } = indexColors(
    rows.map((row, pick) => row.map((up, i) => (up ? draft.warpColors[ends[i]] : draft.weftColors[pick]))),
  )
  // One colour alone still needs a two-colour palette.
  return encodeBmp(pixels, palette.length === 1 ? [...palette, '#000000'] : palette)
}
