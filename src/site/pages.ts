import { PRESETS, toRuns } from '../colors'
import { KNIT_HELP } from '../help/knitHelp'
import type { Topic } from '../help/types'
import { WEAVE_HELP } from '../help/weaveHelp'
import { threadingLines, tieupLines, treadlingLines } from '../instructions'
import { colorLetter, type KnitChart, usedColors } from '../knit/chart'
import { castOnText, writtenRows } from '../knit/instructions'
import { SAMPLES, sampleSlug } from '../knit/samples'
import { STITCHES, type StitchId } from '../knit/stitches'
import { findRepeat } from '../repeat'
import { encodePattern, SHARE_KEY } from '../share'
import { type App, blocks, describe, esc, KNIT_APP, type Page, plain, render, SITE_URL, WEAVE_APP } from './html'
import { chartSvg, clothSvg, draftSvg } from './pictures'

/** The colours the pattern pages show the presets in: navy, cream and a brick-red accent. */
const PATTERN_COLOURS = { dark: '#1f2a44', light: '#f3ead8', accent: '#b23a48' }

/** A built page: where it goes (from the site root, ending "/") and its HTML. */
export interface Built {
  path: string
  html: string
}

const craft = (app: App) => (app.id === 'weave' ? 'weaving' : 'knitting')

/** The guides: an index of the help topics, and a page for each. */
function guides(app: App, topics: Topic[]): Built[] {
  const base = `${app.path}guide/`
  const link = (id: string) =>
    id === 'tour' ? `{root}${app.path}` : topics.some((t) => t.id === id) ? `{root}${base}${id}/` : null
  const crumbs = [{ name: app.name, path: app.path }]
  const index: Page = {
    path: base,
    title: `${app.name} guides: how to use the free ${craft(app)} ${app.id === 'weave' ? 'draft designer' : 'chart maker'}`,
    description: describe(
      `Step-by-step guides to ${app.name}: ${topics
        .slice(0, 6)
        .map((t) => t.title.toLowerCase())
        .join(', ')} and more, with keyboard shortcuts and a glossary of ${craft(app)} terms.`,
    ),
    heading: `${app.name} guides`,
    crumbs,
    type: 'CollectionPage',
    content: `<p>How to use ${app.name}, part by part. The same guides are in the app: press <kbd>F1</kbd> for help with whatever you are working on.</p>
<ul class="cards">${topics.map((t) => `<li><a href="{root}${base}${t.id}/">${esc(t.title)}</a><p>${esc(t.summary)}</p></li>`).join('')}</ul>
<p><a class="button" href="{root}${app.path}">Open ${app.name}</a></p>`,
  }
  const pages = topics.map((t, i): Page => {
    const first = t.body.find((b) => 'p' in b || 'list' in b || 'steps' in b)
    const lead =
      first && 'p' in first
        ? first.p
        : first && 'list' in first
          ? first.list.join(' ')
          : first && 'steps' in first
            ? first.steps.join(' ')
            : ''
    const prev = topics[i - 1]
    const next = topics[i + 1]
    return {
      path: `${base}${t.id}/`,
      title: `${t.title} – ${craft(app)} guide | ${app.name}`,
      description: describe(
        `${t.summary}. ${plain(lead)}`.length >= 90
          ? `${t.summary}. ${plain(lead)}`
          : `${t.summary}. ${plain(lead)} A free ${craft(app)} guide from ${app.name}, the online ${app.id === 'weave' ? 'weaving draft designer' : 'knitting chart maker'}.`,
      ),
      heading: t.title,
      crumbs: [...crumbs, { name: 'Guides', path: base }],
      type: 'TechArticle',
      content: `<p><em>${esc(t.summary)}.</em></p>
${blocks(t.body, link)}
<p><a class="button" href="{root}${app.path}">Try it in ${app.name}</a></p>
<nav aria-label="More guides"><p>${prev ? `← <a href="{root}${base}${prev.id}/">${esc(prev.title)}</a>` : ''}${prev && next ? ' · ' : ''}${next ? `<a href="{root}${base}${next.id}/">${esc(next.title)}</a> →` : ''}</p><p><a href="{root}${base}">All ${app.name} guides</a></p></nav>`,
    }
  })
  return [index, ...pages].map((p) => ({ path: p.path, html: render(app, p) }))
}

