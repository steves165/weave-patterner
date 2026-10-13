import { expect, test } from '@playwright/test'
import { openApp, openKnit, openSew } from './helpers'

// Every menu, popover and dialog closes the same ways: its close button, a click outside it, or Escape (and on touch
// screens a swipe down from its top, menus.mobile.spec.ts).

test('menus and popovers close with their close button', async ({ page }) => {
  await openApp(page)
  await page.getByRole('button', { name: 'Export', exact: true }).click()
  const exportMenu = page.getByRole('menu')
  await expect(exportMenu).toBeVisible()
  await page.getByRole('button', { name: 'Close Export' }).click()
  await expect(exportMenu).toHaveCount(0)

  await page.getByRole('button', { name: 'Tools', exact: true }).first().click()
  const tools = page.getByRole('menu', { name: 'Tools' })
  await expect(tools).toBeVisible()
  await page.getByRole('button', { name: 'Close Tools' }).click()
  await expect(tools).toHaveCount(0)

  await page.locator('input[type="color"]').first().click()
  const colours = page.getByRole('dialog', { name: /^Colours for / })
  await expect(colours).toBeVisible()
  await colours.getByRole('button', { name: 'Close colours' }).click()
  await expect(colours).toHaveCount(0)
})

test('dialogs close with their close button, or a click outside them', async ({ page }) => {
  await openApp(page)
  const save = page.getByRole('dialog', { name: 'Save pattern' })
  await page.getByRole('button', { name: 'Save', exact: true }).first().click()
  await save.getByRole('button', { name: 'Close dialog' }).click()
  await expect(save).toHaveCount(0)

  await page.getByRole('button', { name: 'Save', exact: true }).first().click()
  await expect(save).toBeVisible()
  // The backdrop, in the corner well away from the dialog.
  await page.mouse.click(5, 5)
  await expect(save).toHaveCount(0)
})

for (const [app, open] of [
  ['Knit Patterner', openKnit],
  ['Sew Patterner', openSew],
] as const)
  test(`${app}: the Export menu closes with its close button`, async ({ page }) => {
    await open(page)
    await page.getByRole('button', { name: 'Export', exact: true }).first().click()
    const menu = page.getByRole('menu')
    await expect(menu).toBeVisible()
    await page.getByRole('button', { name: 'Close Export' }).click()
    await expect(menu).toHaveCount(0)
  })
