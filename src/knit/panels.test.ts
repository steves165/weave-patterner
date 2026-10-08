import { describe, expect, it } from 'vitest'
import { blankChart, mirror, parseChart, problems } from './chart'
import { deleteColumns, insertColumns } from './edit'
import { writeRow, writtenPanels, writtenPattern } from './instructions'
import { addPanel, insertPanel, panelRows, parseSavedPanels, removePanel, renamePanel, savePanel } from './panels'
import { chartFrom } from './samples'

// A cable panel (squares 2–5 from the left) between purls, crossed on row 1 of every 4: 8 rows.
const cable = () => {
  const rows = ['-....-', '-....-', '-....-', '-RRRR-']
  return chartFrom([...rows, ...rows])
}

describe('panels', () => {
  it('writes the rows with "work Panel A", and the panel over its own repeat', () => {
    const k = renamePanel(addPanel(cable(), 1, 4), 0, 'Cable')
    expect(writeRow(k, 0)).toBe('p1, work Panel A, p1')
    const [panel] = writtenPanels(k)
    expect(panel.title).toBe('Panel A (Cable)')
    expect(panel.stitches).toBe('stitches 2–5, 4 row repeat')
    expect(panel.rows.map((r) => r.text)).toEqual(['2/2 RC', 'p4', 'k4', 'p4'])
    expect(writtenPattern(k)).toContain('Panel A (Cable), stitches 2–5, 4 row repeat:')
    expect(panelRows(k, k.panels?.[0] ?? { from: 0, to: 0, name: '' })).toBe(4)
  })

  it('keeps panels apart, moves them with added or removed stitches, and saves and mirrors them', () => {
    let k = addPanel(addPanel(blankChart(10, 2), 0, 3, 'A'), 6, 9, 'B')
    k = addPanel(k, 3, 6, 'Middle')
    // Lettered from stitch 1 at the right, the order right-side rows meet them.
    expect(k.panels?.map((p) => [p.from, p.to, p.name])).toEqual([
      [7, 9, 'B'],
      [3, 6, 'Middle'],
      [0, 2, 'A'],
    ])
    expect(insertColumns(k, 0, 2).panels?.[2]).toEqual({ from: 2, to: 4, name: 'A' })
    expect(deleteColumns(k, 3, 6).panels?.map((p) => p.name)).toEqual(['B', 'A'])
    expect(parseChart(JSON.parse(JSON.stringify(k)))?.panels).toEqual(k.panels)
    expect(mirror(k).panels?.map((p) => [p.from, p.to, p.name])[0]).toEqual([7, 9, 'A'])
    expect(removePanel(k, 1).panels).toHaveLength(2)
  })

  it('flags a cable cut by the edge of a panel', () => {
    const k = addPanel(cable(), 1, 2)
    expect(problems(k).some((p) => p.message.includes('crosses the edge of panel A'))).toBe(true)
    expect(problems(addPanel(cable(), 1, 4))).toEqual([])
  })

  it('saves a panel over its repeat and puts it into another chart, growing the rows so both repeat', () => {
    const saved = savePanel(addPanel(cable(), 1, 4, 'Cable'), 0, 'Cable')
    expect(saved.stitch).toHaveLength(4)
    expect(parseSavedPanels([saved, { name: 'junk' }])).toEqual([saved])
    // Into a 6-row chart: 12 rows fit both a 6-row and a 4-row repeat.
    const into = insertPanel(blankChart(3, 6), saved, 3)
    expect(into.stitch).toHaveLength(12)
    expect(into.stitch[0]).toEqual(['k', 'k', 'k', 'rc2', 'rc2', 'rc2', 'rc2'])
    expect(into.stitch[4].slice(3)).toEqual(['rc2', 'rc2', 'rc2', 'rc2'])
    expect(into.panels).toEqual([{ from: 3, to: 6, name: 'Cable' }])
  })
})
