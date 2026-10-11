import { expect, test } from '@playwright/test'
import { openApp } from './helpers'

test('on a phone or tablet, a tap on the drawdown swaps a square once drawing is on', async ({ page }) => {
  await openApp(page)
  const square = page.locator('.drawdown [data-pick="2"][data-end="4"]')
  const warp = async () => (await square.getAttribute('class'))?.includes(' warp')
  const was = await warp()
  // The view settings are in the sheet on phones and tablets, or the sidebar on wider ones.
  const sidebar = page.getByRole('complementary', { name: 'Pattern settings' })
  if (await sidebar.isVisible()) await sidebar.getByLabel('Draw on the drawdown').check()
  else {
    await page.locator('[data-tour="settings"]').last().tap()
    const sheet = page.getByRole('dialog', { name: 'Pattern settings' })
    await sheet.getByLabel('Draw on the drawdown').check()
    await sheet.getByRole('button', { name: 'Close pattern settings' }).tap()
  }
  await expect(page.getByTestId('draw-hint')).toContainText('tap or drag')
  await square.scrollIntoViewIfNeeded()
  await square.tap()
  await expect.poll(warp).toBe(!was)
})
