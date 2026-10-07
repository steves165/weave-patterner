import { describe, expect, it } from 'vitest'
import { createHistory, HISTORY_LIMIT, record, redo, undo } from './history'

describe('history', () => {
  it('undoes and redoes steps in order', () => {
    let h = createHistory('a')
    h = record(h, 'b')
    h = record(h, 'c')
    h = undo(h)
    expect(h.present).toBe('b')
    h = undo(h)
    expect(h.present).toBe('a')
    expect(undo(h)).toBe(h) // nothing left to undo
    h = redo(redo(h))
    expect(h.present).toBe('c')
    expect(redo(h)).toBe(h)
  })

  it('drops the redo stack when a new step is recorded', () => {
    const h = record(undo(record(createHistory(1), 2)), 3)
    expect(h).toEqual({ past: [1], present: 3, future: [] })
  })

  it('merges a stroke into one step', () => {
    let h = record(createHistory('start'), 'cell 1')
    h = record(h, 'cells 1-2', true)
    h = record(h, 'cells 1-3', true)
    expect(h.present).toBe('cells 1-3')
    expect(undo(h).present).toBe('start')
  })

  it('ignores recording the same value', () => {
    const h = createHistory({ x: 1 })
    expect(record(h, h.present)).toBe(h)
  })

  it(`keeps at most ${HISTORY_LIMIT} undo steps`, () => {
    let h = createHistory(0)
    for (let i = 1; i <= HISTORY_LIMIT + 50; i++) h = record(h, i)
    expect(h.past).toHaveLength(HISTORY_LIMIT)
    expect(h.past[0]).toBe(50)
  })
})
