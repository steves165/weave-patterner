import { PRESETS, toRuns } from '../colors'
import { KNIT_HELP } from '../help/knitHelp'
import { SEW_HELP } from '../help/sewHelp'
import type { Topic } from '../help/types'
import { WEAVE_HELP } from '../help/weaveHelp'
import { threadingLines, tieupLines, treadlingLines } from '../instructions'
import { colorLetter, type KnitChart, usedColors } from '../knit/chart'
import { castOnText, writtenRows } from '../knit/instructions'
import { SAMPLES, sampleSlug } from '../knit/samples'
import { SAMPLE_KEY } from '../knit/share'
import { STITCHES, type StitchId } from '../knit/stitches'
import { findRepeat } from '../repeat'
import { DESIGNS } from '../sew/designs'
import { svgItems } from '../sew/drawing'
import { patternText } from '../sew/exports'
import { bounds } from '../sew/geometry'
import { MEASUREMENTS, WOMENS } from '../sew/measurements'
import type { Sketch } from '../sew/pattern'
import { bodyOf, newProject, type Project, piecesOf } from '../sew/project'
import { drawSheet, layoutSheet } from '../sew/sheet'
import { encodePattern, SHARE_KEY } from '../share'
import type { Draft } from '../weave'
import {
  type App,
  blocks,
  describe,
  esc,
  KNIT_APP,
  type Page,
  pinLink,
  plain,
  render,
  SEW_APP,
  SITE_URL,
  WEAVE_APP,
} from './html'
import { chartSvg, clothSvg, draftSvg } from './pictures'

/** The colours the pattern pages show the presets in: navy, cream and a brick-red accent. */
const PATTERN_COLOURS = { dark: '#1f2a44', light: '#f3ead8', accent: '#b23a48' }

/** A built page: where it goes (from the site root, ending "/") and its HTML. */
export interface Built {
  path: string
  html: string
  /** What to draw the page's pictures of (see PICTURES), for a pattern page. */
  picture?: { title: string } & (
    | { app: 'weave'; draft: Draft }
    | { app: 'knit'; chart: KnitChart }
    | { app: 'sew'; sketch: Sketch }
  )
}

const craft = (app: App) => ({ weave: 'weaving', knit: 'knitting', sew: 'sewing' })[app.id]
/** What each app is, in a few words. */
const MAKER = { weave: 'weaving draft designer', knit: 'knitting chart maker', sew: 'sewing pattern maker' }

