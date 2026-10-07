import { describe, expect, it } from 'vitest'
import { exportDraft } from './exportDraft'
import { defaultDraft, importFile } from './weave'
import { fromWif } from './wif'

describe('exportDraft', () => {
  it('names files after the pattern, replacing characters file systems reject', () => {
    expect(exportDraft('Runner: v2/3?', defaultDraft(), 'json').fileName).toBe('Runner_ v2_3_.weave.json')
    expect(exportDraft(null, defaultDraft(), 'wif').fileName).toBe('pattern.wif')
    expect(exportDraft('Runner', defaultDraft(), 'liftplan').fileName).toBe('Runner (liftplan).wif')
  })

  it('produces files that read back as the same draft', () => {
    const d = defaultDraft()
    const json = exportDraft('R', d, 'json')
    expect(json.type).toBe('application/json')
    expect(importFile(json.content)).toEqual({ name: 'R', draft: d })
    const wif = exportDraft('R', d, 'wif')
    expect(wif.type).toBe('text/plain')
    expect(fromWif(wif.content).draft).toEqual(d)
    expect(exportDraft('R', d, 'liftplan').content).toContain('[LIFTPLAN]')
  })
})
