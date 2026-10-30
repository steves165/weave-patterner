import { expect, test } from '@playwright/test'
import { cell, openApp, openTool } from './helpers'

// A deploy replaces every file on the site, so a page opened before it asks for dialogs' old files, which are gone
// (GitHub Pages answers 404). That mustn't leave a blank page.

test('a dialog whose file has gone after a deploy reloads the page instead of blanking it', async ({ page }) => {
  await openApp(page)
  // An edit just before: the reload mustn't lose it.
  await cell(page, 'End 1, shaft 4').click()
  // The deploy: the Blocks dialog's file isn't there any more, until the page loads the new version.
  let deployed = true
  await page.route(/\/assets\/BlocksDialog-[^/]+\.js$/, (route) =>
    deployed ? route.fulfill({ status: 404, contentType: 'text/html', body: 'Not found' }) : route.continue(),
  )
  const reloaded = page.waitForEvent('load')
  page.once('framenavigated', () => {
    deployed = false
  })
  await page.getByRole('button', { name: 'Blocks', exact: true }).click()
  await reloaded
  // After the reload the pattern is back, with the edit, and the dialog opens.
  await expect(cell(page, 'End 1, shaft 4')).toBeChecked()
  await page.getByRole('button', { name: 'Blocks', exact: true }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
})

test('when reloading doesn’t help, a message offers to reload instead of a blank page', async ({ page }) => {
  await openApp(page)
  // Gone for good (or offline): the reload doesn't bring it back.
  await page.route(/\/assets\/ToolsDialog-[^/]+\.js$/, (route) =>
    route.fulfill({ status: 404, contentType: 'text/html', body: 'Not found' }),
  )
  const reloaded = page.waitForEvent('load')
  await openTool(page, /Sequence tools/)
  await reloaded
  await openTool(page, /Sequence tools/)
  const message = page.getByRole('alertdialog')
  await expect(message).toContainText('Part of the app couldn’t load')
  await expect(message.getByRole('button', { name: 'Reload' })).toBeVisible()
  // The pattern is still there behind it, and can be carried on with.
  await message.getByRole('button', { name: 'Not now' }).click()
  await expect(message).toBeHidden()
  await expect(page.getByRole('group', { name: 'Threading' })).toBeVisible()
})
