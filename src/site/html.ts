import { type Brand, KNIT, WEAVE } from '../brands'
import type { Block } from '../help/types'
import { markSvg } from '../marks'
import { holidayOn, SEASONS, seasonBrand } from '../seasons'

/**
 * The static pages built alongside the apps (guides and patterns), for search engines and anyone who lands on them:
 * plain HTML, no JavaScript, in the apps' colours.
 */

export const SITE_URL = 'https://steves165.github.io/weave-patterner/'

export const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/** Help text to HTML: **bold**, and [[topic|words]] links (made by `link`, or plain text when it gives none). */
export function inline(text: string, link: (id: string) => string | null): string {
  return text
    .split(/(\*\*[^*]+\*\*|\[\[[^\]]+\]\])/g)
    .map((part) => {
      const bold = /^\*\*(.+)\*\*$/.exec(part)
      if (bold) return `<strong>${esc(bold[1])}</strong>`
      const ref = /^\[\[([^|\]]+)(?:\|([^\]]+))?\]\]$/.exec(part)
      if (ref) {
        const href = link(ref[1])
        const words = esc(ref[2] ?? ref[1])
        return href ? `<a href="${esc(href)}">${words}</a>` : words
      }
      return esc(part)
    })
    .join('')
}

/** Plain words from help text, for descriptions. */
export const plain = (text: string) =>
  text.replace(/\*\*([^*]+)\*\*/g, '$1').replace(/\[\[[^|\]]+\|?([^\]]*)\]\]/g, '$1')

/** A help topic's body as HTML. */
export function blocks(body: Block[], link: (id: string) => string | null): string {
  const t = (s: string) => inline(s, link)
  return body
    .map((b) => {
      if ('p' in b) return `<p>${t(b.p)}</p>`
      if ('h' in b) return `<h2>${t(b.h)}</h2>`
      if ('tip' in b) return `<aside class="tip"><p>${t(b.tip)}</p></aside>`
      if ('list' in b) return `<ul>${b.list.map((x) => `<li>${t(x)}</li>`).join('')}</ul>`
      if ('steps' in b) return `<ol>${b.steps.map((x) => `<li>${t(x)}</li>`).join('')}</ol>`
      if ('keys' in b)
        return `<table class="keys"><thead><tr><th scope="col">Key</th><th scope="col">What it does</th></tr></thead><tbody>${b.keys
          .map(([k, v]) => `<tr><td><kbd>${esc(k)}</kbd></td><td>${t(v)}</td></tr>`)
          .join('')}</tbody></table>`
      return `<dl>${b.terms.map(([k, v]) => `<dt>${t(k)}</dt><dd>${t(v)}</dd>`).join('')}</dl>`
    })
    .join('\n')
}

/** Cuts a description to about 155 characters, at a word. */
export function describe(text: string, max = 158): string {
  const s = text.replace(/\s+/g, ' ').trim()
  if (s.length <= max) return s
  const cut = s.slice(0, max - 1)
  return `${cut.slice(0, cut.lastIndexOf(' ')).replace(/[,;:.–-]+$/, '')}…`
}

export interface App {
  /** "weave" or "knit". */
  id: 'weave' | 'knit'
  name: string
  /** Path of the app from the site root: "" or "knit/". */
  path: string
  /** Its own colours (seasonal themes chosen in the app replace them). */
  brand: Brand
  /** The other app, linked from the footer. */
  other: { name: string; path: string }
}

export const WEAVE_APP: App = {
  id: 'weave',
  name: 'Weave Patterner',
  path: '',
  brand: WEAVE,
  other: { name: 'Knit Patterner', path: 'knit/' },
}

export const KNIT_APP: App = {
  id: 'knit',
  name: 'Knit Patterner',
  path: 'knit/',
  brand: KNIT,
  other: { name: 'Weave Patterner', path: '' },
}

export interface Page {
  /** Path from the site root, ending in "/" (the file is its index.html). */
  path: string
  title: string
  description: string
  /** The page's heading. */
  heading: string
  /** Breadcrumbs above the heading, from the app down (each with its path); the page itself is added. */
  crumbs: { name: string; path: string }[]
  /** The main content, as HTML, with links relative to the site root written as `{root}`. */
  content: string
  /** schema.org type of the page's main thing: TechArticle for guides, CreativeWork for patterns, and so on. */
  type: string
}

