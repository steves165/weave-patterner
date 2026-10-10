import { describe, expect, it } from 'vitest'
import { PRESETS } from './colors'
import {
  addBlock,
  blockContents,
  blockLetter,
  blockTitle,
  cleanBlocks,
  insertBlock,
  moveBlock,
  nextBlockName,
  parseSavedBlocks,
  presetIntoBlock,
  putSavedBlock,
  removeBlock,
  renameBlock,
  replaceBlock,
  type SavedBlock,
  setWeftFrom,
  weftBlock,
} from './endBlocks'
import { computeDrawdown, type Draft, defaultDraft, exportFile, importFile, parseDraft, resizeDraft } from './weave'

const draft = () => defaultDraft() // 32 ends, straight draw 1 2 3 4 on 4 shafts

describe('blocks of ends', () => {
  it('letters blocks A to Z, then AA', () => {
    expect([0, 1, 25, 26, 27].map(blockLetter)).toEqual(['A', 'B', 'Z', 'AA', 'AB'])
  })

  it('marks blocks in order along the warp, whichever way they were dragged', () => {
    let d = addBlock(draft(), 8, 4, 'Second')
    d = addBlock(d, 0, 3, 'First')
    expect(d.blocks).toEqual([
      { from: 0, to: 3, name: 'First' },
      { from: 4, to: 8, name: 'Second' },
    ])
    expect(blockTitle(d.blocks ?? [], 0)).toBe('A (1–4)')
    expect(blockTitle(d.blocks ?? [], 1)).toBe('B (5–9)')
  })

  it('cuts back blocks a new one overlaps, splitting one it lands inside', () => {
    let d = addBlock(draft(), 0, 9, 'Wide')
    d = addBlock(d, 4, 5, 'Middle')
    expect(d.blocks).toEqual([
      { from: 0, to: 3, name: 'Wide' },
      { from: 4, to: 5, name: 'Middle' },
      { from: 6, to: 9, name: 'Wide' },
    ])
  })

  it('renames, moves and removes blocks', () => {
    let d = addBlock(draft(), 0, 3)
    d = renameBlock(d, 0, 'Border')
    expect(d.blocks?.[0].name).toBe('Border')
    d = moveBlock(d, 0, 2, 7)
    expect(d.blocks).toEqual([{ from: 2, to: 7, name: 'Border' }])
    expect(removeBlock(d, 0).blocks).toEqual([])
  })

  it('keeps blocks inside the pattern when it gets narrower', () => {
    const d = addBlock(addBlock(draft(), 0, 3), 20, 29)
    expect(resizeDraft(d, { ends: 24 }).blocks).toEqual([
      { from: 0, to: 3, name: '' },
      { from: 20, to: 23, name: '' },
    ])
    expect(resizeDraft(d, { ends: 10 }).blocks).toEqual([{ from: 0, to: 3, name: '' }])
    expect(cleanBlocks([{ from: 5, to: 2, name: 'x' }], 10)).toEqual([])
  })

  it('travels with the pattern in its file, and bad blocks are dropped', () => {
    const d = addBlock(draft(), 0, 3, 'Border')
    expect(importFile(exportFile('x', d)).draft.blocks).toEqual([{ from: 0, to: 3, name: 'Border' }])
    const bad = parseDraft({ ...draft(), blocks: [{ from: 40, to: 50, name: 'Off the end' }, 'junk'] })
    expect(bad.blocks).toEqual([])
    expect(parseDraft(draft()).blocks).toBeUndefined()
  })
})

