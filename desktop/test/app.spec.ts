import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { type ElectronApplication, _electron as electron, expect, test } from '@playwright/test'

/** The desktop app, started from the repo (its main program serves the built site in dist/), with its own data. */
async function launch(data = mkdtempSync(join(tmpdir(), 'patterner-'))): Promise<ElectronApplication> {
  const app = await electron.launch({ args: ['desktop/main.cjs', `--user-data-dir=${data}`] })
  // Wait for the first page, so a test's own navigation doesn't race it.
  await expect((await app.firstWindow()).getByRole('group', { name: 'Threading' })).toBeVisible()
  return app
}

test('opens Weave Patterner, with no analytics and links out going to the browser', async () => {
  const app = await launch()
  const page = await app.firstWindow()
  await expect(page).toHaveURL('app://patterner/')
  await expect(page.getByRole('group', { name: 'Threading' })).toBeVisible()
  // No analytics in the desktop app: no consent banner, no Analytics link, no download link to itself.
  await expect(page.getByRole('region', { name: /analytics/i })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Analytics' })).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'Desktop app' })).toHaveCount(0)

  // A link to another site goes to the usual browser, not a window in the app.
  const opened = app.evaluate(
    ({ shell }) =>
      new Promise<string>((resolve) => {
        shell.openExternal = async (url: string) => resolve(url)
      }),
  )
  await page.getByRole('link', { name: 'Made by steves165' }).click()
  expect(await opened).toBe('https://github.com/steves165/weave-patterner')
  expect(app.windows()).toHaveLength(1)
  await app.close()
})

test('Knit and Sew Patterner open inside the app', async () => {
  const app = await launch()
  const page = await app.firstWindow()
  await page.goto('app://patterner/knit/')
  await expect(page.getByRole('grid', { name: 'Knitting chart' })).toBeVisible()
  await page.goto('app://patterner/sew/')
  await expect(page.getByRole('img', { name: /pattern, / })).toBeVisible()
  await app.close()
})

test('saved patterns are still there next time the app opens', async () => {
  const data = mkdtempSync(join(tmpdir(), 'patterner-'))
  let app = await launch(data)
  let page = await app.firstWindow()
  await expect(page.getByRole('group', { name: 'Threading' })).toBeVisible()
  await page.getByRole('banner').getByRole('button', { name: 'Save' }).click()
  await page.getByRole('dialog').getByLabel('Name').fill('Kept on the desktop')
  await page.getByRole('dialog').getByRole('button', { name: 'Save' }).click()
  await expect(page.getByText('Saved "Kept on the desktop"')).toBeVisible()
  await app.close()

  app = await launch(data)
  page = await app.firstWindow()
  await page.getByRole('banner').getByRole('button', { name: 'Load' }).click()
  await expect(page.getByRole('dialog').getByText('Kept on the desktop')).toBeVisible()
  await app.close()
})

test('nothing outside the built site can be read through the app’s address', async () => {
  const app = await launch()
  const page = await app.firstWindow()
  const status = await page.evaluate(async () => (await fetch('app://patterner/..%2F..%2Fpackage.json')).status)
  expect(status).toBe(404)
  await app.close()
})
