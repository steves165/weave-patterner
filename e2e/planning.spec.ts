import { expect, type Page, test } from '@playwright/test'
import { openApp, openTool, picks, setField, toast, toolbarButton } from './helpers'

test.beforeEach(async ({ page }) => openApp(page))

test('warp winding plan lists colour runs by bout, with tick boxes and yarn names', async ({ page }) => {
  await page.getByLabel('Warp 5', { exact: true }).fill('#ffffff')
  await page.getByLabel('Warp 6', { exact: true }).fill('#ffffff')
  await openTool(page, /Yarn library/)
  const yarns = page.getByRole('dialog', { name: 'Yarn library' })
  await yarns.getByRole('button', { name: 'Add a yarn for #8b0a0a' }).click()
  await yarns.getByLabel('Yarn 1 name').fill('Red wool')
  await yarns.getByRole('button', { name: 'Done' }).click()

  await openTool(page, /Warp winding plan/)
  const plan = page.getByRole('dialog', { name: 'Warp winding plan' })
  await expect(plan.getByText('Wind 4 Red wool (#8b0a0a)')).toBeVisible()
  await expect(plan.getByText('Wind 2 #ffffff')).toBeVisible()
  await expect(plan.getByText('Wind 26 Red wool (#8b0a0a)')).toBeVisible()
  await expect(plan.getByTestId('warp-totals')).toContainText('30 ends of Red wool (#8b0a0a)')
  await expect(plan.getByTestId('warp-totals')).toContainText('2 ends of #ffffff')

  await plan.getByLabel(/Wind 4 Red wool/).check()
  await expect(plan.getByTestId('plan-progress')).toHaveText('1 of 3 runs wound')

  await plan.getByLabel('Ends per bout').fill('12')
  await expect(plan.getByRole('region', { name: 'Bout 3' })).toContainText('Bout 3: ends 25–32 (8 ends)')
  await expect(plan.getByTestId('plan-progress')).toHaveText(/of 5 runs wound/)
  await plan.getByRole('button', { name: 'Clear ticks' }).click()
  await expect(plan.getByTestId('plan-progress')).toHaveText('0 of 5 runs wound')
})

test('warns when the weft will not catch the edge ends', async ({ page }) => {
  // A 2/2 twill misses the edge end on some turns.
  await expect(page.getByTestId('selvedge')).toContainText("the weft won't catch the edge end")
  await expect(page.getByTestId('selvedge')).toContainText('floating selvedge')
  // Plain weave catches it every time.
  await setField(page.getByLabel('Shafts', { exact: true }), '2')
  await setField(page.getByLabel('Treadles', { exact: true }), '2')
  await expect(page.getByTestId('selvedge')).toHaveCount(0)
})

test.describe('tabby', () => {
  const dialog = (page: Page) => page.getByRole('dialog', { name: 'Transform draft' })

  test('inserts tabby after every pattern pick, and takes it out again', async ({ page }) => {
    await openTool(page, /Transform draft/)
    await dialog(page).getByLabel('Tabby weft colour').fill('#123456')
    await dialog(page).getByRole('button', { name: 'Insert tabby' }).click()
    await expect(toast(page)).toContainText('Put tabby between the pattern picks')
    expect(await picks(page)).toBe('64')
    await expect(page.getByLabel('Treadles', { exact: true })).toHaveValue('6')
    await expect(page.getByLabel('Weft 2', { exact: true })).toHaveValue('#123456')

    await openTool(page, /Transform draft/)
    await dialog(page).getByRole('button', { name: 'Remove tabby' }).click()
    await expect(toast(page)).toContainText('Took out 32 tabby picks')
    expect(await picks(page)).toBe('32')
    await openTool(page, /Transform draft/)
    await dialog(page).getByRole('button', { name: 'Remove tabby' }).click()
    await expect(dialog(page).getByRole('alert')).toHaveText('There are no tabby picks to take out')
  })

  test('warns where the threading breaks tabby', async ({ page }) => {
    await page.getByRole('checkbox', { name: 'End 2, shaft 3', exact: true }).click()
    await openTool(page, /Transform draft/)
    await expect(dialog(page).getByTestId('tabby-breaks')).toContainText("Tabby won't be plain weave at ends 2, 3")
  })
})

test('colourways: try ideas or your own colours, then undo', async ({ page }) => {
  await openTool(page, /Colourways/)
  const ways = page.getByRole('dialog', { name: 'Colourways' })
  await expect(ways.getByRole('button', { name: 'Use Greys' })).toBeVisible()
  await ways.getByRole('button', { name: 'Use Colours swapped' }).click()
  await expect(toast(page)).toContainText('Recoloured: colours swapped')
  await expect(page.getByLabel('Warp 1', { exact: true })).toHaveValue('#ffffff')
  await expect(page.getByLabel('Weft 1', { exact: true })).toHaveValue('#8b0a0a')
  await toolbarButton(page, 'Undo').click()

  await openTool(page, /Colourways/)
  await ways.getByLabel('New colour for colour 1 (#8b0a0a)').fill('#00ff00')
  await ways.getByRole('button', { name: 'Apply my colours' }).click()
  await expect(page.getByLabel('Warp 32', { exact: true })).toHaveValue('#00ff00')
  await expect(page.getByLabel('Weft 1', { exact: true })).toHaveValue('#ffffff')
})

test('variations: other tie-ups and treadlings for the same threading', async ({ page }) => {
  const tieupCell = page.getByRole('checkbox', { name: 'Treadle 1, shaft 3', exact: true })
  await expect(tieupCell).toHaveAttribute('aria-checked', 'false')
  await openTool(page, /Variations/)
  const v = page.getByRole('dialog', { name: 'Variations' })
  await expect(
    v.getByRole('region', { name: 'Other treadlings' }).getByRole('button', { name: /^Use / }).first(),
  ).toBeVisible()
  await v.getByRole('button', { name: 'Use 3/1 twill tie-up' }).click()
  await expect(toast(page)).toContainText('Used the variation: 3/1 twill tie-up')
  await expect(tieupCell).toHaveAttribute('aria-checked', 'true')

  await toolbarButton(page, 'Tools').click()
  await page.getByRole('menuitem', { name: /Convert to lift plan/ }).click()
  await openTool(page, /Variations/)
  await expect(v.getByRole('region', { name: 'Other tie-ups' })).toContainText('A lift plan has no tie-up to change')
})