/** The shortest repeat of a sequence: the first n items, repeated a whole number of times, give the whole. */
export function period<T>(xs: T[], same: (a: T, b: T) => boolean = (a, b) => a === b): number {
  for (let n = 1; n < xs.length; n++) if (xs.length % n === 0 && xs.every((x, i) => same(x, xs[i % n]))) return n
  return xs.length
}

const COLOUR_NAMES: Record<string, string> = {
  [PATTERN_COLOURS.dark]: 'navy',
  [PATTERN_COLOURS.light]: 'cream',
  [PATTERN_COLOURS.accent]: 'red',
}
const swatch = (c: string) =>
  `<span style="display:inline-block;width:0.9em;height:0.9em;border-radius:3px;vertical-align:-0.1em;border:1px solid #8888;background:${c}"></span>`

/**
 * One repeat of a colour order, written short: "4 navy, 4 cream", or with groups that repeat,
 * "(4 navy, 4 cream) × 4, (2 navy, 2 cream) × 8"; "all navy" for one colour.
 */
export function colourOrder(colours: string[]): string {
  const one = colours.slice(0, period(colours))
  const name = (c: string) => `${swatch(c)} ${esc(COLOUR_NAMES[c] ?? c)}`
  if (one.length === 1) return `all ${name(one[0])}`
  const runs = (xs: string[]) =>
    toRuns(xs)
      .map((r) => `${r.count} ${name(r.color)}`)
      .join(', ')
  const parts: string[] = []
  let i = 0
  while (i < one.length) {
    // The run of threads that repeats over the most threads from here (the shortest, if several do).
    let best = { size: 1, times: 1 }
    for (let size = 1; size <= 16 && i + size * 2 <= one.length; size++) {
      let times = 1
      while (
        i + (times + 1) * size <= one.length &&
        one.slice(i + times * size, i + (times + 1) * size).every((c, k) => c === one[i + k])
      )
        times++
      if (times > 1 && size * times > best.size * best.times) best = { size, times }
    }
    const unit = one.slice(i, i + best.size)
    // A colour repeated is just a longer stripe: "4 navy".
    parts.push(
      best.size === 1 || best.times === 1
        ? runs(one.slice(i, i + best.size * best.times))
        : `(${runs(unit)}) × ${best.times}`,
    )
    i += best.size * best.times
  }
  return parts.join(', ')
}

