/**
 * Reading a filled-in paper sheet from a scan or photo: the QR code gives the sheet's settings (and so its layout) and
 * roughly where the page is; the four corner marks then pin the page down exactly, even in a photo taken at an angle.
 * Each square is read from its middle, away from the printed lines, against the paper's own white (worked out from
 * the blank border, allowing for uneven light), and the ink colours found are grouped into a few colours.
 */
import jsQR from 'jsqr'
import { fitHomography, type Homography, homography, type Point, project } from './homography'
import {
  cellCentre,
  decodeSpec,
  MARGIN,
  markCentres,
  type SheetLayout,
  type SheetSpec,
  sheetLayout,
  warpStripCentre,
  weftStripCentre,
} from './layout'

/** A picture's pixels, RGBA, row by row (as ImageData has them). */
export interface Picture {
  data: Uint8ClampedArray
  width: number
  height: number
}

export type RGB = [number, number, number]

/** A square read from the sheet: blank paper, or ink of a colour (grouped: `colour` indexes the palette). */
export interface Square {
  marked: boolean
  /** How much of the square's middle is inked, 0 to 1. */
  ink: number
  colour: number
}

export interface Scan {
  spec: SheetSpec
  layout: SheetLayout
  /** The grid's squares, row by row from the top. */
  cells: Square[][]
  /** The colour strips: one square above each column, one beside each row. */
  warp: Square[]
  weft: Square[]
  /** The ink colours found, as #rrggbb, in order of how much each was used. */
  palette: string[]
  /** Where the page sits in the picture: millimetres on the page to pixels. */
  h: Homography
  /** Whether the four corner marks were all found (if not, the QR code alone placed the page). */
  marksFound: boolean
}

/** A smaller copy of a picture, at most `max` pixels on its longer side (averaging the pixels it merges). */
export function shrink(pic: Picture, max: number): Picture {
  const k = Math.max(pic.width, pic.height) / max
  if (k <= 1) return pic
  const width = Math.round(pic.width / k)
  const height = Math.round(pic.height / k)
  const data = new Uint8ClampedArray(width * height * 4)
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const x0 = Math.floor(x * k)
      const y0 = Math.floor(y * k)
      const x1 = Math.min(pic.width, Math.max(x0 + 1, Math.floor((x + 1) * k)))
      const y1 = Math.min(pic.height, Math.max(y0 + 1, Math.floor((y + 1) * k)))
      let r = 0
      let g = 0
      let b = 0
      let n = 0
      for (let yy = y0; yy < y1; yy++)
        for (let xx = x0; xx < x1; xx++) {
          const i = (yy * pic.width + xx) * 4
          r += pic.data[i]
          g += pic.data[i + 1]
          b += pic.data[i + 2]
          n++
        }
      const o = (y * width + x) * 4
      data[o] = r / n
      data[o + 1] = g / n
      data[o + 2] = b / n
      data[o + 3] = 255
    }
  return { data, width, height }
}

/** The colour at a point of the picture, blended from the four pixels round it; null outside it. */
function sample(pic: Picture, p: Point): RGB | null {
  const x = p.x - 0.5
  const y = p.y - 0.5
  if (x < 0 || y < 0 || x > pic.width - 1 || y > pic.height - 1) return null
  const x0 = Math.floor(x)
  const y0 = Math.floor(y)
  const fx = x - x0
  const fy = y - y0
  const at = (xx: number, yy: number, c: number) =>
    pic.data[(Math.min(pic.height - 1, yy) * pic.width + Math.min(pic.width - 1, xx)) * 4 + c]
  const out: RGB = [0, 0, 0]
  for (let c = 0; c < 3; c++)
    out[c] =
      at(x0, y0, c) * (1 - fx) * (1 - fy) +
      at(x0 + 1, y0, c) * fx * (1 - fy) +
      at(x0, y0 + 1, c) * (1 - fx) * fy +
      at(x0 + 1, y0 + 1, c) * fx * fy
  return out
}

const luma = (c: RGB) => 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]

/** CIE Lab of an sRGB colour, to judge how different two colours look. */
export function lab(c: RGB): RGB {
  const lin = (v: number) => {
    const s = v / 255
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }
  const [r, g, b] = c.map(lin)
  const x = (0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047
  const y = 0.2126 * r + 0.7152 * g + 0.0722 * b
  const z = (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116)
  return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))]
}
export const deltaE = (a: RGB, b: RGB) => {
  const [p, q] = [lab(a), lab(b)]
  return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2])
}

