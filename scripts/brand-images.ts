/**
 * Renders the PNG icons and the social-share preview images into public/ and public/knit/, from the favicons, the
 * sample draft and the Fair Isle sample chart.
 * Run with `npm run images` after changing any of them; the outputs are committed.
 */
import { readFileSync } from 'node:fs'
import { chromium } from '@playwright/test'
import { SAMPLES } from '../src/knit/samples'
import { clothView } from '../src/layers'
import { importFile } from '../src/weave'

const icon = readFileSync(new URL('../public/favicon.svg', import.meta.url), 'utf8')
const knitIcon = readFileSync(new URL('../public/knit/favicon.svg', import.meta.url), 'utf8')
const { draft } = importFile(readFileSync(new URL('../samples/Green blocks.weave.json', import.meta.url), 'utf8'))

/** The sample's face as an SVG of coloured squares, `size` px across. */
function cloth(size: number, ends = 48, picks = 48) {
  const face = clothView(draft, 'face')
  const cell = size / Math.max(ends, picks)
  const rects = face
    .slice(0, picks)
    .flatMap((row, p) =>
      row
        .slice(0, ends)
        .map(
          (s, e) =>
            `<rect x="${e * cell}" y="${p * cell}" width="${cell + 0.3}" height="${cell + 0.3}" fill="${s.color}"/>`,
        ),
    )
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">${rects.join('')}</svg>`
}

const social = `<!doctype html><html><head><style>
  body { margin: 0; width: 1200px; height: 630px; display: flex; font-family: system-ui, sans-serif;
         background: #f5f0e6; color: #2b1d1d; }
  .text { flex: 1; padding: 72px 56px 56px 72px; display: flex; flex-direction: column; }
  .brand { display: flex; align-items: center; gap: 20px; }
  .brand svg { width: 76px; height: 76px; }
  h1 { font-size: 64px; margin: 0; color: #8b0a0a; letter-spacing: -1px; }
  p { font-size: 32px; line-height: 1.3; margin: 36px 0 0; }
  ul { margin: auto 0 0; padding: 0; list-style: none; display: flex; flex-wrap: wrap; gap: 12px; }
  li { font-size: 21px; background: #8b0a0a; color: #fff; padding: 8px 16px; border-radius: 999px; }
  .cloth { width: 470px; height: 630px; overflow: hidden; box-shadow: -8px 0 24px rgba(0,0,0,.18); }
</style></head><body>
  <div class="text">
    <div class="brand">${icon}<h1>Weave Patterner</h1></div>
    <p>Free online weaving draft designer: threading, tie-up, treadling and a live drawdown.</p>
    <ul><li>WIF for looms</li><li>3D cloth preview</li><li>Double cloth</li><li>Overshot &amp; more</li><li>Up to 128 shafts</li></ul>
  </div>
  <div class="cloth">${cloth(630)}</div>
</body></html>`

/** The Fair Isle sample chart, repeated, as an SVG of squares with the chart's grid lines. */
function knitChart(width: number, height: number, cell = 30) {
  const k = SAMPLES.find((s) => s.name === 'Fair Isle peerie')?.chart()
  if (!k) throw new Error('Missing the Fair Isle sample')
  const rows = k.stitch.length
  const w = k.stitch[0].length
  const rects: string[] = []
  for (let y = 0; y * cell < height; y++)
    for (let x = 0; x * cell < width; x++) {
      const color = k.colors[k.color[rows - 1 - (y % rows)][x % w]]
      rects.push(
        `<rect x="${x * cell}" y="${y * cell}" width="${cell}" height="${cell}" fill="${color}" stroke="#00000030"/>`,
      )
    }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">${rects.join('')}</svg>`
}

const knitSocial = `<!doctype html><html><head><style>
  body { margin: 0; width: 1200px; height: 630px; display: flex; font-family: system-ui, sans-serif;
         background: #f5f0e6; color: #1d2b2a; }
  .text { flex: 1; padding: 72px 56px 56px 72px; display: flex; flex-direction: column; }
  .brand { display: flex; align-items: center; gap: 20px; }
  .brand svg { width: 76px; height: 76px; }
  h1 { font-size: 64px; margin: 0; color: #00695c; letter-spacing: -1px; }
  p { font-size: 32px; line-height: 1.3; margin: 36px 0 0; }
  ul { margin: auto 0 0; padding: 0; list-style: none; display: flex; flex-wrap: wrap; gap: 12px; }
  li { font-size: 21px; background: #00695c; color: #fff; padding: 8px 16px; border-radius: 999px; }
  .cloth { width: 470px; height: 630px; overflow: hidden; box-shadow: -8px 0 24px rgba(0,0,0,.18); }
</style></head><body>
  <div class="text">
    <div class="brand">${knitIcon}<h1>Knit Patterner</h1></div>
    <p>Free online knitting chart maker, with the written pattern row by row.</p>
    <ul><li>Lace &amp; cables</li><li>Fair Isle colourwork</li><li>Stitch counts</li><li>Knitted preview</li></ul>
  </div>
  <div class="cloth">${knitChart(470, 630)}</div>
</body></html>`

const browser = await chromium.launch()
const page = await browser.newPage()
for (const [dir, svg] of [
  ['public', icon],
  ['public/knit', knitIcon],
] as const)
  for (const [file, size] of [
    ['apple-touch-icon.png', 180],
    ['icon-192.png', 192],
    ['icon-512.png', 512],
  ] as const) {
    await page.setViewportSize({ width: 600, height: 600 })
    await page.setContent(
      `<html><body style="margin:0">${svg.replace('<svg ', `<svg width="${size}" height="${size}" `)}</body></html>`,
    )
    await page.locator('svg').screenshot({ path: `${dir}/${file}`, omitBackground: true })
  }
await page.setViewportSize({ width: 1200, height: 630 })
await page.setContent(social)
await page.screenshot({ path: 'public/og-image.png' })
await page.setContent(knitSocial)
await page.screenshot({ path: 'public/knit/og-image.png' })
await browser.close()
console.log('Wrote the icons and share images in public/ and public/knit/')