/** The weaving patterns: the colour-and-weave presets, each with its draft, written out, and a link to open it. */
async function weavePatterns(): Promise<Built[]> {
  const app = WEAVE_APP
  const base = 'patterns/'
  const crumbs = [{ name: app.name, path: app.path }]
  const { dark, light, accent } = PATTERN_COLOURS
  const built = PRESETS.map((p) => ({ p, d: p.build(dark, light, accent) }))
  const index: Page = {
    path: base,
    title: 'Free weaving drafts: houndstooth, Glen check, herringbone and more | Weave Patterner',
    description: describe(
      `${built.length} free weaving drafts with threading, tie-up and treadling: ${built
        .map(({ p }) => p.name.toLowerCase())
        .join(', ')}. Open any of them in Weave Patterner to change it.`,
    ),
    heading: 'Free weaving drafts',
    crumbs,
    type: 'CollectionPage',
    content: `<p>Classic colour-and-weave patterns, checks, stripes and twills, each with its full draft. Open one in Weave Patterner to change the colours, size or structure, or find them all in the app under <strong>Colours and presets</strong>.</p>
<ul class="cards">${built.map(({ p, d }) => `<li>${clothSvg(d, '', 160).replace('role="img" aria-label=""', 'aria-hidden="true"')}<a href="{root}${base}${p.id}/">${esc(p.name)}</a><p>${esc(p.description)}</p></li>`).join('')}</ul>`,
  }
  const pages = await Promise.all(
    built.map(async ({ p, d }, i): Promise<Page> => {
      const repeat = findRepeat(d)
      const share = await encodePattern(p.name, d)
      const others = [built[(i + 1) % built.length], built[(i + 2) % built.length], built[(i + 3) % built.length]]
      return {
        path: `${base}${p.id}/`,
        title: `${p.name} weaving draft – free ${d.shafts}-shaft pattern | Weave Patterner`,
        description: describe(
          `${p.name}: ${p.description}. A free ${d.shafts}-shaft weaving draft with threading, tie-up, treadling and colour order. Open it in Weave Patterner to change it.`,
        ),
        heading: `${p.name} weaving draft`,
        crumbs: [...crumbs, { name: 'Patterns', path: base }],
        type: 'CreativeWork',
        content: `<p>${esc(p.description)}. ${d.shafts} shafts and ${d.treadles} treadles; the pattern repeats every ${repeat.ends} ends and ${repeat.picks} picks.</p>
<figure>${draftSvg(d, `${p.name} draft: threading, tie-up, treadling and drawdown`)}<figcaption>The draft: threading at the top, tie-up at the top right, treadling at the right (pick 1 at the top) and the drawdown, the cloth they make.</figcaption></figure>
<p><a class="button" href="{root}#${SHARE_KEY}=${share}">Open this draft in Weave Patterner</a></p>
<h2>Threading</h2>
<p>The shaft each end goes on, from end 1; repeat it across the warp:</p>
<pre>${threadingLines({ ...d, threading: d.threading.slice(0, period(d.threading)) })
          .map(esc)
          .join('\n')}</pre>
<h2>Tie-up</h2>
<ul>${tieupLines(d)
          .map((l) => `<li>${esc(l)}</li>`)
          .join('')}</ul>
<h2>Treadling</h2>
<p>The treadle for each pick, from pick 1; repeat it for the length of the cloth:</p>
<pre>${treadlingLines({
          ...d,
          treadling: d.treadling.slice(
            0,
            period(d.treadling, (a, b) => a.join() === b.join()),
          ),
        })
          .map(esc)
          .join('\n')}</pre>
<h2>Colour order</h2>
<p><strong>Warp:</strong> ${colourOrder(d.warpColors)}; repeat across the warp.</p>
<p><strong>Weft:</strong> ${colourOrder(d.weftColors)}; repeat up the cloth.</p>
<p>Use any two colours with good contrast in place of navy and cream: the effect comes from the order of the colours and the weave together. See the <a href="{root}guide/colours/">colours guide</a> and <a href="{root}guide/drawdown/">how to read a drawdown</a>.</p>
<h2>More drafts</h2>
<ul>${others.map((o) => `<li><a href="{root}${base}${o.p.id}/">${esc(o.p.name)}</a>: ${esc(o.p.description)}</li>`).join('')}</ul>
<p><a href="{root}${base}">All weaving drafts</a></p>`,
      }
    }),
  )
  return [index, ...pages].map((p) => ({ path: p.path, html: render(app, p) }))
}

/** The stitches a chart uses, with what they mean. */
function abbreviations(k: KnitChart): string {
  const used = new Set<StitchId>(k.stitch.flat())
  return `<dl>${Object.values(STITCHES)
    .filter((s) => used.has(s.id) && s.id !== 'none')
    .map(
      (s) => `<dt>${esc(s.name)}${s.symbol ? ` (chart symbol ${esc(s.symbol)})` : ''}</dt><dd>${esc(s.explain)}</dd>`,
    )
    .join('')}</dl>`
}