describe('the block store', () => {
  const pointBlock: SavedBlock = {
    name: 'Point',
    threading: [0, 1, 2, 3, 2, 1],
    warpColors: Array(6).fill('#123456'),
    updatedAt: 1,
  }

  it("saves a block's threading and warp colours", () => {
    const d = { ...addBlock(draft(), 4, 7), warpColors: draft().warpColors.map((c, i) => (i === 5 ? '#00ff00' : c)) }
    const saved = blockContents(d, 0, 'Saved block 1')
    expect(saved.threading).toEqual([0, 1, 2, 3])
    expect(saved.warpColors[1]).toBe('#00ff00')
  })

  it('puts a saved block in, moving the blocks after it along', () => {
    const d = addBlock(addBlock(draft(), 0, 3, 'A'), 4, 7, 'B')
    const next = insertBlock(d, pointBlock, 4)
    expect(next.ends).toBe(38)
    expect(next.threading.slice(0, 12)).toEqual([0, 1, 2, 3, 0, 1, 2, 3, 2, 1, 0, 1])
    expect(next.warpColors).toHaveLength(38)
    expect(next.blocks).toEqual([
      { from: 0, to: 3, name: 'A' },
      { from: 4, to: 9, name: 'Point' },
      { from: 10, to: 13, name: 'B' },
    ])
    expect(() => parseDraft(next)).not.toThrow()
  })

  it('swaps a saved block in for a block, longer or shorter', () => {
    const d = addBlock(addBlock(draft(), 0, 3, 'A'), 4, 7, 'B')
    const next = replaceBlock(d, 0, pointBlock)
    expect(next.ends).toBe(34)
    expect(next.threading.slice(0, 6)).toEqual([0, 1, 2, 3, 2, 1])
    expect(next.blocks).toEqual([
      { from: 0, to: 5, name: 'Point' },
      { from: 6, to: 9, name: 'B' },
    ])
  })

  it('adds shafts when a saved block needs more', () => {
    const wide: SavedBlock = { ...pointBlock, threading: [0, 7], warpColors: ['#000000', '#000000'] }
    const next = insertBlock(draft(), wide, 32)
    expect(next.shafts).toBe(8)
    expect(next.tieup).toHaveLength(8)
    expect(() => parseDraft(next)).not.toThrow()
  })

  it('names saved blocks "Saved block N", replacing one of the same name', () => {
    expect(nextBlockName(['Saved block 1', 'Saved block 3'])).toBe('Saved block 2')
    const store = putSavedBlock(putSavedBlock([], pointBlock), {
      ...pointBlock,
      threading: [1],
      warpColors: ['#000000'],
    })
    expect(store).toHaveLength(1)
    expect(store[0].threading).toEqual([1])
  })

  it('reads back only valid saved blocks', () => {
    expect(parseSavedBlocks([pointBlock, { name: 'Bad', threading: [0], warpColors: [] }, null])).toEqual([pointBlock])
    expect(parseSavedBlocks('nope')).toEqual([])
  })
})

const presetDraft = (id: string) => {
  const p = PRESETS.find((x) => x.id === id)
  if (!p) throw new Error(id)
  return p.build('#111111', '#eeeeee')
}

/** Whether each end of a block is up or down on each pick as in `p`'s own drawdown, repeated. */
const weaves = (d: Draft, from: number, to: number, p: Draft) => {
  const dd = computeDrawdown(d)
  const pd = computeDrawdown(p)
  for (let pick = 0; pick < d.picks; pick++)
    for (let e = from; e <= to; e++)
      if (dd[pick][e] !== pd[pick % p.picks][(e - from) % p.ends]) return `pick ${pick + 1}, end ${e + 1}`
  return 'weaves it'
}

describe('weaving a block as a preset', () => {
  it('weaves houndstooth and puppytooth side by side, each all the way down on its own shafts', () => {
    let d = addBlock(addBlock(draft(), 0, 7, 'Houndstooth'), 8, 14, 'Puppytooth')
    const before = computeDrawdown(d)
    d = presetIntoBlock(d, 0, presetDraft('houndstooth'), { name: 'Houndstooth' })
    d = presetIntoBlock(d, 1, presetDraft('puppytooth'), { name: 'Puppytooth' })
    expect(weaves(d, 0, 7, presetDraft('houndstooth'))).toBe('weaves it')
    expect(weaves(d, 8, 14, presetDraft('puppytooth'))).toBe('weaves it')
    // The ends outside both blocks weave as they did.
    expect(computeDrawdown(d).map((row) => row.slice(15))).toEqual(before.map((row) => row.slice(15)))
    // Each block has shafts of its own, added beyond the pattern's 4.
    const shaftsOf = (from: number, to: number) => new Set(d.threading.slice(from, to + 1))
    const [a, b, rest] = [shaftsOf(0, 7), shaftsOf(8, 14), shaftsOf(15, 31)]
    expect([...a].some((x) => b.has(x) || rest.has(x))).toBe(false)
    expect([...b].some((x) => rest.has(x))).toBe(false)
    expect(d.shafts).toBe(12)
    expect(d.picks).toBe(32)
    expect(d.blocks?.map((x) => x.weave?.name)).toEqual(['Houndstooth', 'Puppytooth'])
    expect(d.warpColors.slice(0, 8)).toEqual(presetDraft('houndstooth').warpColors.slice(0, 8))
  })

  it('takes the newest preset’s weft colours, or the block chosen for them, or leaves them', () => {
    let d = addBlock(addBlock(draft(), 0, 7), 8, 15)
    d = presetIntoBlock(d, 0, presetDraft('houndstooth'), { name: 'Houndstooth' })
    d = presetIntoBlock(d, 1, presetDraft('puppytooth'), { name: 'Puppytooth' })
    const weft = (p: Draft) => Array.from({ length: 32 }, (_, k) => p.weftColors[k % p.picks])
    expect(d.weftColors).toEqual(weft(presetDraft('puppytooth')))
    expect(weftBlock(d)).toBe(1)
    d = setWeftFrom(d, 0)
    expect(d.weftColors).toEqual(weft(presetDraft('houndstooth')))
    expect(weftBlock(d)).toBe(0)
    const kept = setWeftFrom(d, null)
    expect(kept.weftColors).toEqual(d.weftColors)
    expect(weftBlock(kept)).toBe(-1)
    // Both still weave their structure.
    expect(weaves(d, 0, 7, presetDraft('houndstooth'))).toBe('weaves it')
    expect(weaves(d, 8, 15, presetDraft('puppytooth'))).toBe('weaves it')
  })

  it('keeps a block on the shafts it has when nothing else uses them', () => {
    let d = addBlock(draft(), 0, 31, 'All')
    d = presetIntoBlock(d, 0, presetDraft('basket-check'))
    expect(d.shafts).toBe(4)
    expect(weaves(d, 0, 31, presetDraft('basket-check'))).toBe('weaves it')
    d = presetIntoBlock(d, 0, presetDraft('houndstooth'))
    expect(weaves(d, 0, 31, presetDraft('houndstooth'))).toBe('weaves it')
    expect(d.shafts).toBe(4)
  })

  it('keeps block weaves in the file', () => {
    const d = presetIntoBlock(addBlock(draft(), 0, 7), 0, presetDraft('puppytooth'), { name: 'Puppytooth' })
    expect(importFile(exportFile('x', d)).draft.blocks?.[0].weave).toEqual(d.blocks?.[0].weave)
  })
})