/** A full HTML page in an app's look. Links in the content written `{root}x/` become relative to this page. */
export function render(app: App, page: Page): string {
  const depth = page.path.split('/').filter(Boolean).length
  const root = '../'.repeat(depth) || './'
  const url = SITE_URL + page.path
  const content = page.content.replaceAll('{root}', root)
  const trail = [...page.crumbs, { name: page.heading, path: page.path }]
  const ld = [
    {
      '@context': 'https://schema.org',
      '@type': page.type,
      name: page.heading,
      headline: page.heading,
      description: page.description,
      url,
      inLanguage: 'en-GB',
      isAccessibleForFree: true,
      author: { '@type': 'Person', name: 'Stephen Skidmore', url: 'https://github.com/steves165' },
      isPartOf: { '@type': 'WebSite', name: app.name, url: SITE_URL + app.path },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: trail.map((c, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: c.name,
        item: SITE_URL + c.path,
      })),
    },
  ]
  const image = `${SITE_URL}${app.path}og-image.png`
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${esc(page.title)}</title>
<meta name="description" content="${esc(page.description)}" />
<link rel="canonical" href="${url}" />
<meta name="robots" content="index, follow, max-image-preview:large" />
<meta name="theme-color" content="${app.brand.accent.light}" />
<link rel="icon" href="${root}${app.path}favicon.svg" type="image/svg+xml" />
<meta property="og:type" content="article" />
<meta property="og:site_name" content="${app.name}" />
<meta property="og:title" content="${esc(page.heading)}" />
<meta property="og:description" content="${esc(page.description)}" />
<meta property="og:url" content="${url}" />
<meta property="og:image" content="${image}" />
<meta property="og:locale" content="en_GB" />
<meta name="twitter:card" content="summary_large_image" />
<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>
<style>${css(app, root)}</style>
<script>${themeScript(app)}</script>
</head>
<body>
<a class="skip" href="#main">Skip to the content</a>
<header>
<a class="brand" href="${root}${app.path}">${markSvg(app.id, 'var(--accent)', 'var(--on-accent)')}${app.name}</a>
<nav aria-label="Site">
<a href="${root}${app.path}guide/">Guides</a>
<a href="${root}${app.path}patterns/">Patterns</a>
<a class="open" href="${root}${app.path}">Open ${app.name}</a>
</nav>
</header>
<main id="main" tabindex="-1">
<nav aria-label="Breadcrumbs" class="crumbs"><ol>${trail
    .map((c, i) =>
      i === trail.length - 1
        ? `<li aria-current="page">${esc(c.name)}</li>`
        : `<li><a href="${root}${c.path}">${esc(c.name)}</a></li>`,
    )
    .join('')}</ol></nav>
