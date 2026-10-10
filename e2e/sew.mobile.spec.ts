import { expect, test } from '@playwright/test'
import { openSew } from './helpers'

test('Sew Patterner fits the screen, and its settings and file menu work by touch', async ({ page }) => {
  await openSew(page)
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  expect(overflow).toBeLessThanOrEqual(0)
  await page.getByRole('button', { name: 'Tank top', exact: true }).tap()
  await expect(page.getByRole('img', { name: /^Tank top pattern/ })).toBeVisible()
  const nav = page.getByRole('navigation', { name: 'Main' })
  if (await nav.isVisible()) {
    await nav.getByRole('button', { name: 'File' }).tap()
    await expect(page.getByRole('menuitem', { name: /PDF for home printing \(A4\)/ })).toBeVisible()
    await page.keyboard.press('Escape')
  }
})