/** Finds the QR code, trying the picture at a few sizes (it reads best when the code is neither tiny nor huge). */
function findQr(pic: Picture) {
  for (const size of [2000, 1400, 1000, 700]) {
    const small = shrink(pic, size)
    const found = jsQR(small.data, small.width, small.height, { inversionAttempts: 'attemptBoth' })
    if (found) {
      const k = pic.width / small.width
      const at = (p: Point) => ({ x: p.x * k, y: p.y * k })
      const l = found.location
      return {
        text: found.data,
        corners: [at(l.topLeftCorner), at(l.topRightCorner), at(l.bottomRightCorner), at(l.bottomLeftCorner)],
      }
    }
  }
  return null
}

/**
 * The centre of a corner mark near where it's expected: the dark blob of about the right size nearest the guess.
 * `size` is the mark's size in pixels, as far as the guess goes.
 */
function findMark(pic: Picture, guess: Point, size: number, widen = 1): Point | null {
  const r = Math.ceil(size * 2.2 * widen)
  const x0 = Math.max(0, Math.round(guess.x - r))
  const y0 = Math.max(0, Math.round(guess.y - r))
  const x1 = Math.min(pic.width - 1, Math.round(guess.x + r))
  const y1 = Math.min(pic.height - 1, Math.round(guess.y + r))
  const w = x1 - x0 + 1
  const h = y1 - y0 + 1
  if (w < 4 || h < 4) return null
  const lum = new Float32Array(w * h)
  let lo = 255
  let hi = 0
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = ((y0 + y) * pic.width + x0 + x) * 4
      const v = 0.299 * pic.data[i] + 0.587 * pic.data[i + 1] + 0.114 * pic.data[i + 2]
      lum[y * w + x] = v
      lo = Math.min(lo, v)
      hi = Math.max(hi, v)
    }
  if (hi - lo < 40) return null
  const cut = (lo + hi) / 2
  const seen = new Uint8Array(w * h)
  let best: { p: Point; score: number } | null = null
  const expected = size * size
  for (let start = 0; start < w * h; start++) {
    if (seen[start] || lum[start] > cut) continue
    // Flood the dark blob from here.
    const stack = [start]
    seen[start] = 1
    let n = 0
    let sx = 0
    let sy = 0
    let minX = w
    let maxX = 0
    let minY = h
    let maxY = 0
    while (stack.length) {
      const i = stack.pop() as number
      const x = i % w
      const y = (i - x) / w
      n++
      sx += x
      sy += y
      minX = Math.min(minX, x)
      maxX = Math.max(maxX, x)
      minY = Math.min(minY, y)
      maxY = Math.max(maxY, y)
      for (const j of [i - 1, i + 1, i - w, i + w]) {
        if (j < 0 || j >= w * h || seen[j] || lum[j] > cut) continue
        if ((j === i - 1 && x === 0) || (j === i + 1 && x === w - 1)) continue
        seen[j] = 1
        stack.push(j)
      }
    }
    const bw = maxX - minX + 1
    const bh = maxY - minY + 1
    // A solid, squarish blob of about the right area.
    const fill = n / (bw * bh)
    if (n < expected * 0.35 || n > expected * 2.5 || fill < 0.6 || bw > bh * 1.8 || bh > bw * 1.8) continue
    const p = { x: x0 + sx / n + 0.5, y: y0 + sy / n + 0.5 }
    const score = Math.hypot(p.x - guess.x, p.y - guess.y) + Math.abs(Math.log(n / expected)) * size
    if (!best || score < best.score) best = { p, score }
  }
  return best?.p ?? null
}

/** How many pixels a millimetre is near a point, under a homography. */
const pxPerMm = (h: Homography, p: Point) => {
  const a = project(h, p)
  const b = project(h, { x: p.x + 1, y: p.y })
  const c = project(h, { x: p.x, y: p.y + 1 })
  return (Math.hypot(b.x - a.x, b.y - a.y) + Math.hypot(c.x - a.x, c.y - a.y)) / 2
}

/**
 * The paper's white across the page, as a plane per colour channel (light falls off across a photo): fitted to points
 * in the blank border, twice, the second time leaving out points much darker than the first fit (ink, or the table
 * where the page was cropped close).
 */