/** The guides: an index of the help topics, and a page for each. */
function guides(app: App, topics: Topic[]): Built[] {
  const base = `${app.path}guide/`
  const link = (id: string) =>
    id === 'tour' ? `{root}${app.path}` : topics.some((t) => t.id === id) ? `{root}${base}${id}/` : null
  const crumbs = [{ name: app.name, path: app.path }]
  const index: Page = {
    path: base,
    title: `${app.name} guides: how to use the free ${MAKER[app.id]}`,
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
          : `${t.summary}. ${plain(lead)} A free ${craft(app)} guide from ${app.name}, the online ${MAKER[app.id]}.`,
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
        pictures: true,
        content: `<p>${esc(p.description)}. ${d.shafts} shafts and ${d.treadles} treadles; the pattern repeats every ${repeat.ends} ends and ${repeat.picks} picks.</p>
<figure>${draftSvg(d, `${p.name} draft: threading, tie-up, treadling and drawdown`)}<figcaption>The draft: threading at the top, tie-up at the top right, treadling at the right (pick 1 at the top) and the drawdown, the cloth they make.</figcaption></figure>
<p><a class="button" href="{root}?${SHARE_KEY}=${share}">Open this draft in Weave Patterner</a><a class="button plain" href="${esc(pinLink(`${base}${p.id}/`, `${p.name} weaving draft, free, with threading, tie-up and treadling`))}" target="_blank" rel="noopener">Save to Pinterest</a></p>
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
  return [
    { path: index.path, html: render(app, index) },
    ...pages.map((page, i) => ({
      path: page.path,
      html: render(app, page),
      picture: { app: 'weave' as const, title: built[i].p.name, draft: built[i].d },
    })),
  ]
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
      pictures: true,
      content: `<p>${esc(s.about)}</p>
<figure>${chartSvg(k, `${s.name} chart`)}<figcaption>Read the chart from the bottom: row 1 is at the bottom, and each row starts at the side its number is on.${colours.length > 1 ? ` Colours: ${colours.map((c) => `${colorLetter(c)} ${esc(k.colors[c])}`).join(', ')}.` : ''}</figcaption></figure>
<p><a class="button" href="{root}${app.path}?${SAMPLE_KEY}=${slug}">Open this chart in Knit Patterner</a><a class="button plain" href="${esc(pinLink(`${base}${slug}/`, `${s.name} knitting chart, free, with written instructions`))}" target="_blank" rel="noopener">Save to Pinterest</a></p>
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
  return [
    { path: index.path, html: render(app, index) },
    ...pages.map((page, i) => ({
      path: page.path,
      html: render(app, page),
      picture: { app: 'knit' as const, title: built[i].s.name, chart: built[i].k },
    })),
  ]
}

/** Every static page. */
export async function buildSite(): Promise<Built[]> {
  return [
    ...guides(WEAVE_APP, WEAVE_HELP),
    ...guides(KNIT_APP, KNIT_HELP),
    ...guides(SEW_APP, SEW_HELP),
    ...(await weavePatterns()),
    ...knitPatterns(),
    ...sewPatterns(),
  ]
}

/** A garment's sketch as SVG markup, for the pattern pages. */
export function sketchSvg(sk: Sketch, label: string, colour = '#9fa8da'): string {
  const b = bounds([...sk.shapes.flatMap((x) => x.pts), ...sk.lines.flatMap((l) => l.pts)])
  const pad = Math.max(b.w, b.h) * 0.04 + 1
  const w = Math.max(b.w, b.h) / 260
  const d = (pts: { x: number; y: number }[], closed: boolean) =>
    `${pts.map((q, i) => `${i ? 'L' : 'M'}${q.x.toFixed(1)} ${q.y.toFixed(1)}`).join(' ')}${closed ? 'Z' : ''}`
  const fill = (f?: string) => (f === 'lining' ? '#f3e5f5' : f === 'contrast' ? '#ffe082' : colour)
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${(b.x - pad).toFixed(1)} ${(b.y - pad).toFixed(1)} ${(b.w + pad * 2).toFixed(1)} ${(b.h + pad * 2).toFixed(1)}" width="320" height="${Math.round((320 * (b.h + pad * 2)) / (b.w + pad * 2))}" ${label ? `role="img" aria-label="${esc(label)}"` : 'aria-hidden="true"'} style="background:#fff">${sk.shapes
    .map(
      (x) =>
        `<path d="${d(x.pts, true)}" fill="${fill(x.fill)}" stroke="#1e1e2a" stroke-width="${(w * 1.4).toFixed(2)}" stroke-linejoin="round"/>`,
    )
    .join('')}${sk.lines
    .map(
      (l) =>
        `<path d="${d(l.pts, false)}" fill="none" stroke="#1e1e2a" stroke-opacity="0.75" stroke-width="${(w * 0.8).toFixed(2)}"${l.dash ? ` stroke-dasharray="${(w * 3).toFixed(2)} ${(w * 2).toFixed(2)}"` : ''}/>`,
    )
    .join(
      '',
    )}${(sk.dots ?? []).map((q) => `<circle cx="${q.x.toFixed(1)}" cy="${q.y.toFixed(1)}" r="${(w * 2.5).toFixed(2)}" fill="#1e1e2a"/>`).join('')}</svg>`
}

/** The pattern pieces of a design (standard size) as SVG markup. */
export function piecesSvg(p: Project, label: string): string {
  const lay = layoutSheet(drawSheet(p), 120, 3)
  const vb = `-2 -2 ${(lay.box.w + 4).toFixed(1)} ${(lay.box.h + 4).toFixed(1)}`
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" width="640" height="${Math.round((640 * (lay.box.h + 4)) / (lay.box.w + 4))}" role="img" aria-label="${esc(label)}" style="background:#fff" font-family="Nunito, sans-serif">${svgItems(lay.items, '#1e1e2a', '#c2185b')}</svg>`
}

