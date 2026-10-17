import { expect, test } from '@playwright/test'
import {
  cell,
  drawdownPicture,
  loomChoice,
  newPattern,
  openApp,
  openTool,
  setField,
  toast,
  toolbarButton,
} from './helpers'

test.beforeEach(async ({ page }) => openApp(page))

test('the Loom setting converts to a lift plan and back without changing the cloth', async ({ page }) => {
  const cloth = () =>
    page
      .locator('.drawdown')
      .evaluate((dd) => [...dd.children].map((c) => (c as HTMLElement).style.backgroundColor).join())
  const before = await cloth()

  await loomChoice(page, 'Loom type', 'Lift plan').click()
  await expect(toast(page)).toContainText('Lift plan: the right-hand grid')
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

  await loomChoice(page, 'Loom type', 'Treadles').click()
  await expect(toast(page)).toContainText('Tie-up and treadles: your tie-up is back. The cloth is the same.')
  await expect(page.getByRole('group', { name: 'Treadling' })).toBeVisible()
  expect(await cloth()).toBe(before)
})

test('editing the lift plan sets the shafts for a pick', async ({ page }) => {
  await loomChoice(page, 'Loom type', 'Lift plan').click()
  await page.getByRole('checkbox', { name: 'Pick 1, shaft 4' }).click()
  await toolbarButton(page, 'Start weaving').click()
  await expect(page.getByTestId('instruction')).toHaveText('Lift shafts 1, 2, 4')
})

test('lift plan loom: works as a lift plan for looms without a tie-up', async ({ page }) => {
  const before = await drawdownPicture(page)
  await expect(page.getByRole('group', { name: 'Tie-up' })).toBeVisible()
  await loomChoice(page, 'Loom type', 'Lift plan').click()
  await expect(toast(page)).toContainText('Lift plan')
  // The shed only applies to a tie-up.
  await expect(page.getByRole('group', { name: 'Shed', exact: true })).toHaveCount(0)
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
  await openTool(page, /Profile draft/)
  const profile = page.getByRole('dialog', { name: 'Profile draft' })
  await profile.getByRole('combobox', { name: 'Structure' }).click()
  await page.getByRole('option', { name: 'Summer and winter', exact: true }).click()
  await profile.getByRole('button', { name: 'Create draft' }).click()
  await expect(page.getByRole('group', { name: 'Lift plan' })).toBeVisible()
  await expect(page.getByRole('group', { name: 'Tie-up' })).toHaveCount(0)

  // Remembered between visits.
  await page.reload()
  await expect(loomChoice(page, 'Loom type', 'Lift plan')).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('group', { name: 'Tie-up' })).toHaveCount(0)

  // Back to a tie-up and treadles brings the tie-up back.
  await loomChoice(page, 'Loom type', 'Treadles').click()
  await expect(loomChoice(page, 'Loom type', 'Lift plan')).toHaveAttribute('aria-pressed', 'false')
  await expect(page.getByRole('group', { name: 'Tie-up' })).toBeVisible()
})

