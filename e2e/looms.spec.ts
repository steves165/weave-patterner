import { expect, type Page, test } from '@playwright/test'
import { defaultDraft, exportFile } from '../src/weave'
import { openApp, openTool, setField, toast, toolbarButton } from './helpers'

test.beforeEach(async ({ page }) => openApp(page))

async function importDraft(page: Page, draft: ReturnType<typeof defaultDraft>) {
  await toolbarButton(page, 'Import').click()
  await page.locator('input[type=file]').setInputFiles({
    name: 'test.weave.json',
    mimeType: 'application/json',
    buffer: Buffer.from(exportFile('Test', draft)),
  })
  await expect(page.getByRole('dialog')).toBeHidden()
}

test('cloth report describes the structure', async ({ page }) => {
  await openTool(page, /Cloth report/)
  const report = page.getByRole('dialog', { name: 'Cloth report' })
  await expect(report.getByTestId('firmness')).toContainText('Balanced')
  await expect(report.getByTestId('interlacing')).toHaveText('50% of crossings swap over (plain weave 100%)')
  await expect(report.getByTestId('average-float')).toHaveText('warp 2, weft 2 threads')
  await report.getByRole('button', { name: 'Close' }).click()
  await setField(page.getByLabel('Shafts', { exact: true }), '2')
  await setField(page.getByLabel('Treadles', { exact: true }), '2')
  await openTool(page, /Cloth report/)
  await expect(report.getByTestId('firmness')).toContainText('Very firm')
})

test('save treadles makes a skeleton tie-up for the same cloth', async ({ page }) => {
  // 8 treadles: the four 2-shaft twill sheds and the four single shafts, one after another.
  const d = defaultDraft()
  d.treadles = 8
  d.tieup = d.tieup.map((_, s) => Array.from({ length: 8 }, (_, k) => (k < 4 ? (s - k + 4) % 4 < 2 : s === k - 4)))
  d.treadling = d.treadling.map((_, p) => Array.from({ length: 8 }, (_, k) => k === p % 8))
  await importDraft(page, d)
  const before = await page.locator('.drawdown').evaluate((el) => el.innerHTML)
  await openTool(page, /Transform draft/)
  await page.getByRole('dialog', { name: 'Transform draft' }).getByRole('button', { name: 'Save treadles' }).click()
  await expect(toast(page)).toContainText('Now 4 treadles; 16 picks press two at once')
  await expect(page.getByLabel('Treadles', { exact: true })).toHaveValue('4')
  expect(await page.locator('.drawdown').evaluate((el) => el.innerHTML)).toBe(before)

  await openTool(page, /Transform draft/)
  await page.getByRole('dialog', { name: 'Transform draft' }).getByRole('button', { name: 'Save treadles' }).click()
  await expect(page.getByRole('dialog', { name: 'Transform draft' }).getByRole('alert')).toContainText(
    "can't use fewer treadles",
  )
})

test('rigid heddle: translates plain weave, explains a twill', async ({ page }) => {
  await openTool(page, /Rigid heddle/)
  const dialog = page.getByRole('dialog', { name: 'Rigid heddle' })
  await expect(dialog.getByTestId('rh-reason')).toContainText("can't be woven on a rigid heddle")
  await dialog.getByRole('button', { name: 'Close' }).click()

  await setField(page.getByLabel('Shafts', { exact: true }), '2')
  await setField(page.getByLabel('Treadles', { exact: true }), '2')
  await openTool(page, /Rigid heddle/)
  await expect(dialog.getByTestId('rh-plan')).toContainText('end 1 in a hole, then alternate slot, hole')
  await expect(dialog.getByTestId('rh-pickup')).toHaveText('Pick-up stick: not needed.')
  const steps = dialog.getByRole('list', { name: 'Weaving steps' })
  await expect(steps.getByRole('listitem').first()).toHaveText('Pick 1: Heddle up')
  await expect(steps.getByRole('listitem').nth(1)).toHaveText('Pick 2: Heddle down')
  await expect(steps.getByRole('listitem')).toHaveCount(2)
  await expect(dialog).toContainText('Then repeat from pick 1 (32 picks in all).')
})

test.describe('tablet weaving', () => {
  const dialog = (page: Page) => page.getByRole('dialog', { name: 'Tablet weaving' })

  test('designs a band from cards, threading and turning', async ({ page }) => {
    await openTool(page, /Tablet weaving/)
    await expect(dialog(page).getByRole('img', { name: 'Woven band' })).toBeVisible()
    await expect(dialog(page)).toContainText('The band (16 rows)')
    await expect(dialog(page).getByTestId('tablet-warp')).toHaveText('48 ends: 24 × #1a237e, 24 × #f5f0e6')

    // Thread card 1, hole A in red.
    await dialog(page).getByRole('radio', { name: 'Colour 3' }).click()
    await dialog(page).getByRole('gridcell', { name: 'Card 1, hole A' }).click()
    await expect(dialog(page).getByTestId('tablet-warp')).toContainText('1 × #b71c1c')

    await dialog(page).getByRole('button', { name: 'Card 1 threaded S' }).click()
    await expect(dialog(page).getByRole('button', { name: 'Card 1 threaded Z' })).toBeVisible()

    await dialog(page).getByLabel('Turning', { exact: true }).fill('6F 6B')
    await expect(dialog(page)).toContainText('The band (12 rows)')
    await dialog(page).getByLabel('Turning', { exact: true }).fill('6Q')
    await expect(dialog(page).getByRole('alert')).toContainText("isn't a turn")
    await dialog(page).getByRole('button', { name: '8 forward, 8 back' }).click()
    await expect(dialog(page).getByLabel('Turning', { exact: true })).toHaveValue('8F 8B')

    await dialog(page).getByLabel('Cards', { exact: true }).fill('20')
    await expect(dialog(page).getByTestId('tablet-warp')).toContainText('80 ends')
  })

  test('starts from a preset and remembers the design', async ({ page }) => {
    await openTool(page, /Tablet weaving/)
    await dialog(page).getByRole('combobox', { name: 'Start from' }).click()
    await page.getByRole('option', { name: 'Chevrons' }).click()
    await expect(dialog(page).getByLabel('Turning', { exact: true })).toHaveValue('8F 8B 8F 8B')
    await expect(dialog(page).getByRole('button', { name: 'Card 12 threaded Z' })).toBeVisible()
    await page.reload()
    await openTool(page, /Tablet weaving/)
    await expect(dialog(page).getByLabel('Turning', { exact: true })).toHaveValue('8F 8B 8F 8B')
  })
})
