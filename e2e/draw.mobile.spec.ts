import { expect, test } from '@playwright/test'
import { openApp } from './helpers'

test('on a phone or tablet, a tap on the drawdown swaps a square once drawing is on', async ({ page }) => {
  await openApp(page)
  const square = page.locator('.drawdown [data-pick="2"][data-end="4"]')
  const warp = async () => (await square.getAttribute('class'))?.includes(' warp')
  const was = await warp()
  await page.getByRole('button', { name: 'Draw cloth', exact: true }).tap()
  await expect(page.getByTestId('draw-hint')).toContainText('tap or drag')
  await square.scrollIntoViewIfNeeded()
  await square.tap()
  await expect.poll(warp).toBe(!was)
})
