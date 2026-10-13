/**
 * Gets the desktop app ready to package (electron-builder.yml): desktop/app/ with the built site (dist/), the
 * Electron main program bundled into one file with what it uses (electron-updater), and a package.json with no
 * dependencies (the site's are all bundled by Vite), plus the app icon, drawn from the Weave Patterner mark. Run after
 * `npm run build`:
 *
 *   npx tsx scripts/desktop.ts && npx electron-builder
 */
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { createCanvas } from '@napi-rs/canvas'
import { build } from 'esbuild'
import { TWILL_STEPS } from '../src/marks'

const root = fileURLToPath(new URL('../', import.meta.url))
const app = `${root}desktop/app/`
if (!existsSync(`${root}dist/index.html`)) throw new Error('Build the site first: npm run build')

rmSync(app, { recursive: true, force: true })
mkdirSync(app, { recursive: true })
cpSync(`${root}dist`, `${app}dist`, { recursive: true })
await build({
  entryPoints: [`${root}desktop/main.cjs`],
  outfile: `${app}main.cjs`,
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: 'node22',
  external: ['electron'],
  logLevel: 'warning',
})
const pkg = JSON.parse(readFileSync(`${root}package.json`, 'utf8'))
writeFileSync(
  `${app}package.json`,
  JSON.stringify(
    {
      name: 'weave-patterner',
      productName: 'Weave Patterner',
      version: pkg.version,
      description: 'Weave, Knit and Sew Patterner: weaving drafts, knitting charts and sewing patterns',
      author: pkg.author,
      license: pkg.license,
      homepage: pkg.homepage,
      main: 'main.cjs',
    },
    null,
    2,
  ),
)

// The icon: the mark (twill steps on the accent colour) on a 1024 px square, with the margin macOS icons have.
const size = 1024
const canvas = createCanvas(size, size)
const ctx = canvas.getContext('2d')
const inset = size * 0.1
const s = (size - inset * 2) / 30
ctx.fillStyle = '#D6246E'
ctx.beginPath()
ctx.roundRect(inset, inset, 30 * s, 30 * s, 9 * s)
ctx.fill()
ctx.fillStyle = '#ffffff'
for (const [x, y] of TWILL_STEPS) {
  ctx.beginPath()
  ctx.roundRect(inset + x * s, inset + y * s, 4 * s, 4 * s, 1.3 * s)
  ctx.fill()
}
mkdirSync(`${root}desktop/build`, { recursive: true })
writeFileSync(`${root}desktop/build/icon.png`, canvas.toBuffer('image/png'))
console.log(`Ready to package version ${pkg.version} in desktop/app/`)
