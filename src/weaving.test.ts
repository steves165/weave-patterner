import { beforeEach, describe, expect, it } from 'vitest'
import { greenBlocks } from './testUtils'
import { defaultDraft } from './weave'
import { loadProgress, pickInfo, saveProgress, step } from './weaving'

describe('pickInfo', () => {
  it('gives the treadle, lifted shafts and weft colour for a pick', () => {
    expect(pickInfo(defaultDraft(), 0)).toEqual({ treadles: [1], shafts: [1, 2], color: '#ffffff' })
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
