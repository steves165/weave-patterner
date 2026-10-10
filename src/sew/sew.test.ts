import { describe, expect, it } from 'vitest'
import { cuttingLayout, fabricsOf } from './cutting'
import { DESIGNS, designById } from './designs'
import { svgItems } from './drawing'
import { patternDxf, patternSvg, patternText, tiled, usedTiles } from './exports'
import { drawnSegs, extraPiece, newExtra, parseExtras } from './extras'
import { arc, area, bounds, inside, offsetOutline, pathLength, polyline, pt, type Seg } from './geometry'
import { fabricLength, formatLength, MENS, WOMENS } from './measurements'
import { allowanceFor, cleanOptions, DEFAULT_ALLOWANCES, defaultOptions, outlines } from './pattern'
import { decodeProject, encodeProject, newProject, parseProject, piecesOf, projectUrl } from './project'

const square = (kinds: Seg['kind'][]): Seg[] => [
  { to: pt(10, 0), kind: kinds[0] },
  { to: pt(10, 10), kind: kinds[1] },
  { to: pt(0, 10), kind: kinds[2] },
  { to: pt(0, 0), kind: kinds[3] },
]

describe('seam allowances', () => {
  it('moves every edge out by its allowance, corners meeting square', () => {
    const cut = offsetOutline(pt(0, 0), square(['seam', 'seam', 'hem', 'seam']), (k) => (k === 'hem' ? 3 : 1))
    expect(bounds(cut)).toEqual({ x: -1, y: -1, w: 12, h: 14 })
  })

  it('adds nothing on the fold, and works whichever way the outline runs', () => {
    const cut = offsetOutline(
      pt(0, 0),
      square(['seam', 'seam', 'seam', 'fold']),
      allowanceFor({ ...DEFAULT_ALLOWANCES, hem: 1.5 }),
    )
    expect(bounds(cut)).toEqual({ x: 0, y: -1.5, w: 11.5, h: 13 })
    const backwards: Seg[] = [
      { to: pt(0, 10), kind: 'fold' },
      { to: pt(10, 10), kind: 'seam' },
      { to: pt(10, 0), kind: 'seam' },
      { to: pt(0, 0), kind: 'seam' },
    ]
    expect(bounds(offsetOutline(pt(0, 0), backwards, allowanceFor(DEFAULT_ALLOWANCES)))).toEqual({
      x: 0,
      y: -1.5,
      w: 11.5,
      h: 13,
    })
  })

  it('follows curves', () => {
    const circle = arc(pt(0, 0), 10, 0, 2 * Math.PI, 'seam')
    const cut = offsetOutline(pt(10, 0), circle, () => 2)
    for (const q of cut) expect(Math.hypot(q.x, q.y)).toBeCloseTo(12, 0)
  })
})

