import { expect, type Page, test } from '@playwright/test'
import { a11yProblems, openApp, openKnit } from './helpers'

const accent = (page: Page) =>
  page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--wp-accent').trim().toLowerCase())

async function chooseTheme(page: Page, name: string) {
  await page.getByRole('combobox', { name: 'Colour theme' }).click()
  expect(await a11yProblems(page, '[role="listbox"]')).toEqual([])
  await page.getByRole('option', { name, exact: true }).click()
}

test('a seasonal theme replaces the pink, is remembered, and carries over to Knit', async ({ page }) => {
  await openApp(page)
  expect(await accent(page)).toBe('#d6246e')
  const warp = await page
    .getByRole('group', { name: 'Threading' })
    .locator('[aria-checked="true"]')
    .first()
    .evaluate((el) => getComputedStyle(el).backgroundColor)

  await chooseTheme(page, 'Halloween')
  await expect(page.locator('html')).toHaveClass(/season-halloween/)
  expect(await accent(page)).toBe('#c2410c')
  // MUI's colours change too: the Start weaving button is pumpkin orange.
  await expect(page.getByRole('banner').getByRole('button', { name: 'Start weaving' })).toHaveCSS(
    'background-color',
    'rgb(194, 65, 12)',
  )
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#C2410C')
  // The pattern's own colours aren't touched.
  expect(
    await page
      .getByRole('group', { name: 'Threading' })
      .locator('[aria-checked="true"]')
      .first()
      .evaluate((el) => getComputedStyle(el).backgroundColor),
  ).toBe(warp)

  await page.reload()
  await expect(page.locator('html')).toHaveClass(/season-halloween/)
  await expect(page.getByRole('combobox', { name: 'Colour theme' })).toHaveText(/Halloween/)

  await openKnit(page)
  await expect(page.locator('html')).toHaveClass(/season-halloween/)
  expect(await accent(page)).toBe('#c2410c')
  await chooseTheme(page, 'Knit Patterner colours')
  await expect(page.locator('html')).not.toHaveClass(/season-/)
  expect(await accent(page)).toBe('#00796b')
})

test('Christmas works in dark mode too', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' })
  await openApp(page)
  await chooseTheme(page, 'Christmas')
  expect(await accent(page)).toBe('#f26b6b')
  expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe('rgb(11, 23, 16)')
})

test('"Halloween and Christmas, when it\'s time" follows the calendar', async ({ page }) => {
  await page.clock.setFixedTime(new Date(2026, 9, 31, 12))
  await openApp(page)
  await chooseTheme(page, "Halloween and Christmas, when it's time")
  await expect(page.locator('html')).toHaveClass(/season-halloween/)

  await page.clock.setFixedTime(new Date(2026, 11, 20, 12))
  await page.reload()
  await expect(page.locator('html')).toHaveClass(/season-christmas/)

  await page.clock.setFixedTime(new Date(2026, 5, 20, 12))
  await page.reload()
  await expect(page.getByRole('group', { name: 'Threading' })).toBeVisible()
  await expect(page.locator('html')).not.toHaveClass(/season-/)
  expect(await accent(page)).toBe('#d6246e')
})
