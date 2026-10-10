import { describe, expect, it } from 'vitest'
import { PRESETS } from './colors'
import {
  addBlock,
  blockContents,
  blockLetter,
  blockPicks,
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
  setBlockPicks,
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

describe('blocks with their weft', () => {
  it('saves a block’s picks with it: the same numbers as its ends, unless set', () => {
    const d = addBlock(draft(), 0, 3, 'Twill')
    const saved = blockContents(d, 0, 'Twill')
    // 2/2 twill: picks 1-4 press treadles 1-4, each lifting two shafts.
    expect(saved.weft?.treadling).toEqual([[0], [1], [2], [3]])
    expect(saved.weft?.treadles).toEqual([
      [0, 1],
      [1, 2],
      [2, 3],
      [0, 3],
    ])
    expect(saved.weft?.weftColors).toEqual(d.weftColors.slice(0, 4))
    const set = setBlockPicks(d, 0, 9, 8)
    expect(set.blocks?.[0].picks).toEqual({ from: 8, to: 9 })
    expect(blockContents(set, 0, 'Twill').weft?.treadling).toHaveLength(2)
    expect(blockPicks(set, 0)).toEqual({ from: 8, to: 9 })
  })

  it('puts in the warp and the weft of a saved block, reusing treadles with the same tie-up', () => {
    const d = addBlock(draft(), 0, 3, 'Twill')
    const saved = blockContents(d, 0, 'Twill')
    const next = insertBlock(d, saved, d.ends, d.picks)
    expect(next.ends).toBe(36)
    expect(next.picks).toBe(36)
    expect(next.treadles).toBe(d.treadles)
    expect(next.treadling.slice(32)).toEqual(d.treadling.slice(0, 4))
    expect(next.blocks?.[1]).toMatchObject({ from: 32, to: 35, name: 'Twill', picks: { from: 32, to: 35 } })
  })

  it('adds treadles for tie-ups the pattern doesn’t have, and shifts later blocks’ picks', () => {
    const tabby = {
      ...blockContents(addBlock(draft(), 0, 3), 0, 'x'),
      weft: {
        treadles: [
          [0, 2],
          [1, 3],
        ],
        treadling: [[0], [1]],
        weftColors: ['#000000', '#ffffff'],
      },
    }
    const d = setBlockPicks(addBlock(draft(), 8, 11, 'Later'), 0, 10, 12)
    const next = insertBlock(d, tabby, 0, 0)
    expect(next.treadles).toBe(6)
    expect(next.tieup.map((row) => row.slice(4))).toEqual([
      [true, false],
      [false, true],
      [true, false],
      [false, true],
    ])
    expect(next.treadling[0]).toEqual([false, false, false, false, true, false])
    expect(next.blocks?.find((b) => b.name === 'Later')?.picks).toEqual({ from: 12, to: 14 })
  })

  it('swaps a block’s picks along with its ends', () => {
    const d = addBlock(draft(), 0, 3, 'A')
    const other = {
      name: 'B',
      threading: [0, 0],
      warpColors: ['#000000', '#000000'],
      weft: { treadles: [[0]], treadling: [[0]], weftColors: ['#123456'] },
      updatedAt: 0,
    }
    const next = replaceBlock(d, 0, other)
    expect(next.ends).toBe(30)
    expect(next.picks).toBe(29)
    expect(next.weftColors[0]).toBe('#123456')
    expect(next.blocks?.[0]).toMatchObject({ from: 0, to: 1, picks: { from: 0, to: 0 } })
  })

  it('keeps saved wefts in the block store, and drops broken ones', () => {
    const saved = blockContents(addBlock(draft(), 0, 3), 0, 'W')
    expect(parseSavedBlocks(JSON.parse(JSON.stringify([saved])))[0].weft).toEqual(saved.weft)
    const broken = { ...saved, weft: { treadles: [[0]], treadling: [[5]], weftColors: ['#000000'] } }
    expect(parseSavedBlocks([broken])[0].weft).toBeUndefined()
  })

  it('remembers a block’s picks in the file, and trims them when picks are taken away', () => {
    const d = setBlockPicks(addBlock(draft(), 0, 3, 'A'), 0, 20, 30)
    expect(importFile(exportFile('x', d)).draft.blocks?.[0].picks).toEqual({ from: 20, to: 30 })
    expect(resizeDraft(d, { picks: 25 }).blocks?.[0].picks).toEqual({ from: 20, to: 24 })
    expect(resizeDraft(d, { picks: 10 }).blocks?.[0].picks).toBeUndefined()
  })
})

describe('weaving a block as a preset', () => {
  const preset = (id: string) => {
    const p = PRESETS.find((x) => x.id === id)
    if (!p) throw new Error(id)
    return p.build('#111111', '#eeeeee')
  }
  /** Whether each end of a block is up or down on each pick, as in the preset's own drawdown, repeated. */
  const matches = (d: Draft, from: number, to: number, p: Draft) => {
    const dd = computeDrawdown(d)
    const pd = computeDrawdown(p)
    for (let pick = 0; pick < d.picks; pick++)
      for (let e = from; e <= to; e++)
        if (dd[pick][e] !== pd[pick % p.picks][(e - from) % p.ends]) return `pick ${pick + 1}, end ${e + 1}`
    return 'matches'
  }

  it('weaves houndstooth and puppytooth side by side, each all the way down on its own shafts', () => {
    let d = addBlock(addBlock(draft(), 0, 7, 'Houndstooth'), 8, 14, 'Puppytooth')
    const before = computeDrawdown(d)
    d = presetIntoBlock(d, 0, preset('houndstooth'), { name: 'Houndstooth' })
    d = presetIntoBlock(d, 1, preset('puppytooth'), { name: 'Puppytooth' })
    expect(matches(d, 0, 7, preset('houndstooth'))).toBe('matches')
    expect(matches(d, 8, 14, preset('puppytooth'))).toBe('matches')
    // The ends outside both blocks weave as they did.
    const after = computeDrawdown(d)
    expect(after.map((row) => row.slice(15))).toEqual(before.map((row) => row.slice(15)))
    // Each block has shafts of its own, added beyond the pattern's 4.
    const shaftsOf = (from: number, to: number) => new Set(d.threading.slice(from, to + 1))
    const a = shaftsOf(0, 7)
    const b = shaftsOf(8, 14)
    const rest = shaftsOf(15, 31)
    expect([...a].some((x) => b.has(x) || rest.has(x))).toBe(false)
    expect([...b].some((x) => rest.has(x))).toBe(false)
    expect(d.shafts).toBe(12)
    expect(d.blocks?.map((x) => x.weave?.name)).toEqual(['Houndstooth', 'Puppytooth'])
    // Picks and their number are kept; treadles are one per shed.
    expect(d.picks).toBe(32)
    expect(d.treadles).toBeGreaterThanOrEqual(4)
    // The houndstooth's colours: the block's warp, and the weft across the pattern (the first preset's).
    expect(d.warpColors.slice(0, 8)).toEqual(preset('houndstooth').warpColors.slice(0, 8))
    expect(d.weftColors.slice(0, 8)).toEqual(preset('houndstooth').weftColors.slice(0, 8))
  })

  it('keeps a block on its own shafts when nothing else uses them, and re-weaves when its preset changes', () => {
    let d = addBlock(draft(), 0, 31, 'All')
    d = presetIntoBlock(d, 0, preset('basket-check'))
    expect(d.shafts).toBe(4)
    expect(matches(d, 0, 31, preset('basket-check'))).toBe('matches')
    d = presetIntoBlock(d, 0, preset('houndstooth'))
    expect(matches(d, 0, 31, preset('houndstooth'))).toBe('matches')
    expect(d.shafts).toBe(4)
  })

  it('keeps block weaves in the file', () => {
    const d = presetIntoBlock(addBlock(draft(), 0, 7), 0, preset('puppytooth'), { name: 'Puppytooth' })
    expect(importFile(exportFile('x', d)).draft.blocks?.[0].weave).toEqual(d.blocks?.[0].weave)
  })
})
