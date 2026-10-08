import { describe, expect, it } from 'vitest'
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
  putSavedBlock,
  removeBlock,
  renameBlock,
  replaceBlock,
  type SavedBlock,
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
