import { describe, expect, it } from 'vitest'
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
import { defaultDraft, exportFile, importFile, parseDraft, resizeDraft } from './weave'

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
  it('threads only the block’s columns from the preset, on the block’s own shafts', () => {
    // Block B on shafts 5-8.
    let d = resizeDraft(draft(), { shafts: 8, treadles: 8 })
    d = { ...d, threading: d.threading.map((s, e) => (e >= 8 && e < 16 ? s + 4 : s)) }
    d = addBlock(addBlock(d, 0, 7, 'A'), 8, 15, 'B')
    const preset = { ...draft(), warpColors: draft().warpColors.map(() => '#111111') }
    const plain = {
      ...preset,
      threading: [0, 1],
      ends: 2,
      warpColors: ['#111111', '#222222'],
      tieup: preset.tieup.map((row, s) => row.map((_, t) => (t === 0 ? s % 2 === 0 : t === 1 ? s % 2 === 1 : false))),
      treadling: [
        [true, false, false, false],
        [false, true, false, false],
      ],
      picks: 2,
      weftColors: ['#333333', '#444444'],
    }
    const next = presetIntoBlock(d, 1, plain)
    expect(next.ends).toBe(32)
    expect(next.threading.slice(8, 16)).toEqual([4, 5, 4, 5, 4, 5, 4, 5])
    expect(next.warpColors.slice(8, 16)).toEqual(Array(4).fill(['#111111', '#222222']).flat())
    // Only the block's columns change: the treadling, tie-up and weft are the pattern's own.
    expect(next.treadling).toEqual(d.treadling)
    expect(next.tieup).toEqual(d.tieup)
    expect(next.weftColors).toEqual(d.weftColors)
    expect(next.picks).toBe(32)
    // Block A is untouched.
    expect(next.threading.slice(0, 8)).toEqual(d.threading.slice(0, 8))
    // Without colours, the block keeps its own.
    const kept = presetIntoBlock(d, 1, plain, { colours: false })
    expect(kept.warpColors).toEqual(d.warpColors)
  })
})
