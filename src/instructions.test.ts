import { describe, expect, it } from 'vitest'
import { liftplanLines, threadingLines, tieupLines, treadlingLines } from './instructions'
import { edgeCaseDraft } from './testUtils'
import { defaultDraft } from './weave'

describe('written instructions', () => {
  it('lists the threading in numbered lines', () => {
    expect(threadingLines(defaultDraft(), 8).slice(0, 2)).toEqual([
      'Ends 1–8: 1 2 3 4 1 2 3 4',
      'Ends 9–16: 1 2 3 4 1 2 3 4',
    ])
    expect(threadingLines(defaultDraft(), 16)).toHaveLength(2)
  })

  it('marks empty ends and picks, and joins treadles pressed together', () => {
    const d = edgeCaseDraft()
    expect(threadingLines(d, 4)[0]).toBe('Ends 1–4: 1 2 3 –')
    expect(treadlingLines(d, 6)[0]).toBe('Picks 1–6: 1 2 – 4 5 1+2+3')
  })

  it('gives shafts per pick for dobby looms and the tie-up per treadle', () => {
    expect(liftplanLines(defaultDraft(), 4)[0]).toBe('Picks 1–4: 1+2 2+3 3+4 1+4')
    expect(tieupLines(defaultDraft())[0]).toBe('Treadle 1: shafts 1, 2')
  })

  it('handles a final line with a single thread', () => {
    const d = defaultDraft()
    expect(threadingLines({ ...d, threading: d.threading.slice(0, 17) }, 16)[1]).toBe('Ends 17: 1')
  })
})
