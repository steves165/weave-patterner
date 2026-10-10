/**
 * Pictures of a design for social media: the cloth or knitted fabric filling most of the picture, with the design's
 * name and the app underneath. Drawn on a canvas, so the same code makes them in the browser (Share) and in Node
 * when the static pages are built (with @napi-rs/canvas).
 */
import type { AppId, Brand } from './brands'
import { clothView } from './layers'
import { KNIT_VS, SEW_NEEDLE, SEW_STITCHES, TWILL_STEPS } from './marks'
import type { Draft } from './weave'

type Ctx = CanvasRenderingContext2D

/** Sizes that suit each site: Instagram's square post, Pinterest's tall pin, and a link preview. */
export const SHARE_SIZES = {
  square: { width: 1080, height: 1080 },
  tall: { width: 1000, height: 1500 },
  preview: { width: 1200, height: 630 },
} as const
export type ShareSize = keyof typeof SHARE_SIZES

/** Something that draws the design into a box. */
export type DesignPainter = (ctx: Ctx, x: number, y: number, w: number, h: number) => void

/** The woven face of a draft, repeated to fill the box, each crossing shaded along its thread so it looks woven. */
export function clothPainter(d: Draft): DesignPainter {
  return (ctx, x, y, w, h) => {
    const face = clothView(d, 'face')
    // About 60 threads across the shorter side: enough to see the pattern repeat, big enough to see the threads.
    const cell = Math.max(4, Math.round(Math.min(w, h) / 60))
    const edge = Math.max(1, cell * 0.14)
    for (let p = 0; p * cell < h; p++) {
      const row = face[p % d.picks]
      for (let e = 0; e * cell < w; e++) {
        const s = row[e % d.ends]
        const cx = x + e * cell
        const cy = y + p * cell
        ctx.fillStyle = s.color
        ctx.fillRect(cx, cy, cell, cell)
        // Shadow along the sides of the thread on top, and a little light down its middle.
        ctx.fillStyle = 'rgba(0,0,0,0.2)'
        if (s.warp) {
          ctx.fillRect(cx, cy, edge, cell)
          ctx.fillRect(cx + cell - edge, cy, edge, cell)
        } else {
          ctx.fillRect(cx, cy, cell, edge)
          ctx.fillRect(cx, cy + cell - edge, cell, edge)
        }
        ctx.fillStyle = 'rgba(255,255,255,0.1)'
        if (s.warp) ctx.fillRect(cx + cell * 0.35, cy, cell * 0.3, cell)
        else ctx.fillRect(cx, cy + cell * 0.35, cell, cell * 0.3)
      }
    }
  }
}

/** An app's mark (the logo square) at x, y. */
function drawMark(ctx: Ctx, app: AppId, x: number, y: number, size: number, accent: string, on: string) {
  const s = size / 30
  ctx.fillStyle = accent
  ctx.beginPath()
  ctx.roundRect(x, y, size, size, 9 * s)
  ctx.fill()
  if (app === 'weave') {
    ctx.fillStyle = on
    for (const [mx, my] of TWILL_STEPS) {
      ctx.beginPath()
      ctx.roundRect(x + mx * s, y + my * s, 4 * s, 4 * s, 1.3 * s)
      ctx.fill()
    }
  } else if (app === 'sew') {
    ctx.strokeStyle = on
    ctx.lineWidth = 2.2 * s
    ctx.lineCap = 'round'
    const n = SEW_NEEDLE
    ctx.beginPath()
    ctx.moveTo(x + n.from[0] * s, y + n.from[1] * s)
    ctx.lineTo(x + n.to[0] * s, y + n.to[1] * s)
    for (const [a, b, c, d] of SEW_STITCHES) {
      ctx.moveTo(x + a * s, y + b * s)
      ctx.lineTo(x + c * s, y + d * s)
    }
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(x + n.eye[0] * s, y + n.eye[1] * s, n.eyeR * s, 0, 2 * Math.PI)
    ctx.stroke()
  } else {
    ctx.strokeStyle = on
    ctx.lineWidth = 2.2 * s
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    for (const [mx, my] of KNIT_VS) {
      ctx.beginPath()
      ctx.moveTo(x + mx * s, y + my * s)
      ctx.lineTo(x + (mx + 4) * s, y + (my + 5) * s)
      ctx.lineTo(x + (mx + 8) * s, y + my * s)
      ctx.stroke()
    }
  }
}

/** Text cut short with an ellipsis to fit `width`. */
function shorten(ctx: Ctx, text: string, width: number): string {
  if (ctx.measureText(text).width <= width) return text
  let t = text
  while (t.length > 1 && ctx.measureText(`${t}…`).width > width) t = t.slice(0, -1)
  return `${t.trimEnd()}…`
}