describe('saved blocks keep their weft', () => {
  it('saves only the block’s own shafts’ lifts, as a repeat, with the weft colours', () => {
    const saved = blockContents(addBlock(draft(), 0, 3, 'Twill'), 0, 'Twill')
    // 2/2 twill: a 4-pick repeat.
    expect(saved.weave).toEqual({
      base: 0,
      lifts: [
        [0, 1],
        [1, 2],
        [2, 3],
        [0, 3],
      ],
      weftColors: draft().weftColors.slice(0, 4),
    })
  })

  it('a woven block saved and put in again weaves its pattern all the way down, on shafts of its own', () => {
    let d = addBlock(addBlock(draft(), 0, 7, 'H'), 8, 14, 'P')
    d = presetIntoBlock(d, 0, presetDraft('houndstooth'), { name: 'Houndstooth' })
    d = presetIntoBlock(d, 1, presetDraft('puppytooth'), { name: 'Puppytooth' })
    const saved = blockContents(d, 0, 'Saved H')
    // Only its own shafts, counted from its first: none of the other blocks' or the rest's.
    expect(Math.max(...(saved.weave?.lifts.flat() ?? []))).toBeLessThan(4)
    expect(saved.weave?.lifts).toHaveLength(8)
    const put = insertBlock(d, saved, d.ends)
    expect(put.ends).toBe(40)
    // No rows added across the cloth.
    expect(put.picks).toBe(32)
    expect(weaves(put, 32, 39, presetDraft('houndstooth'))).toBe('weaves it')
    expect(weaves(put, 0, 7, presetDraft('houndstooth'))).toBe('weaves it')
    expect(weaves(put, 8, 14, presetDraft('puppytooth'))).toBe('weaves it')
    expect(computeDrawdown(put).map((r) => r.slice(15, 32))).toEqual(computeDrawdown(d).map((r) => r.slice(15, 32)))
    const own = new Set(put.threading.slice(32))
    expect(put.threading.slice(0, 32).some((x) => own.has(x))).toBe(false)
    expect(put.blocks?.at(-1)).toMatchObject({ name: 'Saved H', weave: { name: 'Saved H' } })
  })

  it('swaps a block for a saved one, which weaves its own pattern there', () => {
    let d = addBlock(addBlock(draft(), 0, 7, 'H'), 8, 15, 'Plain')
    d = presetIntoBlock(d, 0, presetDraft('houndstooth'), { name: 'Houndstooth' })
    const saved = blockContents(d, 0, 'H')
    const next = replaceBlock(d, 1, saved)
    expect(next.ends).toBe(32)
    expect(weaves(next, 8, 15, presetDraft('houndstooth'))).toBe('weaves it')
  })

  it('reads blocks saved before, with their picks’ treadles, keeping only their own shafts', () => {
    const old = {
      name: 'Old',
      threading: [4, 5, 6, 7],
      warpColors: Array(4).fill('#000000'),
      weft: {
        treadles: [
          [0, 4, 5],
          [1, 5, 6],
        ],
        treadling: [[0], [1]],
        weftColors: ['#111111', '#222222'],
      },
      updatedAt: 1,
    }
    expect(parseSavedBlocks([old])[0].weave).toEqual({
      base: 4,
      lifts: [
        [0, 1],
        [1, 2],
      ],
      weftColors: ['#111111', '#222222'],
    })
    expect(
      parseSavedBlocks([{ ...old, weft: { treadles: [[0]], treadling: [[5]], weftColors: ['#000000'] } }])[0].weave,
    ).toBeUndefined()
  })
})
