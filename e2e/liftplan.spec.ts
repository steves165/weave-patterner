import { expect, test } from '@playwright/test'
import { openApp, openTool, toast, toolbarButton } from './helpers'

test.beforeEach(async ({ page }) => openApp(page))

test('converts to a lift plan and back without changing the cloth', async ({ page }) => {
  const cloth = () =>
    page
      .locator('.drawdown')
      .evaluate((dd) => [...dd.children].map((c) => (c as HTMLElement).style.backgroundColor).join())
  const before = await cloth()

  await openTool(page, /Convert to lift plan/)
  await expect(toast(page)).toContainText('Converted to a lift plan')
  await expect(page.getByRole('group', { name: 'Lift plan' })).toBeVisible()
  // 2/2 twill: pick 1 lifts shafts 1 and 2.
  await expect(page.getByRole('checkbox', { name: 'Pick 1, shaft 1' })).toHaveAttribute('aria-checked', 'true')
  await expect(page.getByRole('checkbox', { name: 'Pick 1, shaft 2' })).toHaveAttribute('aria-checked', 'true')
  await expect(page.getByRole('checkbox', { name: 'Pick 1, shaft 3' })).toHaveAttribute('aria-checked', 'false')
  expect(await cloth()).toBe(before)

  // Weaving mode starts in the shafts view for a lift plan.
  await toolbarButton(page, 'Weave').click()
  await expect(page.getByTestId('instruction')).toHaveText('Lift shafts 1, 2')
  await page.getByRole('button', { name: 'Close weaving mode' }).click()

  await openTool(page, /Convert to tie-up and treadling/)
  await expect(toast(page)).toContainText('Converted to tie-up and treadling with 4 treadles')
  await expect(page.getByRole('group', { name: 'Treadling' })).toBeVisible()
  expect(await cloth()).toBe(before)
})

test('editing the lift plan sets the shafts for a pick', async ({ page }) => {
  await openTool(page, /Convert to lift plan/)
  await page.getByRole('checkbox', { name: 'Pick 1, shaft 4' }).click()
  await toolbarButton(page, 'Weave').click()
  await expect(page.getByTestId('instruction')).toHaveText('Lift shafts 1, 2, 4')
})
