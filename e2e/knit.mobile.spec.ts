import { expect, test } from '@playwright/test'
import { knitSquare, openKnit, writtenRow } from './helpers'

test('Knit Patterner fits the screen, and a tap paints a square', async ({ page }) => {
  await openKnit(page)
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  expect(overflow).toBeLessThanOrEqual(0)
  const nav = page.getByRole('navigation', { name: 'Main' })
  if (await nav.isVisible()) {
    await nav.getByRole('button', { name: 'File' }).tap()
    await page.getByRole('menuitem', { name: 'New' }).tap()
  } else await page.getByRole('button', { name: 'New' }).click()
  await page.getByRole('button', { name: 'Purl', exact: true }).tap()
  await knitSquare(page, 1, 1).tap()
  expect(await writtenRow(page, 1)).toBe('p1, k23.')
})