test('lift plan loom: a pick can lift several shafts, whichever draw tool is chosen', async ({ page }) => {
  await loomChoice(page, 'Loom type', 'Lift plan').click()
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
  await loomChoice(page, 'Loom type', 'Lift plan').click()
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

test('switching to a lift plan and back keeps your tie-up and everything drawn on either', async ({ page }) => {
  // Your own tie-up: treadle 4 also lifts shaft 2.
  await cell(page, 'Treadle 4, shaft 2').click()
  await expect(cell(page, 'Treadle 4, shaft 2')).toHaveAttribute('aria-checked', 'true')
  const tieup = await page
    .getByRole('group', { name: 'Tie-up' })
    .getByRole('checkbox')
    .evaluateAll((cells) => cells.map((c) => c.getAttribute('aria-checked')).join())

  // On the lift plan, pick 1 gets shaft 3 as well.
  await loomChoice(page, 'Loom type', 'Lift plan').click()
  await expect(page.getByRole('group', { name: 'Tie-up' })).toHaveCount(0)
  await cell(page, 'Pick 1, shaft 3').click()
  const cloth = await drawdownPicture(page)

  // Back on treadles: the same tie-up, with one more treadle for pick 1's new shed, and the same cloth.
  await loomChoice(page, 'Loom type', 'Treadles').click()
  await expect(toast(page)).toContainText('your tie-up is back, with 1 more treadle for new sheds')
  await expect(cell(page, 'Treadle 4, shaft 2')).toHaveAttribute('aria-checked', 'true')
  await expect(cell(page, 'Treadle 5, shaft 3')).toHaveAttribute('aria-checked', 'true')
  await expect(cell(page, 'Pick 1, treadle 5')).toHaveAttribute('aria-checked', 'true')
  expect(await drawdownPicture(page)).toBe(cloth)
  const first4 = await page
    .getByRole('group', { name: 'Tie-up' })
    .getByRole('checkbox')
    .evaluateAll((cells) =>
      cells
        .filter((c) => /^Treadle [1-4],/.test(c.getAttribute('aria-label') ?? ''))
        .map((c) => c.getAttribute('aria-checked'))
        .join(),
    )
  expect(first4).toBe(tieup)

  // Pick 2 on treadle 1 here, then over and back once more: nothing is lost.
  await cell(page, 'Pick 2, treadle 1').click()
  const after = await drawdownPicture(page)
  await loomChoice(page, 'Loom type', 'Lift plan').click()
  await expect(page.getByRole('group', { name: 'Tie-up' })).toHaveCount(0)
  await expect(cell(page, 'Pick 1, shaft 3')).toHaveAttribute('aria-checked', 'true')
  expect(await drawdownPicture(page)).toBe(after)
  await loomChoice(page, 'Loom type', 'Treadles').click()
  await expect(cell(page, 'Treadle 4, shaft 2')).toHaveAttribute('aria-checked', 'true')
  await expect(cell(page, 'Pick 2, treadle 1')).toHaveAttribute('aria-checked', 'true')
  expect(await drawdownPicture(page)).toBe(after)
})

test('undo goes back across a switch of loom type, tie-up and all', async ({ page }) => {
  await loomChoice(page, 'Loom type', 'Lift plan').click()
  await expect(page.getByRole('group', { name: 'Tie-up' })).toHaveCount(0)
  await cell(page, 'Pick 1, shaft 3').click()

  await toolbarButton(page, 'Undo').click()
  await expect(cell(page, 'Pick 1, shaft 3')).toHaveAttribute('aria-checked', 'false')
  await expect(page.getByRole('group', { name: 'Tie-up' })).toHaveCount(0)
  // Undoing the switch itself is back on treadles, with the tie-up.
  await toolbarButton(page, 'Undo').click()
  await expect(page.getByRole('group', { name: 'Tie-up' })).toBeVisible()
  await expect(page.getByRole('group', { name: 'Treadling' })).toBeVisible()
  await expect(loomChoice(page, 'Loom type', 'Treadles')).toHaveAttribute('aria-pressed', 'true')

  // And redo goes forward again, to the lift plan.
  await toolbarButton(page, 'Redo').click()
  await expect(page.getByRole('group', { name: 'Tie-up' })).toHaveCount(0)
  await expect(loomChoice(page, 'Loom type', 'Lift plan')).toHaveAttribute('aria-pressed', 'true')
  await toolbarButton(page, 'Redo').click()
  await expect(cell(page, 'Pick 1, shaft 3')).toHaveAttribute('aria-checked', 'true')
})

test('a straight tie-up on treadles stays a tie-up and treadles', async ({ page }) => {
  await newPattern(page)
  // 4 shafts and 4 treadles, tied up straight: treadle n lifts shaft n.
  for (let n = 1; n <= 4; n++) await cell(page, `Treadle ${n}, shaft ${n}`).click()
  await expect(page.getByRole('group', { name: 'Tie-up' })).toBeVisible()
  await expect(page.getByRole('group', { name: 'Treadling' })).toBeVisible()
  await expect(cell(page, 'Pick 1, treadle 1')).toBeVisible()
})
