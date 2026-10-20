import { readFileSync } from 'node:fs'
import { createCanvas } from '@napi-rs/canvas'
import { describe, expect, it } from 'vitest'
import { KNIT, WEAVE } from './brands'
import { blankChart } from './knit/chart'
import { fabricPainter } from './knit/sharePicture'
import { shareLinks } from './share'
import { clothPainter, drawShareCard, SHARE_SIZES } from './shareImage'
import { computeDrawdown, importFile } from './weave'

const { draft } = importFile(readFileSync(new URL('../samples/Green blocks.weave.json', import.meta.url), 'utf8'))
const card = (design = clothPainter(draft)) => ({
  app: 'weave' as const,
  appName: 'Weave Patterner',
  brand: WEAVE,
  title: 'Green blocks',
  address: 'example.org/weave',
  design,
})
const pixel = (ctx: CanvasRenderingContext2D, x: number, y: number) =>
  `#${[...ctx.getImageData(x, y, 1, 1).data.slice(0, 3)].map((v) => v.toString(16).padStart(2, '0')).join('')}`

describe('share pictures', () => {
  it('draws each size, with the cloth in its colours on the app’s background', () => {
    for (const size of ['square', 'tall', 'preview'] as const) {
      const ctx = createCanvas(1, 1).getContext('2d') as unknown as CanvasRenderingContext2D
      drawShareCard(ctx, card(), size)
      expect([ctx.canvas.width, ctx.canvas.height]).toEqual([SHARE_SIZES[size].width, SHARE_SIZES[size].height])
      expect(pixel(ctx, 2, 2)).toBe(WEAVE.paper.light.toLowerCase())
      // Inside the cloth: one of the draft's thread colours, shaded.
      const middle = ctx.getImageData(150, 150, 40, 40).data
      expect(new Set(Array.from({ length: 1600 }, (_, i) => middle[i * 4])).size).toBeGreaterThan(2)
    }
  })

  it('draws knitted fabric for a chart', () => {
    const ctx = createCanvas(1, 1).getContext('2d') as unknown as CanvasRenderingContext2D
    const chart = blankChart(10, 10, ['#ff0000', '#0000ff'])
    drawShareCard(
      ctx,
      {
        ...card(fabricPainter(chart, () => createCanvas(1, 1) as unknown as HTMLCanvasElement)),
        app: 'knit',
        brand: KNIT,
      },
      'square',
    )
    const [r, , b] = ctx.getImageData(300, 300, 1, 1).data
    expect(r).toBeGreaterThan(b)
  })
})

describe('the cloth picture', () => {
  // 600 × 600 makes 10px threads; 2px in from a thread's corner is clear of its shading.
  const paint = (look: Parameters<typeof clothPainter>[1]) => {
    const ctx = createCanvas(600, 600).getContext('2d') as unknown as CanvasRenderingContext2D
    clothPainter(draft, look)(ctx, 0, 0, 600, 600)
    return (column: number, row: number) => pixel(ctx, column * 10 + 2, row * 10 + 2)
  }
  const drawdown = computeDrawdown(draft)
  const colour = (e: number, p: number) => (drawdown[p][e] ? draft.warpColors[e] : draft.weftColors[p]).toLowerCase()

  it('is the drawdown, square for square, even where a layered view would guess hidden squares', () => {
    const at = paint({})
    for (let p = 0; p < 30; p++) for (let e = 0; e < 30; e++) expect(at(e, p)).toBe(colour(e, p))
  })

  it('puts pick 1 at the bottom and end 1 on the right when the draft view does', () => {
    const at = paint({ pickOneBottom: true, endOneRight: true })
    for (let p = 0; p < 30; p++) for (let e = 0; e < 30; e++) expect(at(59 - e, 59 - p)).toBe(colour(e, p))
  })
})

describe('share links to other sites', () => {
  it('fills in the design’s link and a line about it', () => {
    const link = 'https://example.org/weave/?pattern=abc'
    const links = shareLinks('weave', 'Green blocks', link)
    expect(links.text).toBe('Green blocks: a weaving draft I made with Weave Patterner')
    expect(new URL(links.facebook).searchParams.get('u')).toBe(link)
    expect(new URL(links.x).searchParams.get('url')).toBe(link)
    expect(new URL(links.whatsapp).searchParams.get('text')).toBe(`${links.text} ${link}`)
    const pin = new URL(links.pinterest)
    expect(pin.searchParams.get('url')).toBe(link)
    expect(pin.searchParams.get('media')).toMatch(/^https:\/\/.*\/og-image\.png$/)
    expect(decodeURIComponent(links.email)).toContain(link)
    expect(shareLinks('knit', 'Moss', link).pinterest).toContain(encodeURIComponent('knit/og-image.png'))
  })
})
