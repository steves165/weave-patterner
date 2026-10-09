/**
 * Writes the static pages (guides and patterns) and the sitemap into dist/, after `vite build`. They're plain HTML
 * for search engines and readers; the apps themselves are untouched.
 */
import { execSync } from 'node:child_process'
import { copyFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { buildSite, sitemap } from '../src/site/pages'

const out = join(import.meta.dirname, '..', 'dist')
// The date of the last commit (what changed the site), or today outside git.
let date = new Date().toISOString().slice(0, 10)
try {
  date = execSync('git log -1 --format=%cs', { encoding: 'utf8' }).trim() || date
} catch {
  // not a git checkout
}

const pages = await buildSite()
for (const page of pages) {
  const file = join(out, page.path, 'index.html')
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, page.html)
}
writeFileSync(join(out, 'sitemap.xml'), sitemap(pages, date))
// The apps' fonts for the pages: Nunito for text, Fredoka for the names and headings.
const modules = join(import.meta.dirname, '..', 'node_modules')
mkdirSync(join(out, 'fonts'), { recursive: true })
for (const font of [
  '@fontsource-variable/nunito/files/nunito-latin-wght-normal.woff2',
  '@fontsource/fredoka/files/fredoka-latin-600-normal.woff2',
])
  copyFileSync(join(modules, font), join(out, 'fonts', font.split('/').pop() ?? ''))
console.log(`Wrote ${pages.length} pages and the sitemap (last changed ${date}) to dist/`)
