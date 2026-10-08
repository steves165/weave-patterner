import { type Draft, exportFile } from './weave'
import { toWif } from './wif'

export type ExportFormat = 'json' | 'wif' | 'liftplan'
export type ImageFormat = 'png' | 'svg'

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