function paperWhite(pic: Picture, h: Homography, l: SheetLayout): (p: Point) => RGB {
  const pts: { p: Point; c: RGB }[] = []
  const edge = MARGIN / 2
  const { w, h: ph } = l.page
  for (let x = edge; x <= w - edge; x += 12)
    pts.push({ p: { x, y: edge }, c: [0, 0, 0] }, { p: { x, y: ph - edge }, c: [0, 0, 0] })
  for (let y = edge + 12; y <= ph - edge - 12; y += 12)
    pts.push({ p: { x: edge, y }, c: [0, 0, 0] }, { p: { x: w - edge, y }, c: [0, 0, 0] })
  const found = pts.flatMap(({ p }) => {
    const c = sample(pic, project(h, p))
    return c ? [{ p, c }] : []
  })
  if (found.length < 6) return () => [255, 255, 255]
  const fitPlane = (use: typeof found) => {
    // Least squares for c = a + b x + d y, per channel.
    const n = use.length
    let sx = 0
    let sy = 0
    let sxx = 0
    let syy = 0
    let sxy = 0
    for (const { p } of use) {
      sx += p.x
      sy += p.y
      sxx += p.x * p.x
      syy += p.y * p.y
      sxy += p.x * p.y
    }
    const coeffs = [0, 1, 2].map((ch) => {
      let sc = 0
      let sxc = 0
      let syc = 0
      for (const { p, c } of use) {
        sc += c[ch]
        sxc += p.x * c[ch]
        syc += p.y * c[ch]
      }
      const m = [
        [n, sx, sy],
        [sx, sxx, sxy],
        [sy, sxy, syy],
      ]
      const det = (a: number[][]) =>
        a[0][0] * (a[1][1] * a[2][2] - a[1][2] * a[2][1]) -
        a[0][1] * (a[1][0] * a[2][2] - a[1][2] * a[2][0]) +
        a[0][2] * (a[1][0] * a[2][1] - a[1][1] * a[2][0])
      const d = det(m)
      if (Math.abs(d) < 1e-9) return [sc / n, 0, 0]
      const col = (k: number, v: number[]) => m.map((row, i) => row.map((x, j) => (j === k ? v[i] : x)))
      const v = [sc, sxc, syc]
      return [det(col(0, v)) / d, det(col(1, v)) / d, det(col(2, v)) / d]
    })
    return (p: Point): RGB => coeffs.map(([a, b, c]) => a + b * p.x + c * p.y) as RGB
  }
  let model = fitPlane(found)
  for (let round = 0; round < 2; round++) {
    const kept = found.filter(({ p, c }) => luma(c) > luma(model(p)) - 25)
    if (kept.length >= 6) model = fitPlane(kept)
  }
  return model
}

/** Reads one square: samples across its middle half, each judged against the paper's white there. */
function readSquare(pic: Picture, h: Homography, centre: Point, cell: number, white: (p: Point) => RGB) {
  const inks: RGB[] = []
  let total = 0
  const steps = 5
  for (let i = 0; i < steps; i++)
    for (let j = 0; j < steps; j++) {
      const p = {
        x: centre.x + ((i + 0.5) / steps - 0.5) * cell * 0.5,
        y: centre.y + ((j + 0.5) / steps - 0.5) * cell * 0.5,
      }
      const c = sample(pic, project(h, p))
      if (!c) continue
      total++
      const wh = white(p)
      // Balanced against the paper: the paper reads as pure white.
      const balanced = c.map((v, k) => Math.max(0, Math.min(255, (v / Math.max(30, wh[k])) * 255))) as RGB
      if (deltaE(balanced, [255, 255, 255]) > 14) inks.push(balanced)
    }
  const ink = total ? inks.length / total : 0
  const colour: RGB = inks.length
    ? ([0, 1, 2].map((k) => inks.reduce((s, c) => s + c[k], 0) / inks.length) as RGB)
    : [255, 255, 255]
  return { marked: ink >= 0.4, ink, colour }
}

const hex = (c: RGB) =>
  `#${c
    .map((v) =>
      Math.round(Math.max(0, Math.min(255, v)))
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`

/**
 * Groups ink colours: each joins the nearest group within `near` (CIE76 ΔE) or starts one; groups are their members'
 * average. Returns each colour's group, and the groups' colours, the most used first.
 */
