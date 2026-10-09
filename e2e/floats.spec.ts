import { expect, type Page, test } from '@playwright/test'
import { longFloatMask } from '../src/floats'
import { defaultDraft } from '../src/weave'
import { cell, openApp, setField } from './helpers'

const stats = (page: Page) => page.getByTestId('float-stats')
const highlighted = (page: Page) => page.locator('.drawdown .cell.float')

test.beforeEach(async ({ page }) => openApp(page))

test('shows the longest floats and updates as the draft changes', async ({ page }) => {
  await expect(stats(page)).toHaveText('Longest floats: warp 2, weft 2')
  // Untie treadle 1 entirely: picks on it lift nothing, so the weft floats right across.
  await cell(page, 'Treadle 1, shaft 1').click()
  await cell(page, 'Treadle 1, shaft 2').click()
  await expect(stats(page)).toHaveText('Longest floats: warp 2, weft 32')
})

test('highlights floats longer than the chosen limit', async ({ page }) => {
  const toggle = page.getByLabel('Highlight floats longer than')
  await toggle.check()
  await expect(highlighted(page)).toHaveCount(0) // 2/2 twill: nothing over 7
  // Says why nothing is marked, rather than looking broken.
  await expect(page.getByTestId('float-note')).toHaveText('Nothing to mark: the longest float here is 2 threads.')

  await setField(page.getByLabel('Threads'), '1')
  // Almost every thread in a 2/2 twill is in a 2-thread float; runs cut short at the edges aren't.
  const expected = longFloatMask(defaultDraft(), 1).flat().filter(Boolean).length
  expect(expected).toBeGreaterThan(900)
  await expect(highlighted(page)).toHaveCount(expected)
  await expect(page.getByTestId('float-note')).toHaveText('Striped in the drawdown: floats up to 2 threads long.')

  await setField(page.getByLabel('Threads'), '7')
  await cell(page, 'Treadle 1, shaft 1').click()
  await cell(page, 'Treadle 1, shaft 2').click()
  // 8 picks use treadle 1 in the 32-pick twill: each is one 32-end weft float.
  await expect(highlighted(page)).toHaveCount(8 * 32)

  await toggle.uncheck()
  await expect(highlighted(page)).toHaveCount(0)
})

test('marks floats with black and white stripes, which show on any thread colour and theme', async ({ page }) => {
  for (const season of ['none', 'autumn', 'halloween']) {
    await page.evaluate((s) => localStorage.setItem('wp-season', s), season)
    await page.reload()
    await page.getByLabel('Highlight floats longer than').check()
    await setField(page.getByLabel('Threads'), '1')
    const marks = await highlighted(page)
      .first()
      .evaluate((el) => {
        const after = getComputedStyle(el, '::after')
        return { image: after.backgroundImage, ring: after.boxShadow }
      })
    expect(marks.image, season).toMatch(
      /repeating-linear-gradient.*rgba\(0, 0, 0, 0\.55\).*rgba\(255, 255, 255, 0\.55\)/,
    )
    expect(marks.ring, season).toContain('rgb(0, 0, 0)')
    expect(marks.ring, season).toContain('rgb(255, 255, 255)')
  }
})
