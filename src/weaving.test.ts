import { beforeEach, describe, expect, it } from 'vitest'
import { greenBlocks } from './testUtils'
import { defaultDraft } from './weave'
import {
  endInfo,
  heddleCounts,
  loadProgress,
  loadThreadProgress,
  pickInfo,
  saveProgress,
  saveThreadProgress,
  step,
  weftChanges,
} from './weaving'

describe('pickInfo', () => {
  it('gives the treadle, lifted shafts and weft colour for a pick', () => {
    expect(pickInfo(defaultDraft(), 0)).toEqual({ treadles: [1], shafts: [1, 2], color: '#ffd3e4' })
    expect(pickInfo(greenBlocks(), 0).treadles).toEqual([1])
  })

  it('combines several treadles', () => {
    const d = defaultDraft()
    d.treadling[0] = [true, false, true, false]
    expect(pickInfo(d, 0)).toMatchObject({ treadles: [1, 3], shafts: [1, 2, 3, 4] })
  })
})

describe('step', () => {
  it('moves through picks and counts repeats', () => {
    expect(step({ pick: 0, repeat: 0 }, 4, 1)).toEqual({ pick: 1, repeat: 0 })
    expect(step({ pick: 3, repeat: 0 }, 4, 1)).toEqual({ pick: 0, repeat: 1 })
    expect(step({ pick: 0, repeat: 1 }, 4, -1)).toEqual({ pick: 3, repeat: 0 })
    expect(step({ pick: 0, repeat: 0 }, 4, -1)).toEqual({ pick: 0, repeat: 0 })
  })
})

describe('progress storage', () => {
  const store = new Map<string, string>()
  beforeEach(() => {
    store.clear()
    globalThis.localStorage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
    } as Storage
  })

  it('remembers threading progress separately, per pattern', () => {
    saveThreadProgress('Runner', 7)
    saveProgress('Runner', { pick: 3, repeat: 0 })
    expect(loadThreadProgress('Runner', 32)).toBe(7)
    expect(loadThreadProgress('Runner', 5)).toBe(0) // past the end of a shorter draft
    expect(loadThreadProgress('Other', 32)).toBe(0)
  })

  it('remembers progress per pattern', () => {
    saveProgress('Runner', { pick: 5, repeat: 2 })
    expect(loadProgress('Runner', 32)).toEqual({ pick: 5, repeat: 2 })
    expect(loadProgress('Other', 32)).toEqual({ pick: 0, repeat: 0 })
  })

  it('starts again if the saved pick no longer exists or the data is bad', () => {
    saveProgress('Runner', { pick: 40, repeat: 0 })
    expect(loadProgress('Runner', 32)).toEqual({ pick: 0, repeat: 0 })
    store.set('weave-progress:Bad', '{oops')
    expect(loadProgress('Bad', 32)).toEqual({ pick: 0, repeat: 0 })
  })

  it('copes with storage being unavailable', () => {
    globalThis.localStorage = {
      getItem: () => {
        throw new Error('blocked')
      },
      setItem: () => {
        throw new Error('blocked')
      },
    } as unknown as Storage
    expect(() => saveProgress('x', { pick: 1, repeat: 0 })).not.toThrow()
    expect(loadProgress('x', 4)).toEqual({ pick: 0, repeat: 0 })
  })
})

describe('threading and weft changes', () => {
  it('gives each end its shaft, colour and heddle number on that shaft', () => {
    const d = defaultDraft() // straight draw 1 2 3 4 1 2 3 4 …
    expect(endInfo(d, 0)).toEqual({ shaft: 1, heddle: 1, color: '#d6246e' })
    expect(endInfo(d, 5)).toEqual({ shaft: 2, heddle: 2, color: '#d6246e' })
    d.threading[6] = -1
    expect(endInfo(d, 6)).toMatchObject({ shaft: null, heddle: null })
    expect(heddleCounts(d)).toEqual([8, 8, 7, 8])
  })

  it('spots where the weft colour changes, wrapping round at the start', () => {
    const d = defaultDraft()
    expect(d.weftColors.map((_, p) => weftChanges(d, p)).some(Boolean)).toBe(false)
    d.weftColors[3] = '#000000'
    expect([2, 3, 4].map((p) => weftChanges(d, p))).toEqual([false, true, true])
    d.weftColors[31] = '#000000'
    expect(weftChanges(d, 0)).toBe(true)
  })
})
