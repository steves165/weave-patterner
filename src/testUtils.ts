import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { computeDrawdown, type Draft, defaultDraft, importFile, resizeDraft } from './weave'

/** The bundled sample, a 96 × 96 four-shaft draft. */
export const greenBlocks = (): Draft =>
  importFile(readFileSync(fileURLToPath(new URL('../samples/Green blocks.weave.json', import.meta.url)), 'utf8')).draft

/** A draft exercising the awkward cases: unthreaded end, empty pick, several treadles at once, mixed colours. */
export function edgeCaseDraft(): Draft {
  const d = resizeDraft(defaultDraft(), { shafts: 8, treadles: 6, ends: 20, picks: 12 })
  d.threading[3] = -1
  d.treadling[2] = d.treadling[2].map(() => false)
  d.treadling[5] = d.treadling[5].map((_, t) => t < 3)
  d.warpColors[7] = '#123abc'
  d.weftColors[4] = '#ffaa00'
  return d
}

/** Drawdown as rows of '#' (warp up) and '.' (weft up), for readable assertions. */
export const ascii = (d: Draft) => computeDrawdown(d).map((row) => row.map((up) => (up ? '#' : '.')).join(''))
