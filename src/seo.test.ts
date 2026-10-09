import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { buildSite } from './site/pages'

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')
const html = read('index.html')
const meta = (attr: 'name' | 'property', key: string) =>
  html.match(new RegExp(`<meta\\s+${attr}="${key}"\\s+content="([^"]*)"`, 's'))?.[1]

describe('search and sharing metadata', () => {
  it('has a descriptive title and a description of a good length', () => {
    const title = html.match(/<title>(.*)<\/title>/)?.[1] ?? ''
    expect(title).toMatch(/Weave Patterner/)
    expect(title).toMatch(/Weaving Draft/)
    const description = html.match(/<meta\s+name="description"\s+content="([^"]*)"/s)?.[1] ?? ''
    // Search results show about 155–160 characters.
    expect(description.length).toBeGreaterThan(120)
    expect(description.length).toBeLessThanOrEqual(200)
  })

  it('has a canonical link and share previews with an absolute image of the right size', () => {
    expect(html).toContain('<link rel="canonical" href="https://steves165.github.io/weave-patterner/" />')
    expect(meta('property', 'og:image')).toBe('https://steves165.github.io/weave-patterner/og-image.png')
    expect(meta('name', 'twitter:card')).toBe('summary_large_image')
    const png = readFileSync(new URL('../public/og-image.png', import.meta.url))
    expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([1200, 630])
  })

  it('describes the app as a free web application in valid structured data', () => {
    const json = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1] ?? ''
    const data = JSON.parse(json)
    expect(data['@type']).toBe('WebApplication')
    expect(data.offers.price).toBe('0')
    expect(data.url).toBe('https://steves165.github.io/weave-patterner/')
    expect(data.featureList.length).toBeGreaterThan(5)
  })

  it('points only at icons and files that exist', () => {
    // (The guides and patterns are built after the app: see below.)
    for (const [, href] of html.matchAll(/href="\.\/([^"]+)"/g))
      if (!/^(guide|patterns)\//.test(href)) expect(existsSync(`public/${href}`), href).toBe(true)
    const manifest = JSON.parse(read('public/manifest.webmanifest'))
    for (const icon of manifest.icons) expect(existsSync(`public/${icon.src}`), icon.src).toBe(true)
  })

  it('has a crawlable summary of the features for search engines', () => {
    expect(html).toMatch(/<h1>Weave Patterner: free online weaving draft designer<\/h1>/)
    expect(html).toMatch(/overshot, summer and winter/)
    expect(html).toMatch(/jacquard/)
  })

  it('links the guides and drafts, and every link goes to a page that is built', async () => {
    const paths = new Set((await buildSite()).map((p) => p.path))
    for (const [page, base] of [
      [html, ''],
      [read('knit/index.html'), 'knit/'],
    ] as const) {
      const links = [...page.matchAll(/<a href="\.\/((?:guide|patterns)\/[^"]*)"/g)].map((m) => base + m[1])
      expect(links.length).toBeGreaterThan(5)
      for (const link of links) expect(paths.has(link), link).toBe(true)
    }
  })
})

describe('Knit Patterner page metadata', () => {
  const knit = read('knit/index.html')
  it('has its own title, description, canonical link and share image', () => {
    expect(knit.match(/<title>(.*)<\/title>/)?.[1]).toMatch(/Knit Patterner.*Knitting Chart/)
    const description = knit.match(/<meta\s+name="description"\s+content="([^"]*)"/s)?.[1] ?? ''
    expect(description.length).toBeGreaterThan(120)
    expect(description.length).toBeLessThanOrEqual(200)
    expect(knit).toContain('<link rel="canonical" href="https://steves165.github.io/weave-patterner/knit/" />')
    const png = readFileSync(new URL('../public/knit/og-image.png', import.meta.url))
    expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([1200, 630])
  })

  it('has structured data, existing icons, a sitemap entry and links between the two apps', () => {
    const data = JSON.parse(knit.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1] ?? '')
    expect(data.name).toBe('Knit Patterner')
    expect(data.url).toBe('https://steves165.github.io/weave-patterner/knit/')
    for (const [, href] of knit.matchAll(/href="\.\/([^"]+)"/g))
      if (!/^(guide|patterns)\//.test(href)) expect(existsSync(`public/knit/${href}`), href).toBe(true)
    const manifest = JSON.parse(read('public/knit/manifest.webmanifest'))
    for (const icon of manifest.icons) expect(existsSync(`public/knit/${icon.src}`), icon.src).toBe(true)
    expect(knit).toContain('<a href="../">Weave Patterner</a>')
    expect(html).toContain('<a href="./knit/">Knit Patterner</a>')
  })
})
