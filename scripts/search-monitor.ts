/**
 * The search monitor: how weave-patterner.com is doing in Google, from Google's own Search Console data. Run every 6
 * hours by a systemd timer (see the end of this file). It reads, for the site's Search Console property:
 *
 * - each search in tracked-searches.txt: whether we appeared, our average position, impressions and clicks
 *   (Search Console's figures lag by two or three days);
 * - the searches people actually found us with;
 * - whether key pages are indexed (URL inspection), and the sitemap's status;
 *
 * and writes a report, with what changed since the last run at the top, plus a line of history per run.
 *
 * It signs in as a service account with read-only access to the property; its key never leaves this machine.
 *
 *   npx tsx scripts/search-monitor.ts
 */
import { createSign } from 'node:crypto'
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

const SITE = 'https://weave-patterner.com/'
const KEY = process.env.GSC_KEY ?? join(homedir(), '.config/weave-patterner/gsc.json')
const OUT = process.env.SEARCH_MONITOR_DIR ?? join(homedir(), '.local/share/weave-patterner/search-monitor')
const TRACKED = new URL('./tracked-searches.txt', import.meta.url)
/** Pages to check are in Google's index. */
const PAGES = [
  '',
  'knit/',
  'sew/',
  'patterns/',
  'guide/',
  'patterns/houndstooth/',
  'patterns/clan-cameron/',
  'patterns/cameron-of-erracht-ancient/',
]
/** How far back the search figures go. */
const DAYS = 28

interface Seen {
  query: string
  clicks: number
  impressions: number
  position: number
}
interface Snapshot {
  at: string
  tracked: Record<string, Seen | null>
  top: Seen[]
  pages: Record<string, string>
  sitemap: string
}

async function token(): Promise<string> {
  const k = JSON.parse(readFileSync(KEY, 'utf8')) as { client_email: string; private_key: string; token_uri: string }
  const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64url')
  const now = Math.floor(Date.now() / 1000)
  const body = `${b64({ alg: 'RS256', typ: 'JWT' })}.${b64({
    iss: k.client_email,
    scope: 'https://www.googleapis.com/auth/webmasters.readonly',
    aud: k.token_uri,
    iat: now,
    exp: now + 600,
  })}`
  const sig = createSign('RSA-SHA256').update(body).sign(k.private_key).toString('base64url')
  const res = await fetch(k.token_uri, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${body}.${sig}`,
    }),
  })
  if (!res.ok) throw new Error(`Couldn't sign in to Google: ${res.status} ${await res.text()}`)
  return ((await res.json()) as { access_token: string }).access_token
}

async function call<T>(t: string, url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method: body ? 'POST' : 'GET',
    headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) throw new Error(`${url}: ${res.status} ${(await res.text()).slice(0, 300)}`)
  return (await res.json()) as T
}

const day = (d: Date) => d.toISOString().slice(0, 10)
const site = encodeURIComponent(SITE)

async function snapshot(): Promise<Snapshot> {
  const t = await token()
  const end = new Date()
  const start = new Date(end.getTime() - DAYS * 86_400_000)
  const { rows = [] } = await call<{
    rows?: { keys: string[]; clicks: number; impressions: number; position: number }[]
  }>(t, `https://www.googleapis.com/webmasters/v3/sites/${site}/searchAnalytics/query`, {
    startDate: day(start),
    endDate: day(end),
    dimensions: ['query'],
    rowLimit: 1000,
  })
  const seen = rows.map((r) => ({
    query: r.keys[0],
    clicks: r.clicks,
    impressions: r.impressions,
    position: Math.round(r.position * 10) / 10,
  }))
  const byQuery = new Map(seen.map((s) => [s.query.toLowerCase(), s]))
  const tracked = Object.fromEntries(
    readFileSync(TRACKED, 'utf8')
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith('#'))
      .map((q) => [q, byQuery.get(q.toLowerCase()) ?? null]),
  )

  const pages: Record<string, string> = {}
  for (const p of PAGES) {
    const r = await call<{ inspectionResult?: { indexStatusResult?: { coverageState?: string } } }>(
      t,
      'https://searchconsole.googleapis.com/v1/urlInspection/index:inspect',
      { inspectionUrl: `${SITE}${p}`, siteUrl: SITE },
    ).catch((e: Error) => ({ error: e.message }) as never)
    pages[`/${p}`] = r.inspectionResult?.indexStatusResult?.coverageState ?? 'Couldn’t check'
  }

  const { sitemap = [] } = await call<{
    sitemap?: { path: string; isPending?: boolean; errors?: string; warnings?: string; lastDownloaded?: string }[]
  }>(t, `https://www.googleapis.com/webmasters/v3/sites/${site}/sitemaps`)
  const sm = sitemap.find((s) => s.path.endsWith('/sitemap.xml'))
  const status = !sm
    ? 'Not submitted'
    : sm.isPending
      ? `Waiting for Google to read it (${sm.errors ?? 0} errors)`
      : `Read ${sm.lastDownloaded?.slice(0, 10) ?? ''}: ${sm.errors ?? 0} errors, ${sm.warnings ?? 0} warnings`

  return { at: new Date().toISOString(), tracked, top: seen.slice(0, 20), pages, sitemap: status }
}