describe('designs', () => {
  const sizes = [...WOMENS, ...MENS]
  for (const d of DESIGNS)
    it(`${d.name} drafts closed pieces for every size, the cutting line outside the sewing line`, () => {
      for (const s of sizes) {
        const pieces = d.draft({ m: s.m, figure: s.figure }, defaultOptions(d))
        expect(pieces.length).toBeGreaterThan(0)
        for (const p of pieces) {
          const { sew, cut } = outlines(p, { ...DEFAULT_ALLOWANCES, ...d.allowances })
          for (const q of [...sew, ...cut]) expect(Number.isFinite(q.x) && Number.isFinite(q.y)).toBe(true)
          expect(Math.abs(area(sew)), `${p.name} in ${s.name}`).toBeGreaterThan(20)
          const sb = bounds(sew)
          const cb = bounds(cut)
          expect(cb.w).toBeGreaterThanOrEqual(sb.w - 0.01)
          expect(cb.h).toBeGreaterThanOrEqual(sb.h - 0.01)
          expect(p.cut).toBeGreaterThan(0)
        }
        const sketch = d.sketch({ m: s.m, figure: s.figure }, defaultOptions(d))
        expect(sketch.shapes.length).toBeGreaterThan(0)
      }
    })

  it('drafts every choice of every option', () => {
    const body = { m: WOMENS[3].m, figure: WOMENS[3].figure }
    for (const d of DESIGNS)
      for (const o of d.options) {
        const values =
          o.type === 'choice' ? o.choices.map((c) => c.value) : o.type === 'bool' ? [true, false] : [o.min, o.max]
        for (const v of values) {
          const pieces = d.draft(body, { ...defaultOptions(d), [o.id]: v })
          expect(
            pieces.every((p) => p.segs.length >= 3),
            `${d.name} ${o.id}=${v}`,
          ).toBe(true)
          expect(d.steps({ ...defaultOptions(d), [o.id]: v }).length).toBeGreaterThan(1)
        }
      }
  })

  it('makes sleeve caps to fit the armholes', () => {
    const d = designById('t-shirt')
    if (!d) throw new Error('no t-shirt')
    const pieces = d.draft({ m: WOMENS[3].m, figure: 'bust' }, defaultOptions(d))
    const armhole = (id: string) => {
      const p = pieces.find((x) => x.id === id)
      if (!p) throw new Error(id)
      // The armhole is the two segments after the shoulder.
      return pathLength(p.segs[0].to, p.segs.slice(1, 3))
    }
    const sleeve = pieces.find((p) => p.id === 'sleeve')
    if (!sleeve) throw new Error('no sleeve')
    const cap = pathLength(sleeve.start, sleeve.segs.slice(0, 2))
    expect(cap).toBeCloseTo(armhole('front') + armhole('back'), 0)
  })

  it('cuts a circle skirt’s waist to the waist, for each fullness', () => {
    const d = designById('circle-skirt')
    if (!d) throw new Error('no circle skirt')
    for (const fullness of ['full', 'threeQuarter', 'half', 'quarter']) {
      const [skirt] = d.draft({ m: WOMENS[3].m, figure: 'bust' }, { ...defaultOptions(d), fullness })
      const waist = skirt.segs.filter((s) => s.kind === 'seam' && s.c1)
      // Each piece is a quarter of the waist (cut twice, on the fold).
      const start = skirt.start
      const len = pathLength(start, waist)
      expect(len * 4).toBeCloseTo(WOMENS[3].m.waist - 2, 0)
    }
  })

  it('makes pull-on trouser waists big enough to pull over the hips', () => {
    const d = designById('trousers')
    if (!d) throw new Error('no trousers')
    for (const s of WOMENS) {
      const casing = d.draft({ m: s.m, figure: 'bust' }, defaultOptions(d)).find((p) => p.id === 'casing')
      expect(bounds(polyline(casing?.start ?? pt(0, 0), casing?.segs ?? [])).w).toBeGreaterThan(s.m.hips)
    }
  })

  it('puts a bigger size outside a smaller one', () => {
    const d = designById('shift-dress')
    if (!d) throw new Error('no dress')
    const front = (i: number) => {
      const p = d.draft({ m: WOMENS[i].m, figure: 'bust' }, defaultOptions(d))[0]
      return bounds(outlines(p, DEFAULT_ALLOWANCES).cut)
    }
    expect(front(5).w).toBeGreaterThan(front(3).w)
    expect(front(3).w).toBeGreaterThan(front(1).w)
  })

  it('keeps options to the design’s choices and limits', () => {
    const d = designById('tote-bag')
    if (!d) throw new Error('no tote')
    expect(cleanOptions(d, { width: 500, handles: 'wheels', lining: 'yes' })).toMatchObject({
      width: 60,
      handles: 'shoulder',
      lining: true,
    })
  })
})

describe('cutting layouts', () => {
  for (const id of ['t-shirt', 'shift-dress', 'trousers', 'circle-skirt'])
    it(`lays out the ${id} with no pieces overlapping, inside the fabric`, () => {
      const p = newProject(id)
      const pieces = piecesOf(p)
      for (const width of [115, 150]) {
        const lay = cuttingLayout(pieces, p.allowances, 'main', width, { oneWay: false })
        const across = lay.folded ? width / 2 : width
        for (const pl of lay.placements) {
          const b = bounds(pl.pts)
          expect(b.y).toBeGreaterThanOrEqual(-0.5)
          expect(b.y + b.h).toBeLessThanOrEqual(across + 0.5)
          if (pl.piece.onFold && lay.folded) expect(b.y).toBeLessThan(0.5)
        }
        // No point well inside one piece is inside another.
        for (const [i, a] of lay.placements.entries())
          for (const b of lay.placements.slice(i + 1)) {
            const ba = bounds(a.pts)
            const centre = pt(ba.x + ba.w / 2, ba.y + ba.h / 2)
            if (inside(centre, a.pts)) expect(inside(centre, b.pts)).toBe(false)
          }
      }
    })

  it('needs more length on narrower fabric, and lists every fabric', () => {
    const p = newProject('shift-dress')
    const pieces = piecesOf(p)
    const narrow = cuttingLayout(pieces, p.allowances, 'main', 115, { oneWay: false })
    const wide = cuttingLayout(pieces, p.allowances, 'main', 150, { oneWay: false })
    expect(narrow.length).toBeGreaterThan(wide.length)
    expect(fabricsOf(pieces)).toEqual(['main', 'interfacing'])
  })

  it('never turns pieces on one-way fabric', () => {
    const p = newProject('trousers')
    const lay = cuttingLayout(piecesOf(p), p.allowances, 'main', 140, { oneWay: true })
    expect(lay.placements.every((pl) => !pl.turned)).toBe(true)
  })
})

describe('units', () => {
  it('writes inches to the nearest eighth, and fabric in metres or yards', () => {
    expect(formatLength(2.54, 'in')).toBe('1″')
    expect(formatLength(2.54 * 1.5, 'in')).toBe('1 1/2″')
    expect(formatLength(2.54 * 0.375, 'in')).toBe('3/8″')
    expect(formatLength(91.44, 'cm')).toBe('91.4 cm')
    expect(fabricLength(151, 'cm')).toBe('1.6 m')
    expect(fabricLength(91.44 * 1.5, 'in')).toBe('1 1/2 yd')
  })
})

