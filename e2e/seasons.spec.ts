import { expect, type Page, test } from '@playwright/test'
import { a11yProblems, openApp, openKnit } from './helpers'

const accent = (page: Page) =>
  page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--wp-accent').trim().toLowerCase())

/** Chooses a theme (by its id) from Theme at the foot of the page. */
async function chooseTheme(page: Page, id: string) {
  await page.getByRole('contentinfo').getByRole('button', { name: 'Theme' }).click()
  const dialog = page.getByRole('dialog', { name: 'Colour theme' })
  expect(await a11yProblems(page, '[role="dialog"]')).toEqual([])
  await dialog.locator(`input[value="${id}"]`).check()
  await dialog.getByRole('button', { name: 'Done' }).click()
  await expect(dialog).toBeHidden()
}

/** The colour of the first warp end and first weft pick. */
const patternColours = (page: Page) =>
  page.evaluate(() => {
    const swatch = (label: string) => (document.querySelector(`input[aria-label="${label}"]`) as HTMLInputElement).value
    return [swatch('Warp 1'), swatch('Weft 1')]
  })

test('a seasonal theme replaces the pink, is remembered, and carries over to Knit', async ({ page }) => {
  await openApp(page)
  expect(await accent(page)).toBe('#d6246e')
  const warp = await page
    .getByRole('group', { name: 'Threading' })
    .locator('[aria-checked="true"]')
    .first()
    .evaluate((el) => getComputedStyle(el).backgroundColor)

  await chooseTheme(page, 'halloween')
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
  await page.getByRole('contentinfo').getByRole('button', { name: 'Theme' }).click()
  await expect(page.getByRole('radio', { name: /^Halloween Pumpkin/ })).toBeChecked()
  await page.keyboard.press('Escape')

  await openKnit(page)
  await expect(page.locator('html')).toHaveClass(/season-halloween/)
  expect(await accent(page)).toBe('#c2410c')
  await chooseTheme(page, 'none')
  await expect(page.locator('html')).not.toHaveClass(/season-/)
  expect(await accent(page)).toBe('#00796b')
})

test('Christmas works in dark mode too', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' })
  await openApp(page)
  await chooseTheme(page, 'christmas')
  expect(await accent(page)).toBe('#f26b6b')
  expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe('rgb(11, 23, 16)')
})

test('"Seasonal" follows the calendar: seasons, with Easter, Halloween and Christmas when it\'s time', async ({
  page,
}) => {
  const at = async (date: Date, season: string) => {
    await page.clock.setFixedTime(date)
    await page.reload()
    await expect(page.getByRole('group', { name: 'Threading' })).toBeVisible()
    await expect(page.locator('html')).toHaveClass(new RegExp(`season-${season}\\b`))
  }
  await page.clock.setFixedTime(new Date(2026, 9, 31, 12))
  await openApp(page)
  await chooseTheme(page, 'seasonal')
  await expect(page.locator('html')).toHaveClass(/season-halloween/)
  await at(new Date(2026, 11, 20, 12), 'christmas')
  // Easter Sunday 2026 is 5 April.
  await at(new Date(2026, 3, 5, 12), 'easter')
  await at(new Date(2026, 3, 20, 12), 'spring')
  await at(new Date(2026, 6, 20, 12), 'summer')
  await at(new Date(2026, 8, 20, 12), 'autumn')
  await at(new Date(2027, 0, 20, 12), 'winter')
  // The dialog says which it is now.
  await page.getByRole('contentinfo').getByRole('button', { name: 'Theme' }).click()
  await expect(page.getByRole('dialog', { name: 'Colour theme' })).toContainText('Now: Winter')
})

test('the old "Halloween and Christmas" choice becomes Seasonal', async ({ page }) => {
  await page.clock.setFixedTime(new Date(2026, 6, 20, 12))
  await page.addInitScript(() => localStorage.setItem('wp-season', 'holidays'))
  await openApp(page)
  await expect(page.locator('html')).toHaveClass(/season-summer/)
  await page.getByRole('contentinfo').getByRole('button', { name: 'Theme' }).click()
  await expect(page.getByRole('dialog', { name: 'Colour theme' }).locator('input[value="seasonal"]')).toBeChecked()
})

test("new patterns start in the theme's colours; patterns you have keep theirs", async ({ page }) => {
  await openApp(page)
  expect(await patternColours(page)).toEqual(['#d6246e', '#ffd3e4'])
  await chooseTheme(page, 'christmas')
  // The pattern on screen is left alone.
  expect(await patternColours(page)).toEqual(['#d6246e', '#ffd3e4'])
  const sidebar = page.getByRole('complementary', { name: 'Pattern settings' })
  await sidebar.getByRole('button', { name: 'New' }).click()
  expect(await patternColours(page)).toEqual(['#b71c1c', '#1b5e20'])

  // A first visit's starting pattern too.
  await page.evaluate(() => {
    for (const k of Object.keys(localStorage))
      if (k !== 'wp-season' && !k.startsWith('wp-tour') && !k.includes('consent')) localStorage.removeItem(k)
  })
  await page.reload()
  await expect(page.getByRole('group', { name: 'Threading' })).toBeVisible()
  expect(await patternColours(page)).toEqual(['#b71c1c', '#1b5e20'])
})

test("a new Knit chart starts in the theme's colours", async ({ page }) => {
  await openKnit(page)
  await chooseTheme(page, 'halloween')
  await page.getByRole('button', { name: 'New' }).click()
  await expect(page.getByLabel('Colour A', { exact: true })).toHaveValue('#f28c28')
  await expect(page.getByLabel('Colour B', { exact: true })).toHaveValue('#24132e')
  const square = await page
    .locator('[role="gridcell"]')
    .first()
    .evaluate((el) => getComputedStyle(el).backgroundColor)
  expect(square).toBe('rgb(242, 140, 40)')
})