/** What changed since the last run, in words. */
function changes(before: Snapshot | null, now: Snapshot): string[] {
  if (!before) return ['First run: nothing to compare with yet.']
  const out: string[] = []
  for (const [q, s] of Object.entries(now.tracked)) {
    const b = before.tracked[q]
    if (s && !b) out.push(`Now showing for “${q}”: position ${s.position}, ${s.impressions} impressions`)
    else if (!s && b) out.push(`No longer showing for “${q}” (was position ${b.position})`)
    else if (s && b && Math.abs(s.position - b.position) >= 1)
      out.push(`“${q}”: position ${b.position} → ${s.position} (${s.position < b.position ? 'up' : 'down'})`)
  }
  for (const s of now.top)
    if (!(s.query in now.tracked) && !before.top.some((b) => b.query === s.query))
      out.push(`New search finding us: “${s.query}” (position ${s.position}, ${s.impressions} impressions)`)
  for (const [p, state] of Object.entries(now.pages))
    if (before.pages[p] && before.pages[p] !== state) out.push(`${p}: ${before.pages[p]} → ${state}`)
  if (before.sitemap !== now.sitemap) out.push(`Sitemap: ${now.sitemap}`)
  return out.length ? out : ['No changes since the last run.']
}

function report(now: Snapshot, changed: string[]): string {
  const row = (s: Seen) => `${s.position} | ${s.impressions} | ${s.clicks}`
  const tracked = Object.entries(now.tracked).sort(
    ([, a], [, b]) => (a?.position ?? Number.POSITIVE_INFINITY) - (b?.position ?? Number.POSITIVE_INFINITY),
  )
  const found = tracked.filter(([, s]) => s).length
  return `# weave-patterner.com in Google

Checked ${now.at.replace('T', ' ').slice(0, 16)} UTC, from Search Console (the last ${DAYS} days; Google's figures lag
by two or three days).

## What changed

${changed.map((c) => `- ${c}`).join('\n')}

## Tracked searches: showing for ${found} of ${tracked.length}

| Search | Position | Impressions | Clicks |
|---|---|---|---|
${tracked.map(([q, s]) => `| ${q} | ${s ? row(s) : '– | – | –'} |`).join('\n')}

## Searches people found us with (top 20)

${now.top.length ? `| Search | Position | Impressions | Clicks |\n|---|---|---|---|\n${now.top.map((s) => `| ${s.query} | ${row(s)} |`).join('\n')}` : 'None yet.'}

## Pages in Google's index

| Page | Status |
|---|---|
${Object.entries(now.pages)
  .map(([p, s]) => `| ${p} | ${s} |`)
  .join('\n')}

Sitemap: ${now.sitemap}
`
}

const now = await snapshot()
mkdirSync(OUT, { recursive: true })
const lastFile = join(OUT, 'last.json')
const before = existsSync(lastFile) ? (JSON.parse(readFileSync(lastFile, 'utf8')) as Snapshot) : null
const changed = changes(before, now)
writeFileSync(join(OUT, 'report.md'), report(now, changed))
writeFileSync(lastFile, JSON.stringify(now, null, 1))
appendFileSync(join(OUT, 'history.jsonl'), `${JSON.stringify({ ...now, changed })}\n`)
console.log(changed.join('\n'))

/*
 * The timer (~/.config/systemd/user/weave-search-monitor.{service,timer}), every 6 hours, catching up after the
 * computer was off:
 *
 *   [Service]  Type=oneshot, WorkingDirectory=<this repo>, ExecStart=npx tsx scripts/search-monitor.ts
 *   [Timer]    OnCalendar=00/6:00, Persistent=true, RandomizedDelaySec=10min
 */