describe('projects', () => {
  it('reads back what it saves, and refuses what isn’t a project', () => {
    const p = { ...newProject('skirt'), sizing: 'custom' as const, nested: ['UK 10', 'UK 99'] }
    const back = parseProject(JSON.parse(JSON.stringify(p)))
    expect(back?.design).toBe('skirt')
    expect(back?.nested).toEqual(['UK 10'])
    expect(parseProject({ design: 'spacesuit' })).toBeNull()
  })

  it('packs a project into a link and back', async () => {
    const p = { ...newProject('apron'), units: 'in' as const }
    expect(await projectUrl('Apron', p)).toMatch(
      /^https:\/\/steves165\.github\.io\/weave-patterner\/sew\/\?project=[\w-]+$/,
    )
    const back = await decodeProject(await encodeProject('My apron', p))
    expect(back.name).toBe('My apron')
    expect(back.project.units).toBe('in')
    await expect(decodeProject('broken')).rejects.toThrow('The project link is damaged or incomplete')
  })
})

describe('exports', () => {
  it('tiles the pattern over pages, only printing pages with some of it', () => {
    const p = newProject('t-shirt')
    const tile = { w: 190, h: 277 }
    const lay = tiled(p, tile)
    const used = usedTiles(lay.items, lay.cols, lay.rows, tile, { x: 1, y: 1 })
    const count = used.flat().filter(Boolean).length
    expect(count).toBeGreaterThan(2)
    expect(count).toBeLessThanOrEqual(lay.pages)
  })

  it('writes a full-size SVG and a DXF with the AAMA layers', () => {
    const p = newProject('tote-bag')
    const svg = patternSvg(p, 'Tote', svgItems)
    expect(svg).toMatch(/width="[\d.]+cm"/)
    expect(svg).toContain('Handle')
    const dxf = patternDxf(p)
    expect(dxf).toContain('$INSUNITS')
    expect(dxf).toMatch(/POLYLINE\n8\n1\n/)
    expect(dxf).toMatch(/POLYLINE\n8\n14\n/)
    expect(dxf).toMatch(/POLYLINE\n8\n7\n/)
    expect(dxf.trimEnd().endsWith('EOF')).toBe(true)
  })

  it('writes the booklet text: style, measurements, fabric, materials and steps', () => {
    const t = patternText(newProject('shift-dress'), 'Summer dress')
    expect(t.title).toBe('Summer dress')
    expect(t.subtitle).toBe('Shift dress · UK 12')
    expect(t.options).toContain('Sleeves: Short')
    expect(t.measurements[0]).toMatch(/^Bust or chest: 91 cm$/)
    expect(t.needs[0]).toMatch(/^Main fabric: [\d.]+ m of 115 cm wide/)
    expect(t.materials.some((m) => m.includes('invisible zip'))).toBe(true)
    expect(t.steps.length).toBeGreaterThan(5)
  })
})

describe('your own pieces', () => {
  it('makes rectangles, circles and drawn shapes into pieces, smooth points curving through them', () => {
    const rectP = extraPiece({ ...newExtra('rect', 1), w: 30, h: 8, onFold: true })
    expect(rectP.onFold).toBe(true)
    expect(bounds(outlines(rectP, DEFAULT_ALLOWANCES).cut)).toEqual({ x: 0, y: -1.5, w: 31.5, h: 11 })
    const circ = extraPiece({ ...newExtra('circle', 2), w: 20 })
    expect(bounds(outlines(circ, { include: false, seam: 0, hem: 0 }).sew).w).toBeCloseTo(20, 1)
    const drawn = newExtra('drawn', 3)
    const sew = outlines(extraPiece(drawn), { include: false, seam: 0, hem: 0 }).sew
    // The smooth point at (25, 15) is on the curve.
    expect(sew.some((q) => Math.hypot(q.x - 25, q.y - 15) < 0.3)).toBe(true)
    expect(drawnSegs(drawn.points, 'seam', false).segs.filter((x) => x.c1).length).toBe(2)
  })

  it('saves them with the project, checked, and adds them to the pattern and the cutting layout', () => {
    const p = { ...newProject('tote-bag'), extras: [{ ...newExtra('rect', 1), name: 'Strap', cut: 2 }] }
    const back = parseProject(JSON.parse(JSON.stringify(p)))
    expect(back?.extras[0]).toMatchObject({ name: 'Strap', shape: 'rect', cut: 2 })
    expect(parseExtras([{ shape: 'blob' }, { shape: 'rect', w: -5, cut: 99 }])).toMatchObject([{ w: 1, cut: 20 }])
    const pieces = piecesOf(p)
    expect(pieces.at(-1)?.name).toBe('Strap')
    const lay = cuttingLayout(pieces, p.allowances, 'main', 140, { oneWay: false })
    expect(lay.placements.some((pl) => pl.piece.name === 'Strap')).toBe(true)
  })
})