export interface ShareCard {
  app: AppId
  appName: string
  brand: Brand
  /** The design's name. */
  title: string
  /** Where to find the app, without https://: steves165.github.io/weave-patterner. */
  address: string
  design: DesignPainter
}

/** Draws the picture onto `ctx`, whose canvas is resized to `size`. */
export function drawShareCard(ctx: Ctx, card: ShareCard, size: ShareSize) {
  const { width: W, height: H } = SHARE_SIZES[size]
  ctx.canvas.width = W
  ctx.canvas.height = H
  const { brand } = card
  ctx.fillStyle = brand.paper.light
  ctx.fillRect(0, 0, W, H)
  const landscape = W > H * 1.2
  const m = Math.round(Math.min(W, H) * (landscape ? 0.07 : 0.06))
  // Landscape (a link preview): the design on the left, the words beside it. Otherwise the words underneath.
  const box = landscape
    ? { x: m, y: m, w: Math.round(W * 0.5) - m, h: H - 2 * m }
    : { x: m, y: m, w: W - 2 * m, h: Math.round(H - m - W * 0.2) }
  ctx.save()
  ctx.beginPath()
  ctx.roundRect(box.x, box.y, box.w, box.h, m * 0.5)
  ctx.clip()
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(box.x, box.y, box.w, box.h)
  card.design(ctx, box.x, box.y, box.w, box.h)
  ctx.restore()

  const unit = Math.min(W, H > W ? W : H * 1.6) / 1000
  const textX = landscape ? box.x + box.w + m : m
  const textW = W - textX - m
  const mark = Math.round(84 * unit)
  ctx.textBaseline = 'alphabetic'
  ctx.textAlign = 'left'
  if (landscape) {
    drawMark(ctx, card.app, textX, m, mark, brand.accent.light, '#ffffff')
    ctx.fillStyle = brand.text.light
    ctx.font = `600 ${Math.round(64 * unit)}px Fredoka, 'Nunito Variable', Nunito, sans-serif`
    const words = card.title.split(/\s+/)
    // The name over up to three lines.
    const lines: string[] = []
    for (const word of words) {
      const last = lines[lines.length - 1]
      if (last !== undefined && ctx.measureText(`${last} ${word}`).width <= textW)
        lines[lines.length - 1] = `${last} ${word}`
      else lines.push(word)
    }
    const shown = lines.slice(0, 3)
    if (lines.length > 3) shown[2] = shorten(ctx, `${shown[2]} ${lines.slice(3).join(' ')}`, textW)
    const lineH = Math.round(76 * unit)
    let y = m + mark + lineH * 1.3
    for (const line of shown) {
      ctx.fillText(shorten(ctx, line, textW), textX, y)
      y += lineH
    }
    ctx.fillStyle = brand.accent.light
    ctx.font = `700 ${Math.round(34 * unit)}px 'Nunito Variable', Nunito, sans-serif`
    ctx.fillText(shorten(ctx, `Made with ${card.appName}`, textW), textX, H - m - Math.round(44 * unit))
    ctx.fillStyle = brand.muted.light
    ctx.font = `600 ${Math.round(26 * unit)}px 'Nunito Variable', Nunito, sans-serif`
    ctx.fillText(shorten(ctx, card.address, textW), textX, H - m)
  } else {
    const top = box.y + box.h + Math.round(36 * unit)
    drawMark(ctx, card.app, textX, top + Math.round(10 * unit), mark * 1.2, brand.accent.light, '#ffffff')
    const x = textX + mark * 1.2 + Math.round(28 * unit)
    const w = W - x - m
    ctx.fillStyle = brand.text.light
    ctx.font = `600 ${Math.round(52 * unit)}px Fredoka, 'Nunito Variable', Nunito, sans-serif`
    ctx.fillText(shorten(ctx, card.title, w), x, top + Math.round(48 * unit))
    ctx.fillStyle = brand.accent.light
    ctx.font = `700 ${Math.round(30 * unit)}px 'Nunito Variable', Nunito, sans-serif`
    ctx.fillText(shorten(ctx, `Made with ${card.appName}`, w), x, top + Math.round(90 * unit))
    ctx.fillStyle = brand.muted.light
    ctx.font = `600 ${Math.round(24 * unit)}px 'Nunito Variable', Nunito, sans-serif`
    ctx.fillText(shorten(ctx, card.address, w), x, top + Math.round(124 * unit))
  }
}
