/**
 * Runs the browser tests, leaving out the slow 3D ones (tagged @3d) unless 3D code has changed: compared with
 * BASE_SHA if set (CI sets it to the previous push), otherwise origin/main, plus anything not yet committed.
 * Tests a fresh production build, or the site at E2E_BASE_URL (such as the live one) if set.
 * Extra arguments go to Playwright. Exits with Playwright's own exit code.
 *
 *   npm run test:e2e:changed            3D tests only if 3D code changed
 *   npm run test:e2e:changed -- --all   everything
 */
import { execSync, spawnSync } from 'node:child_process'

/** Files whose changes can affect the 3D preview. */
const THREE_D = [
  /^src\/three\//,
  /^src\/(sim3d|textures|yarnGeometry|mockups|layers)\.ts$/,
  /^src\/dialogs\/Fabric3DDialog\.tsx$/,
  /^e2e\/fabric3d\.spec\.ts$/,
  /^(package|package-lock)\.json$/,
  /^(playwright|vite)\.config\.ts$/,
]

const git = (cmd) => execSync(`git ${cmd}`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })

function changedFiles() {
  const base = process.env.BASE_SHA
  // No usable base (a first push, or a manual run): treat everything as changed.
  if (base !== undefined && (base === '' || /^0+$/.test(base))) return null
  try {
    const committed = git(`diff --name-only ${base || 'origin/main'}...HEAD`)
    const uncommitted = git('diff --name-only HEAD')
    const untracked = git('ls-files --others --exclude-standard')
    return [committed, uncommitted, untracked].join('\n').split('\n').filter(Boolean)
  } catch {
    return null
  }
}

const args = process.argv.slice(2)
const all = args.includes('--all')
const rest = args.filter((a) => a !== '--all')
const files = all ? null : changedFiles()
const run3d = files === null || files.some((f) => THREE_D.some((re) => re.test(f)))
console.log(
  run3d
    ? `Running all browser tests${files ? ' (3D code changed)' : ''}.`
    : 'Skipping the 3D browser tests: no 3D code changed. Use --all to run them.',
)
// Locally the tests run against a fresh production build; a live site or the dev server needs no build.
if (!process.env.E2E_BASE_URL && !process.env.E2E_DEV) {
  const build = spawnSync('npx', ['vite', 'build', '--logLevel', 'warn'], { stdio: 'inherit' })
  if (build.status !== 0) process.exit(build.status ?? 1)
  // The guide and pattern pages.
  const site = spawnSync('npm', ['run', '--silent', 'site'], { stdio: 'inherit' })
  if (site.status !== 0) process.exit(site.status ?? 1)
}
const playwright = (extra) =>
  spawnSync('npx', ['playwright', 'test', ...extra, ...rest], { stdio: 'inherit' }).status ?? 1
// Everything else first, four at a time; then the 3D tests on their own, two at a time, as several software-rendered
// 3D previews at once starve the processors and time out.
let status = playwright(['--grep-invert', '@3d'])
if (run3d) status = playwright(['--grep', '@3d', '--workers', '2']) || status
process.exit(status)