<h1>${esc(page.heading)}</h1>
${content}
</main>
<footer>
<p><a href="${root}${app.path}">${app.name}</a> is free and open source, and runs in your browser: no account or download.</p>
<p><a href="${root}${app.path}guide/">Guides</a> · <a href="${root}${app.path}patterns/">Patterns</a> · <a href="${root}${app.other.path}">${app.other.name}</a> · <a href="https://github.com/steves165/weave-patterner">Source code</a></p>
</footer>
</body>
</html>
`
}

/** The colours a page needs, from an app's (or a seasonal theme's) colours, in light or dark mode. */
function palette(b: Brand, dark: boolean): Record<string, string> {
  const m = dark ? 'dark' : 'light'
  return {
    accent: b.accent[m],
    'on-accent': dark ? b.accent.onDark : '#ffffff',
    bg: b.background[m],
    paper: b.paper[m],
    ink: b.text[m],
    muted: b.muted[m],
    line: b.divider[m],
  }
}

const vars = (p: Record<string, string>) =>
  Object.entries(p)
    .map(([k, v]) => `--${k}:${v}`)
    .join(';')

/**
 * Before the page draws: the colour theme and light or dark mode chosen in the apps (saved in this browser), so the
 * guides look like the app they belong to.
 */
function themeScript(a: App): string {
  const both = (b: Brand) => ({ light: palette(b, false), dark: palette(b, true) })
  const themes = {
    base: both(a.brand),
    seasons: Object.fromEntries(SEASONS.map((s) => [s.id, both(seasonBrand(s))])),
  }
  return `(function(){var T=${JSON.stringify(themes)};var holidayOn=${holidayOn.toString()};var r=document.documentElement,s=null,m=null;try{s=localStorage.getItem('wp-season');m=localStorage.getItem('mui-mode')}catch(e){}var dark=m==='dark'||(m!=='light'&&matchMedia('(prefers-color-scheme: dark)').matches);if(s==='holidays')s=holidayOn(new Date());var t=T.seasons[s]||T.base,p=t[dark?'dark':'light'];r.classList.add(dark?'dark':'light');if(s&&T.seasons[s])r.classList.add('season-'+s);for(var k in p)r.style.setProperty('--'+k,p[k]);var c=document.querySelector('meta[name=theme-color]');if(c)c.setAttribute('content',t.light.accent)})()`
}

const css = (a: App, root: string) => `
@font-face{font-family:Nunito;font-weight:200 1000;font-display:swap;src:url(${root}fonts/nunito-latin-wght-normal.woff2) format("woff2")}
@font-face{font-family:Fredoka;font-weight:600;font-display:swap;src:url(${root}fonts/fredoka-latin-600-normal.woff2) format("woff2")}
:root{${vars(palette(a.brand, false))};color-scheme:light}
@media (prefers-color-scheme:dark){:root:not(.light){${vars(palette(a.brand, true))};color-scheme:dark}}
:root.dark{color-scheme:dark}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font:17px/1.65 Nunito,system-ui,-apple-system,"Segoe UI",sans-serif}
h1,h2,.brand{font-family:Fredoka,Nunito,system-ui,sans-serif;font-weight:600}
a{color:var(--accent)}
.skip{position:absolute;left:8px;top:-60px;background:var(--accent);color:var(--on-accent);padding:8px 16px;border-radius:999px}
.skip:focus{top:8px}
header{display:flex;flex-wrap:wrap;gap:8px 20px;align-items:center;justify-content:space-between;padding:12px 20px;background:var(--paper);border-bottom:1px solid var(--line)}
.brand{display:flex;gap:10px;align-items:center;font-size:24px;line-height:1;letter-spacing:-0.01em;text-decoration:none;color:var(--accent)}
.brand svg{flex:none}
header nav{display:flex;gap:16px;align-items:center;flex-wrap:wrap}
header nav a{text-decoration:none;font-weight:600}
.open{background:var(--accent);color:var(--on-accent)!important;padding:6px 14px;border-radius:999px}
main{max-width:46rem;margin:0 auto;padding:16px 20px 40px;outline:none}
.crumbs ol{list-style:none;display:flex;flex-wrap:wrap;gap:4px;padding:0;margin:8px 0;font-size:14px;color:var(--muted)}
.crumbs li+li::before{content:"›";margin-right:4px}
h1{font-size:2rem;line-height:1.2;margin:8px 0 16px}
h2{font-size:1.3rem;margin-top:2rem}
.tip{background:var(--paper);border-left:4px solid var(--accent);border-radius:8px;padding:2px 16px;margin:1rem 0}
table{border-collapse:collapse;width:100%;margin:1rem 0;background:var(--paper)}
th,td{text-align:left;padding:6px 10px;border-bottom:1px solid var(--line);vertical-align:top}
kbd{font-family:ui-monospace,monospace;background:var(--bg);border:1px solid var(--line);border-radius:4px;padding:0 4px}
dt{font-weight:700;margin-top:10px}
dd{margin:0 0 4px 0}
.cards{list-style:none;padding:0;display:grid;gap:12px;grid-template-columns:repeat(auto-fill,minmax(15rem,1fr))}
.cards li{background:var(--paper);border:1px solid var(--line);border-radius:14px;padding:12px 16px}
.cards a{font-weight:700;text-decoration:none}
.cards p{margin:4px 0 0;font-size:15px;color:var(--muted)}
.cards img,.cards svg{display:block;width:100%;height:auto;border-radius:8px;margin-bottom:8px}
figure{margin:1rem 0;background:var(--paper);border:1px solid var(--line);border-radius:14px;padding:12px;overflow-x:auto}
figure svg{display:block;max-width:100%;height:auto}
figcaption{font-size:14px;color:var(--muted);margin-top:8px}
pre{white-space:pre-wrap;background:var(--paper);border:1px solid var(--line);border-radius:10px;padding:12px;font-size:15px}
.button{display:inline-block;background:var(--accent);color:var(--on-accent);padding:10px 20px;border-radius:999px;font-weight:700;text-decoration:none;margin:8px 0}
footer{max-width:46rem;margin:0 auto;padding:16px 20px 40px;border-top:1px solid var(--line);font-size:15px;color:var(--muted)}
`