export function groupColours(colours: RGB[], near = 20): { index: number[]; palette: RGB[] } {
  const groups: { sum: RGB; n: number; members: number[] }[] = []
  const mean = (g: (typeof groups)[number]) => g.sum.map((v) => v / g.n) as RGB
  colours.forEach((c, i) => {
    let best = -1
    let bestD = near
    for (const [k, g] of groups.entries()) {
      const d = deltaE(c, mean(g))
      if (d < bestD) {
        bestD = d
        best = k
      }
    }
    if (best < 0) groups.push({ sum: [...c] as RGB, n: 1, members: [i] })
    else {
      const g = groups[best]
      g.sum = g.sum.map((v, k) => v + c[k]) as RGB
      g.n++
      g.members.push(i)
    }
  })
  const order = groups.map((_, k) => k).sort((a, b) => groups[b].n - groups[a].n)
  const index = Array<number>(colours.length).fill(-1)
  order.forEach((k, rank) => {
    for (const i of groups[k].members) index[i] = rank
  })
  return { index, palette: order.map((k) => mean(groups[k])) }
}

/** Reads a filled-in sheet from a picture of it. Throws, saying what went wrong, when it can't. */
export function readSheet(pic: Picture): Scan {
  const qr = findQr(pic)
  if (!qr)
    throw new Error(
      'Couldn’t find the sheet’s QR code. Take the picture of the whole page, flat, in good light, and in focus.',
    )
  const spec = decodeSpec(qr.text)
  if (!spec) throw new Error('That QR code isn’t from a Weave Patterner paper sheet.')
  const layout = sheetLayout(spec)
  const q = layout.qr
  const rough = homography(
    [
      { x: q.x, y: q.y },
      { x: q.x + q.w, y: q.y },
      { x: q.x + q.w, y: q.y + q.h },
      { x: q.x, y: q.y + q.h },
    ],
    qr.corners,
  )
  if (!rough) throw new Error('Couldn’t line up the sheet: take the picture straight on, with the whole page in it.')
  // The corner marks pin the page down. Nearest the QR code first: each one found makes the guess for the next better
  // (a guess from the small QR code alone can be well out at the far side of a page photographed at an angle), and
  // the search widens if a mark isn't where it was expected.
  const centres = markCentres(layout)
  const qrMid = { x: q.x + q.w / 2, y: q.y + q.h / 2 }
  const order = centres
    .map((c, i) => ({ i, d: Math.hypot(c.x - qrMid.x, c.y - qrMid.y) }))
    .sort((a, b) => a.d - b.d)
    .map((x) => x.i)
  const known = {
    from: [
      { x: q.x, y: q.y },
      { x: q.x + q.w, y: q.y },
      { x: q.x + q.w, y: q.y + q.h },
      { x: q.x, y: q.y + q.h },
    ],
    to: [...qr.corners],
  }
  const found: (Point | null)[] = centres.map(() => null)
  for (const i of order) {
    const guessH = fitHomography(known.from, known.to) ?? rough
    const guess = project(guessH, centres[i])
    const size = layout.marks[i].w * pxPerMm(guessH, centres[i])
    for (const widen of [1, 2, 3.5]) {
      found[i] = findMark(pic, guess, size, widen)
      if (found[i]) break
    }
    const at = found[i]
    if (at) {
      known.from.push(centres[i])
      known.to.push(at)
    }
  }
  const marksFound = found.every(Boolean)
  const h = (marksFound && homography(centres, found as Point[])) || fitHomography(known.from, known.to) || rough
  const white = paperWhite(pic, h, layout)

  const cell = layout.grid.cell
  const cellsRaw = Array.from({ length: spec.picks }, (_, r) =>
    Array.from({ length: spec.ends }, (_, c) => readSquare(pic, h, cellCentre(layout, r, c), cell, white)),
  )
  const warpRaw = Array.from({ length: spec.ends }, (_, c) =>
    readSquare(pic, h, warpStripCentre(layout, c), cell, white),
  )
  const weftRaw = Array.from({ length: spec.picks }, (_, r) =>
    readSquare(pic, h, weftStripCentre(layout, r), cell, white),
  )
  const all = [...cellsRaw.flat(), ...warpRaw, ...weftRaw]
  const inked = all.filter((s) => s.marked)
  const { index, palette } = groupColours(inked.map((s) => s.colour))
  const groupOf = new Map(inked.map((s, i) => [s, index[i]]))
  const square = (s: (typeof all)[number]): Square => ({ marked: s.marked, ink: s.ink, colour: groupOf.get(s) ?? -1 })
  return {
    spec,
    layout,
    cells: cellsRaw.map((row) => row.map(square)),
    warp: warpRaw.map(square),
    weft: weftRaw.map(square),
    palette: palette.map(hex),
    h,
    marksFound,
  }
}
