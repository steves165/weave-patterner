import { expect, test } from '@playwright/test'
import { drawdownPicture, openApp, openTool, setField, toast, toolbarButton } from './helpers'

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
  await toolbarButton(page, 'Start weaving').click()
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
  await toolbarButton(page, 'Start weaving').click()
  await expect(page.getByTestId('instruction')).toHaveText('Lift shafts 1, 2, 4')
})

test('no tie-up: works as a lift plan for looms without a tie-up', async ({ page }) => {
  const before = await drawdownPicture(page)
  await expect(page.getByRole('group', { name: 'Tie-up' })).toBeVisible()
  await page.getByLabel('No tie-up (lift plan)').check()
  await expect(toast(page)).toContainText('No tie-up')
  await expect(page.getByRole('group', { name: 'Tie-up' })).toHaveCount(0)
  await expect(page.getByRole('group', { name: 'Lift plan' })).toBeVisible()
  await expect(page.getByLabel('Treadles', { exact: true })).toHaveCount(0)
  await expect(page.getByText('4 shafts · lift plan · 32 × 32')).toBeVisible()
  // The same cloth.
  expect(await drawdownPicture(page)).toBe(before)

  // More shafts: still a lift plan, one column per shaft.
  await setField(page.getByLabel('Shafts', { exact: true }), '8')
  await expect(page.getByRole('checkbox', { name: 'Pick 1, shaft 8', exact: true })).toBeVisible()
  await expect(page.getByRole('group', { name: 'Tie-up' })).toHaveCount(0)

  // Drafts made with the tools come out as lift plans too.
  await openTool(page, /Block profile/)
  const profile = page.getByRole('dialog', { name: 'Block profile' })
  await profile.getByRole('combobox', { name: 'Structure' }).click()
  await page.getByRole('option', { name: 'Summer and winter', exact: true }).click()
  await profile.getByRole('button', { name: 'Create draft' }).click()
  await expect(page.getByRole('group', { name: 'Lift plan' })).toBeVisible()
  await expect(page.getByRole('group', { name: 'Tie-up' })).toHaveCount(0)

  // Remembered between visits.
  await page.reload()
  await expect(page.getByLabel('No tie-up (lift plan)')).toBeChecked()
  await expect(page.getByRole('group', { name: 'Tie-up' })).toHaveCount(0)

  // Converting back to a tie-up and treadling brings the tie-up back.
  await toolbarButton(page, 'Tools').click()
  await page.getByRole('menuitem', { name: /Convert to tie-up and treadling/ }).click()
  await expect(page.getByLabel('No tie-up (lift plan)')).not.toBeChecked()
  await expect(page.getByRole('group', { name: 'Tie-up' })).toBeVisible()
})

test('no tie-up: a pick can lift several shafts, whichever draw tool is chosen', async ({ page }) => {
  await page.getByLabel('No tie-up (lift plan)').check()
  await expect(page.getByRole('group', { name: 'Lift plan' })).toBeVisible()
  for (const tool of ['Click', 'Straight draw', 'Point draw']) {
    await page.getByRole('button', { name: tool }).click()
    const box = (s: number) => page.getByRole('checkbox', { name: `Pick 3, shaft ${s}`, exact: true })
    for (const s of [1, 2, 3, 4]) if ((await box(s).getAttribute('aria-checked')) === 'true') await box(s).click()
    await box(1).click()
    await box(3).click()
    await box(4).click()
    for (const [s, on] of [
      [1, 'true'],
      [2, 'false'],
      [3, 'true'],
      [4, 'true'],
    ] as const)
      await expect(box(s), `${tool}: shaft ${s}`).toHaveAttribute('aria-checked', on)
  }
})

test('with a drawing tool, clicks that slip into the next box still add lifts to the pick', async ({ page }) => {
  await page.getByLabel('No tie-up (lift plan)').check()
  await page.getByRole('button', { name: 'Straight draw', exact: true }).click()
  const grid = page.getByRole('group', { name: 'Lift plan' })
  const box = (s: number) => grid.getByRole('checkbox', { name: `Pick 3, shaft ${s}`, exact: true })
  for (let s = 1; s <= 4; s++) {
    if ((await box(s).getAttribute('aria-checked')) === 'true') continue
    const b = await box(s).boundingBox()
    if (!b) throw new Error('no box')
    // Press near the right edge, and let the hand drift a few pixels into the next box before letting go.
    await page.mouse.move(b.x + b.width - 2, b.y + b.height / 2)
    await page.mouse.down()
    await page.mouse.move(b.x + b.width + 4, b.y + b.height / 2)
    await page.mouse.up()
  }
  for (let s = 1; s <= 4; s++) await expect(box(s)).toHaveAttribute('aria-checked', 'true')

  // Dragging down onto other picks still draws a run, one shaft per pick.
  const start = await grid.getByRole('checkbox', { name: 'Pick 5, shaft 1', exact: true }).boundingBox()
  const end = await grid.getByRole('checkbox', { name: 'Pick 8, shaft 4', exact: true }).boundingBox()
  if (!start || !end) throw new Error('no boxes')
  await page.mouse.move(start.x + start.width / 2, start.y + start.height / 2)
  await page.mouse.down()
  await page.mouse.move(end.x + end.width / 2, end.y + end.height / 2, { steps: 12 })
  await page.mouse.up()
  for (let p = 5; p <= 8; p++)
    await expect(grid.getByRole('checkbox', { name: new RegExp(`^Pick ${p}, shaft`), checked: true })).toHaveCount(1)
})
