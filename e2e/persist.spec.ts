import { expect, test } from '@playwright/test'
import { cell, ends, openApp, setField, threading, toolbarButton } from './helpers'

test.beforeEach(async ({ page }) => openApp(page))

/** Reloads once the debounced save has had time to run. */
async function reload(page: import('@playwright/test').Page) {
  await page.waitForTimeout(500)
  await page.reload()
  await expect(page.getByRole('group', { name: 'Threading' })).toBeVisible()
}

test('remembers display settings between visits', async ({ page }) => {
  const slider = page.getByRole('slider', { name: 'Cell size' })
  await slider.focus()
  await slider.press('Home')
  await expect(slider).toHaveValue('6')
  await page.getByLabel('Highlight floats longer than').check()
  await setField(page.getByLabel('Threads', { exact: true }), '3')
  await page.getByLabel('Fabric view').check()
  await page.getByText('Pattern settings').click() // fold the panel away
  await expect(page.getByLabel('Fabric view')).toBeHidden()

  await reload(page)
  await expect(page.getByLabel('Fabric view')).toBeHidden()
  await page.getByText('Pattern settings').click()
  await expect(page.getByRole('slider', { name: 'Cell size' })).toHaveValue('6')
  await expect(page.getByLabel('Highlight floats longer than')).toBeChecked()
  await expect(page.getByLabel('Threads', { exact: true })).toHaveValue('3')
  await expect(page.getByLabel('Fabric view')).toBeChecked()
})

test('restores the unsaved pattern being worked on', async ({ page }) => {
  await setField(page.getByLabel('Ends', { exact: true }), '12')
  await cell(page, 'End 1, shaft 4').click()
  const before = await threading(page)
  expect(before).toBe('423412341234')

  await reload(page)
  expect(await ends(page)).toBe('12')
  expect(await threading(page)).toBe(before)
  // Reset still returns to how the pattern started.
  await page.getByRole('button', { name: 'Reset', exact: true }).click()
  expect(await ends(page)).toBe('32')
})

test('restores the name of a saved pattern, and New starts afresh', async ({ page }) => {
  await toolbarButton(page, 'Save').click()
  await page.getByRole('dialog', { name: 'Save pattern' }).getByRole('button', { name: 'Save' }).click()
  await cell(page, 'End 2, shaft 4').click()

  await reload(page)
  await expect(page.locator('.MuiAppBar-root')).toContainText('Pattern 1')
  expect((await threading(page)).slice(0, 2)).toBe('14')

  await page.getByRole('button', { name: 'New' }).click()
  await reload(page)
  await expect(page.locator('.MuiAppBar-root')).not.toContainText('Pattern 1')
  expect((await threading(page)).slice(0, 4)).toBe('0000')
})
