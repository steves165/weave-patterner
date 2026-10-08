import { expect, test } from '@playwright/test'
import { cell, knitSquare, openApp, openKnit } from './helpers'

test.describe('with motion on', () => {
  test.use({ contextOptions: { reducedMotion: 'no-preference' } })

  test('an edit makes the drawdown squares it changed glow, and only those', async ({ page }) => {
    await openApp(page)
    const changed = page.locator('.drawdown .cell.changed')
    await expect(changed).toHaveCount(0)
    // End 1 moves from shaft 1 to shaft 2: only some squares in its column change.
    await cell(page, 'End 1, shaft 2').click()
    await expect(changed.first()).toBeVisible()
    const ends = await changed.evaluateAll((els) => [...new Set(els.map((e) => (e as HTMLElement).dataset.end))])
    expect(ends).toEqual(['0'])
    expect(await changed.first().evaluate((el) => getComputedStyle(el).animationName)).toBe('wp-changed')
    // The glow fades and the class goes, ready for the next edit.
    await expect(changed).toHaveCount(0, { timeout: 3000 })
  })

  test('painting a knitting square pops it and flashes the row it rewrites', async ({ page }) => {
    await openKnit(page)
    await page.getByRole('button', { name: 'Purl', exact: true }).click()
    await knitSquare(page, 1, 3).click()
    await expect(knitSquare(page, 1, 3)).toHaveClass(/painted/)
    await expect(page.getByTestId('knit-written').locator('li.changed[data-row="1"]')).toBeVisible()
    await expect(page.locator('.knit-cell.painted')).toHaveCount(0, { timeout: 3000 })
  })
})

test('with reduced motion asked for, nothing moves', async ({ page }) => {
  await openApp(page)
  await cell(page, 'End 1, shaft 2').click()
  const square = page.locator('.drawdown .cell').first()
  expect(await square.evaluate((el) => getComputedStyle(el).animationName)).toBe('none')
  expect(await page.locator('.draft-scroll').evaluate((el) => getComputedStyle(el).animationName)).toBe('none')
})
