/**
 * Keeping the desktop app up to date from its GitHub releases (.github/workflows/desktop.yml publishes them).
 *
 * - Windows and Linux (the AppImage): electron-updater checks on launch and downloads a newer version in the
 *   background, then asks whether to restart into it now or install it when the app is next closed.
 * - macOS: installing an update needs an Apple Developer ID signature, which the app doesn't have yet (it's ad hoc
 *   signed), so it only says a newer version is out and offers its download page.
 *
 * Help › Check for updates… does the same by hand, and says when the app is already up to date.
 *
 * Nothing is sent unless the person using the app asks (the code signing policy's privacy terms, README.md): the first
 * time it opens, it asks whether to check for updates each time, and Help › Check for updates automatically changes
 * that.
 */
const { app, dialog, net, shell } = require('electron')
const fs = require('node:fs')
const path = require('node:path')

const REPO = 'steves165/weave-patterner'
const RELEASES = `https://github.com/${REPO}/releases/latest`

/** Whether version `a` (1.2.3, maybe with a leading v) is newer than `b`. */
function isNewer(a, b) {
  const parts = (v) => v.replace(/^v/, '').split('-')[0].split('.').map(Number)
  const [x, y] = [parts(a), parts(b)]
  for (let i = 0; i < 3; i++) if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0)
  return false
}

/** Whether this copy can install updates itself: not on macOS (see above), and on Linux only as the AppImage. */
const canInstall = () => process.platform === 'win32' || (process.platform === 'linux' && Boolean(process.env.APPIMAGE))

/** The newest release's version, from GitHub. */
async function latestVersion() {
  const res = await net.fetch(`https://api.github.com/repos/${REPO}/releases/latest`, {
    headers: { Accept: 'application/vnd.github+json' },
  })
  if (!res.ok) throw new Error(`GitHub said ${res.status}`)
  return (await res.json()).tag_name
}

/** Offers the download page for a newer version (`byHand`: say so when there isn't one). */
async function offerDownload(win, byHand) {
  const latest = await latestVersion()
  if (!isNewer(latest, app.getVersion())) {
    if (byHand) await upToDate(win)
    return
  }
  const { response } = await dialog.showMessageBox(win, {
    type: 'info',
    message: `Weave Patterner ${latest.replace(/^v/, '')} is out`,
    detail: `You have version ${app.getVersion()}. Download the new one and install it over this one: your patterns stay as they are.`,
    buttons: ['Download', 'Later'],
    defaultId: 0,
    cancelId: 1,
  })
  if (response === 0) shell.openExternal(RELEASES)
}

const upToDate = (win) =>
  dialog.showMessageBox(win, { type: 'info', message: `Weave Patterner ${app.getVersion()} is the latest version.` })

/** Once an update has downloaded: asks to restart into it now, or leaves it to install when the app is next closed. */
async function offerRestart(win, version) {
  const { response } = await dialog.showMessageBox(win, {
    type: 'info',
    message: `Weave Patterner ${version} is ready to install`,
    detail:
      'Restart now to update: the pattern you have open stays as it is. Or choose Later, and it will be installed the next time you close Weave Patterner.',
    buttons: ['Restart now', 'Later'],
    defaultId: 0,
    cancelId: 1,
  })
  if (response === 0) require('electron-updater').autoUpdater.quitAndInstall()
}

/** The updater, set up once: it downloads in the background, then asks (offerRestart). */
let updater
function getUpdater(win) {
  if (updater) return updater
  // Loaded only when needed: it's bundled into the packaged app (scripts/desktop.ts).
  updater = require('electron-updater').autoUpdater
  updater.autoDownload = true
  updater.autoInstallOnAppQuit = true
  // A download that fails in the background is tried again next launch.
  updater.on('error', () => {})
  updater.on('update-downloaded', (info) => offerRestart(win, info.version))
  return updater
}

/** Checks for a newer version: on launch (quietly, unless there is one), or by hand from the Help menu. */
async function checkForUpdates(win, { byHand = false } = {}) {
  if (!app.isPackaged) {
    if (byHand) await dialog.showMessageBox(win, { type: 'info', message: 'Updates are checked in the installed app.' })
    return
  }
  try {
    if (!canInstall()) return await offerDownload(win, byHand)
    const result = await getUpdater(win).checkForUpdates()
    if (byHand && !result?.isUpdateAvailable) await upToDate(win)
    else if (byHand)
      await dialog.showMessageBox(win, {
        type: 'info',
        message: `Weave Patterner ${result.updateInfo.version} is downloading`,
        detail: 'You’ll be asked to restart into it once it has downloaded.',
      })
  } catch (err) {
    // Offline, or GitHub couldn't be reached: try again next launch, and only say so when asked.
    if (byHand)
      await dialog.showMessageBox(win, {
        type: 'warning',
        message: "Couldn't check for updates",
        detail: `${err?.message ?? err}\n\nYou can always download the latest version from ${RELEASES}`,
      })
  }
}

/** The choice to check on launch: true, false, or undefined before it's asked. Kept with the app's own data. */
const settingsFile = () => path.join(app.getPath('userData'), 'updates.json')

function autoCheck() {
  try {
    const { auto } = JSON.parse(fs.readFileSync(settingsFile(), 'utf8'))
    return typeof auto === 'boolean' ? auto : undefined
  } catch {
    return undefined
  }
}

function setAutoCheck(auto) {
  try {
    fs.writeFileSync(settingsFile(), JSON.stringify({ auto }))
  } catch {
    // It'll be asked again next time.
  }
}

/** On launch: asks the first time whether to check for updates each time, then checks if that's the choice. */
async function checkOnLaunch(win, onChoice) {
  if (!app.isPackaged) return
  let auto = autoCheck()
  if (auto === undefined) {
    const { response } = await dialog.showMessageBox(win, {
      type: 'question',
      message: 'Keep Weave Patterner up to date?',
      detail: `Each time it opens, Weave Patterner can ask GitHub whether there's a newer version${
        canInstall() ? ', download it, and install it when you close the app' : ' and offer to download it'
      }. Nothing else is sent. You can change this in the Help menu.`,
      buttons: ['Check for updates', 'No thanks'],
      defaultId: 0,
      cancelId: 1,
    })
    auto = response === 0
    setAutoCheck(auto)
    onChoice?.(auto)
  }
  if (auto) await checkForUpdates(win)
}

module.exports = { autoCheck, checkForUpdates, checkOnLaunch, isNewer, setAutoCheck }
