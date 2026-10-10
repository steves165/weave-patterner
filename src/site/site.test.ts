import { describe, expect, it } from 'vitest'
import { PRESETS } from '../colors'
import { KNIT_HELP } from '../help/knitHelp'
import { WEAVE_HELP } from '../help/weaveHelp'
import { SAMPLES, sampleSlug } from '../knit/samples'
import { decodePattern } from '../share'
import { SITE_URL } from './html'
import { buildSite, colourOrder, period, sitemap } from './pages'

const pages = await buildSite()
const paths = new Set(pages.map((p) => p.path))
const title = (html: string) => html.match(/<title>(.*)<\/title>/)?.[1] ?? ''
const description = (html: string) => html.match(/<meta name="description" content="([^"]*)"/)?.[1] ?? ''
/** Where a relative link from a page goes, as a path from the site root. */
const resolve = (from: string, href: string) => new URL(href, SITE_URL + from).href.slice(SITE_URL.length)

describe('guide and pattern pages', () => {
  it('has a page for every help topic, preset and sample, at its own address', () => {
    for (const t of WEAVE_HELP) expect(paths).toContain(`guide/${t.id}/`)
    for (const t of KNIT_HELP) expect(paths).toContain(`knit/guide/${t.id}/`)
    for (const p of PRESETS) expect(paths).toContain(`patterns/${p.id}/`)
    for (const s of SAMPLES) expect(paths).toContain(`knit/patterns/${sampleSlug(s.name)}/`)
    for (const index of ['guide/', 'patterns/', 'knit/guide/', 'knit/patterns/', 'sew/guide/', 'sew/patterns/'])
      expect(paths).toContain(index)
    expect(paths.size).toBe(pages.length)
  })

  it('gives each page a unique title and description of a good length, a canonical link and valid data', () => {
    const titles = new Set<string>()
    for (const p of pages) {
      const t = title(p.html)
      expect(t.length, p.path).toBeGreaterThan(20)
      expect(t.length, `${p.path}: ${t}`).toBeLessThanOrEqual(90)
      expect(titles.has(t), t).toBe(false)
      titles.add(t)
      const d = description(p.html)
      expect(d.length, `${p.path}: ${d}`).toBeGreaterThanOrEqual(70)
      expect(d.length, `${p.path}: ${d}`).toBeLessThanOrEqual(160)
      expect(p.html).toContain(`<link rel="canonical" href="${SITE_URL}${p.path}" />`)
      const ld = JSON.parse(p.html.match(/<script type="application\/ld\+json">(.*?)<\/script>/)?.[1] ?? '')
      expect(ld[1]['@type']).toBe('BreadcrumbList')
      expect(p.html.match(/<h1>/g)).toHaveLength(1)
    }
  })

  it('only links to pages that exist, the apps, or their files', () => {
    const apps = new Set(['', 'knit/', 'sew/', 'favicon.svg', 'knit/favicon.svg', 'sew/favicon.svg'])
    for (const p of pages)
      for (const [, href] of p.html.matchAll(/href="([^"]+)"/g)) {
        if (/^https?:/.test(href)) continue
        const target = resolve(p.path, href).replace(/[?#].*$/, '')
        expect(paths.has(target) || apps.has(target), `${p.path} → ${href}`).toBe(true)
      }
  })

  it('opens each draft in Weave Patterner from its page', async () => {
    const page = pages.find((p) => p.path === 'patterns/houndstooth/')
    const link = page?.html.match(/href="\.\.\/\.\.\/\?pattern=([^"]+)"/)?.[1] ?? ''
    const { name, draft } = await decodePattern(link)
    expect(name).toBe('Houndstooth')
    expect(draft.warpColors.slice(0, 8)).toEqual([...Array(4).fill('#1f2a44'), ...Array(4).fill('#f3ead8')])
  })

  it('opens each knitting chart in Knit Patterner from its page', () => {
    const page = pages.find((p) => p.path === 'knit/patterns/cable-panel/')
    expect(page?.html).toContain('href="../../../knit/?sample=cable-panel"')
    expect(page?.html).toContain('Written pattern')
  })

  it('gives each pattern page its own pictures, for link previews and Pinterest', () => {
    const patterns = pages.filter((p) => /patterns\/[^/]+\/$/.test(p.path))
    expect(patterns.length).toBeGreaterThan(20)
    for (const p of patterns) {
      expect(p.picture?.title, p.path).toBeTruthy()
      expect(p.html).toContain(`<meta property="og:image" content="${SITE_URL}${p.path}preview.jpg" />`)
      const pin = p.html.match(/href="(https:\/\/www\.pinterest\.com\/pin\/create\/button\/[^"]+)"/)?.[1] ?? ''
      const url = new URL(pin.replaceAll('&amp;', '&'))
      expect(url.searchParams.get('url')).toBe(SITE_URL + p.path)
      expect(url.searchParams.get('media')).toBe(`${SITE_URL}${p.path}pin.jpg`)
      expect(url.searchParams.get('description')).toContain(p.picture?.title)
    }
    // Pages without pictures of their own use the app's.
    expect(pages.find((p) => p.path === 'guide/')?.html).toContain(`content="${SITE_URL}og-image.png"`)
    expect(pages.find((p) => p.path === 'patterns/')?.picture).toBeUndefined()
  })

  it('lists every page in the sitemap with the date it last changed', () => {
    const xml = sitemap(pages, '2026-10-09')
    for (const p of ['', 'knit/', 'sew/', ...paths]) expect(xml).toContain(`<loc>${SITE_URL}${p}</loc>`)
    expect(xml.match(/<lastmod>2026-10-09<\/lastmod>/g)).toHaveLength(paths.size + 3)
  })
})

describe('written drafts', () => {
  it('finds the shortest repeat', () => {
    expect(period([1, 2, 3, 4, 1, 2, 3, 4])).toBe(4)
    expect(period([1, 1, 1])).toBe(1)
    expect(period([1, 2, 3])).toBe(3)
  })

  it('writes colour orders short, grouping what repeats', () => {
    const text = (c: string[]) => colourOrder(c).replace(/<span[^>]*><\/span> /g, '')
    const n = '#1f2a44'
    const c = '#f3ead8'
    expect(text([n, n, n, n, c, c, c, c])).toBe('4 navy, 4 cream')
    expect(text([n])).toBe('all navy')
    expect(text([...Array(4).fill([n, c]).flat(), ...Array(4).fill([c, n]).flat()])).toBe(
      '(1 navy, 1 cream) × 4, (1 cream, 1 navy) × 4',
    )
  })
})

describe('sewing pattern pages', () => {
  it('has a page for every design, opening it in Sew Patterner, with its sketch, pieces, sizes and steps', async () => {
    const pages = await buildSite()
    const page = pages.find((p) => p.path === 'sew/patterns/shift-dress/')
    expect(page?.html).toContain(
      '<a class="button" href="../../../sew/?design=shift-dress">Make this pattern in your size</a>',
    )
    expect(page?.html).toContain('aria-label="Sketch of the shift dress"')
    expect(page?.html).toContain('aria-label="Shift dress pattern pieces in UK 12"')
    expect(page?.html).toContain('<td>UK 24</td>')
    expect(page?.html).toMatch(/<h2>How to sew it<\/h2>\n<ol><li>/)
    expect(page?.picture).toMatchObject({ app: 'sew', title: 'Shift dress' })
    expect(pages.find((p) => p.path === 'sew/guide/measuring/')?.html).toContain('Taking your measurements')
  })
})
