/**
 * Runs the browser tests, leaving out the slow 3D ones (tagged @3d) unless 3D code has changed: compared with
 * BASE_SHA if set (CI sets it to the previous push), otherwise origin/main, plus anything not yet committed.
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
const result = spawnSync('npx', ['playwright', 'test', ...(run3d ? [] : ['--grep-invert', '@3d']), ...rest], {
  stdio: 'inherit',
})
process.exit(result.status ?? 1)