/** The knitting patterns: Knit Patterner's samples, each with its chart, written pattern and a link to open it. */
function knitPatterns(): Built[] {
  const app = KNIT_APP
  const base = 'knit/patterns/'
  const crumbs = [{ name: app.name, path: app.path }]
  const built = SAMPLES.map((s) => ({ s, k: s.chart(), slug: sampleSlug(s.name) }))
  const index: Page = {
    path: base,
    title: 'Free knitting charts with written instructions | Knit Patterner',
    description: describe(
      `Free knitting charts with row-by-row written instructions: ${built
        .map(({ s }) => s.name.toLowerCase())
        .join(', ')}. Open any of them in Knit Patterner to change it.`,
    ),
    heading: 'Free knitting charts',
    crumbs,
    type: 'CollectionPage',
    content: `<p>Rib, texture, cables, lace and colourwork charts, each written out row by row. Open one in Knit Patterner to change it, or find them in the app under <strong>Samples</strong>.</p>
<ul class="cards">${built.map(({ s, k, slug }) => `<li>${chartSvg(k, '', 12).replace('role="img" aria-label=""', 'aria-hidden="true"')}<a href="{root}${base}${slug}/">${esc(s.name)}</a><p>${esc(s.about)}</p></li>`).join('')}</ul>`,
  }
  const pages = built.map(({ s, k, slug }, i): Page => {
    const colours = usedColors(k)
    const others = [built[(i + 1) % built.length], built[(i + 2) % built.length]]
    return {
      path: `${base}${slug}/`,
      title: `${s.name} knitting chart – free pattern with written instructions | Knit Patterner`,
      description: describe(
        `${s.name}: ${s.about} A free knitting chart with row-by-row written instructions and abbreviations. Open it in Knit Patterner to change it.`,
      ),
      heading: `${s.name} knitting chart`,
      crumbs: [...crumbs, { name: 'Patterns', path: base }],
      type: 'CreativeWork',
      content: `<p>${esc(s.about)}</p>
<figure>${chartSvg(k, `${s.name} chart`)}<figcaption>Read the chart from the bottom: row 1 is at the bottom, and each row starts at the side its number is on.${colours.length > 1 ? ` Colours: ${colours.map((c) => `${colorLetter(c)} ${esc(k.colors[c])}`).join(', ')}.` : ''}</figcaption></figure>
<p><a class="button" href="{root}${app.path}#sample=${slug}">Open this chart in Knit Patterner</a></p>
<h2>Written pattern</h2>
<p>${esc(castOnText(k))}</p>
<ul>${writtenRows(k)
        .map((r) => `<li><strong>${esc(r.label)}${r.side ? ` (${r.side})` : ''}:</strong> ${esc(r.text)}</li>`)
        .join('')}</ul>
<p>Repeat these ${k.mode === 'round' ? 'rounds' : 'rows'} for the length you want.</p>
<h2>Abbreviations</h2>
${abbreviations(k)}
<p>New to charts? See <a href="{root}${app.path}guide/reading/">how to read a knitting chart</a>.</p>
<h2>More charts</h2>
<ul>${others.map((o) => `<li><a href="{root}${base}${o.slug}/">${esc(o.s.name)}</a>: ${esc(o.s.about)}</li>`).join('')}</ul>
<p><a href="{root}${base}">All knitting charts</a></p>`,
    }
  })
  return [index, ...pages].map((p) => ({ path: p.path, html: render(app, p) }))
}

/** Every static page. */
export async function buildSite(): Promise<Built[]> {
  return [
    ...guides(WEAVE_APP, WEAVE_HELP),
    ...guides(KNIT_APP, KNIT_HELP),
    ...(await weavePatterns()),
    ...knitPatterns(),
  ]
}

/** The sitemap: the two apps and every static page, each last changed on `date` (YYYY-MM-DD). */
export function sitemap(pages: Built[], date: string): string {
  const entry = (path: string, priority: string) =>
    `  <url>\n    <loc>${SITE_URL}${path}</loc>\n    <lastmod>${date}</lastmod>\n    <priority>${priority}</priority>\n  </url>`
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${[
  entry('', '1.0'),
  entry('knit/', '0.9'),
  // The lists of guides and patterns, then each one.
  ...pages.map((p) => entry(p.path, /(guide|patterns)\/$/.test(p.path) ? '0.7' : '0.6')),
].join('\n')}
</urlset>
`
}
