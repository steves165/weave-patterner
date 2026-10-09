/**
 * Writes the static pages (guides and patterns) and the sitemap into dist/, after `vite build`. They're plain HTML
 * for search engines and readers; the apps themselves are untouched.
 */
import { execSync } from 'node:child_process'
import { copyFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { createCanvas, GlobalFonts } from '@napi-rs/canvas'
import { KNIT, WEAVE } from '../src/brands'
import { fabricPainter } from '../src/knit/sharePicture'
import { clothPainter, drawShareCard, type ShareSize } from '../src/shareImage'
import { PICTURES, SITE_URL } from '../src/site/html'
import { type Built, buildSite, sitemap } from '../src/site/pages'

const out = join(import.meta.dirname, '..', 'dist')
// The date of the last commit (what changed the site), or today outside git.
let date = new Date().toISOString().slice(0, 10)
try {
  date = execSync('git log -1 --format=%cs', { encoding: 'utf8' }).trim() || date
} catch {
  // not a git checkout
}

const modules = join(import.meta.dirname, '..', 'node_modules')
const fonts = {
  nunito: '@fontsource-variable/nunito/files/nunito-latin-wght-normal.woff2',
  fredoka: '@fontsource/fredoka/files/fredoka-latin-600-normal.woff2',
}
GlobalFonts.registerFromPath(join(modules, fonts.nunito), 'Nunito')
GlobalFonts.registerFromPath(join(modules, fonts.fredoka), 'Fredoka')

/** A pattern page's pictures: one for link previews, a tall one for Pinterest. */
async function pictures(picture: NonNullable<Built['picture']>, dir: string) {
  const site = new URL(SITE_URL)
  const card = {
    app: picture.app,
    appName: picture.app === 'weave' ? 'Weave Patterner' : 'Knit Patterner',
    brand: picture.app === 'weave' ? WEAVE : KNIT,
    title: picture.title,
    address: `${site.host}${site.pathname}${picture.app === 'knit' ? 'knit' : ''}`.replace(/\/$/, ''),
    design:
      picture.app === 'weave'
        ? clothPainter(picture.draft)
        : fabricPainter(picture.chart, () => createCanvas(1, 1) as unknown as HTMLCanvasElement),
  }
  const sizes: [ShareSize, string][] = [
    ['preview', PICTURES.preview],
    ['tall', PICTURES.pin],
  ]
  for (const [size, name] of sizes) {
    const canvas = createCanvas(1, 1)
    drawShareCard(canvas.getContext('2d') as unknown as CanvasRenderingContext2D, card, size)
    writeFileSync(join(dir, name), await canvas.encode('jpeg', 86))
  }
}

const pages = await buildSite()
for (const page of pages) {
  const dir = join(out, page.path)
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'index.html'), page.html)
  if (page.picture) await pictures(page.picture, dir)
}
writeFileSync(join(out, 'sitemap.xml'), sitemap(pages, date))
// The apps' fonts for the pages: Nunito for text, Fredoka for the names and headings.
mkdirSync(join(out, 'fonts'), { recursive: true })
for (const font of Object.values(fonts))
  copyFileSync(join(modules, font), join(out, 'fonts', font.split('/').pop() ?? ''))
console.log(
  `Wrote ${pages.length} pages, ${pages.filter((p) => p.picture).length * 2} pictures and the sitemap (last changed ${date}) to dist/`,
)