/** The sewing patterns: each design, with its sketch, pieces, sizes, fabric, materials and steps. */
function sewPatterns(): Built[] {
  const app = SEW_APP
  const base = 'sew/patterns/'
  const crumbs = [{ name: app.name, path: app.path }]
  const built = DESIGNS.map((d) => {
    const p = newProject(d.id)
    return { d, p, sketch: d.sketch(bodyOf(p), p.options) }
  })
  const index: Page = {
    path: base,
    title: 'Free sewing patterns made to measure: T-shirt, dress, skirts, trousers | Sew Patterner',
    description: describe(
      `Free made-to-measure sewing patterns: ${built
        .map(({ d }) => d.name.toLowerCase())
        .join(', ')}. Print at home, at a copy shop or on a projector, in your size.`,
    ),
    heading: 'Free sewing patterns',
    crumbs,
    type: 'CollectionPage',
    content: `<p>Garments and projects drafted to your size: choose your style and measurements in Sew Patterner, then print the pattern at home (A4 or Letter), at a copy shop (A0), or use it with a projector.</p>
<ul class="cards">${built.map(({ d, sketch }) => `<li>${sketchSvg(sketch, '')}<a href="{root}${base}${d.id}/">${esc(d.name)}</a><p>${esc(d.about)}</p></li>`).join('')}</ul>`,
  }
  const pages = built.map(({ d, p, sketch }, i): Page => {
    const others = [built[(i + 1) % built.length], built[(i + 2) % built.length], built[(i + 3) % built.length]]
    const t = patternText(p, d.name)
    const pieces = piecesOf(p)
    const sizeRows = d.measurements.length
      ? `<h2>Sizes</h2>
<p>Choose a standard size or put in your own measurements: the pattern is drafted to them. The women’s body measurements (cm):</p>
<table><thead><tr><th scope="col">Size</th>${(['bust', 'waist', 'hips'] as const)
          .filter((m) => d.measurements.includes(m))
          .map((m) => `<th scope="col">${esc(MEASUREMENTS[m].name)}</th>`)
          .join('')}</tr></thead><tbody>${WOMENS.map(
          (z) =>
            `<tr><td>${z.name}</td>${(['bust', 'waist', 'hips'] as const)
              .filter((m) => d.measurements.includes(m))
              .map((m) => `<td>${z.m[m]}</td>`)
              .join('')}</tr>`,
        ).join('')}</tbody></table>
<p>Men’s sizes XS to 3XL are in the app too. See <a href="{root}${app.path}guide/measuring/">how to take your measurements</a>.</p>`
      : ''
    const options = d.options
      .map((o) =>
        o.type === 'choice'
          ? `<li><strong>${esc(o.label)}</strong>: ${o.choices.map((c) => esc(c.label)).join(', ')}</li>`
          : o.type === 'bool'
            ? `<li><strong>${esc(o.label)}</strong>: yes or no</li>`
            : `<li><strong>${esc(o.label)}</strong>: ${o.min} to ${o.max}${o.unit === 'cm' ? ' cm' : o.unit}</li>`,
      )
      .join('')
    return {
      path: `${base}${d.id}/`,
      title: `${d.name} sewing pattern – free, made to measure | Sew Patterner`,
      description: describe(
        `${d.name}: ${d.about} A free sewing pattern in your size, with fabric amounts and step-by-step instructions.`,
      ),
      heading: `${d.name} sewing pattern`,
      crumbs: [...crumbs, { name: 'Patterns', path: base }],
      type: 'CreativeWork',
      pictures: true,
      content: `<p>${esc(d.about)} ${esc(d.level)}.</p>
<figure>${sketchSvg(sketch, `Sketch of the ${d.name.toLowerCase()}`)}<figcaption>The ${d.name.toLowerCase()} as it comes; change its style in the app.</figcaption></figure>
<p><a class="button" href="{root}${app.path}?design=${d.id}">Make this pattern in your size</a><a class="button plain" href="${esc(pinLink(`${base}${d.id}/`, `${d.name} sewing pattern, free and made to measure`))}" target="_blank" rel="noopener">Save to Pinterest</a></p>
<h2>Style options</h2>
<ul>${options}</ul>
<h2>Pattern pieces</h2>
<figure>${piecesSvg(p, `${d.name} pattern pieces in UK 12`)}<figcaption>${pieces.map((x) => `${esc(x.name)} (${x.cut} to cut)`).join(', ')}. Seam allowances included.</figcaption></figure>
${sizeRows}
<h2>Fabric and materials</h2>
<p><strong>Suggested fabrics:</strong> ${esc(d.fabrics)}</p>
<p>For ${d.measurements.length ? 'UK 12, as it comes' : 'the size as it comes'}:</p>
<ul>${t.needs.map((n) => `<li>${esc(n)}</li>`).join('')}${t.materials.map((m) => `<li>${esc(m)}</li>`).join('')}</ul>
<h2>How to sew it</h2>
<ol>${t.steps.map((x) => `<li>${esc(x)}</li>`).join('')}</ol>
<h2>More patterns</h2>
<ul>${others.map((o) => `<li><a href="{root}${base}${o.d.id}/">${esc(o.d.name)}</a>: ${esc(o.d.about)}</li>`).join('')}</ul>
<p><a href="{root}${base}">All sewing patterns</a></p>`,
    }
  })
  return [
    { path: index.path, html: render(app, index) },
    ...pages.map((page, i) => ({
      path: page.path,
      html: render(app, page),
      picture: { app: 'sew' as const, title: built[i].d.name, sketch: built[i].sketch },
    })),
  ]
}

/** The sitemap: the apps and every static page, each last changed on `date` (YYYY-MM-DD). */
export function sitemap(pages: Built[], date: string): string {
  const entry = (path: string, priority: string) =>
    `  <url>\n    <loc>${SITE_URL}${path}</loc>\n    <lastmod>${date}</lastmod>\n    <priority>${priority}</priority>\n  </url>`
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${[
  entry('', '1.0'),
  entry('knit/', '0.9'),
  entry('sew/', '0.9'),
  // The lists of guides and patterns, then each one.
  ...pages.map((p) => entry(p.path, /(guide|patterns)\/$/.test(p.path) ? '0.7' : '0.6')),
].join('\n')}
</urlset>
`
}
