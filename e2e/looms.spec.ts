import { expect, type Page, test } from '@playwright/test'
import { defaultDraft, exportFile } from '../src/weave'
import { drawdownPicture, openApp, openTool, setField, toast, toolbarButton } from './helpers'

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
  const before = await drawdownPicture(page)
  await openTool(page, /Transform draft/)
  await page.getByRole('dialog', { name: 'Transform draft' }).getByRole('button', { name: 'Save treadles' }).click()
  await expect(toast(page)).toContainText('Now 4 treadles; 16 picks press two at once')
  await expect(page.getByLabel('Treadles', { exact: true })).toHaveValue('4')
  expect(await drawdownPicture(page)).toBe(before)

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
    await dialog(page).getByRole('button', { name: 'Card 1, hole A' }).click()
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

test('rigid heddle: a second set of picked-up ends goes on a heddle rod', async ({ page }) => {
  // Holes on shaft 1, slot ends on shafts 2–4 in turn; a lift plan using two different sets of slot ends.
  const d = defaultDraft()
  d.threading = d.threading.map((_, e) => (e % 2 === 0 ? 0 : 1 + (Math.floor(e / 2) % 3)))
  d.tieup = [0, 1, 2, 3].map((s) => [0, 1, 2, 3].map((t) => s === t))
  const lifts = [[1], [2, 3, 4], [2], [3]]
  d.treadling = d.treadling.map((_, p) => [0, 1, 2, 3].map((t) => lifts[p % 4].includes(t + 1)))
  await importDraft(page, d)
  await openTool(page, /Rigid heddle/)
  const dialog = page.getByRole('dialog', { name: 'Rigid heddle' })
  await expect(dialog.getByTestId('rh-pickup')).toContainText('pick up slot ends 2, 8')
  await expect(dialog.getByTestId('rh-rod')).toContainText('pick up slot ends 4, 10')
  const steps = dialog.getByRole('list', { name: 'Weaving steps' })
  await expect(steps.getByRole('listitem').nth(2)).toHaveText('Pick 3: Heddle neutral, pick-up stick on edge')
  await expect(steps.getByRole('listitem').nth(3)).toHaveText('Pick 4: Heddle neutral, heddle rod lifted')
})

test('tablet weaving: cards can turn against the pack, or be flipped on one row', async ({ page }) => {
  await openTool(page, /Tablet weaving/)
  const dialog = page.getByRole('dialog', { name: 'Tablet weaving' })
  const band = () => dialog.getByRole('img', { name: 'Woven band' }).evaluate((c: HTMLCanvasElement) => c.toDataURL())
  const before = await band()
  await dialog.getByRole('button', { name: 'Card 1 turns with the pack' }).click()
  await expect(dialog.getByRole('button', { name: 'Card 1 turns opposite to the pack' })).toBeVisible()
  const opposite = await band()
  expect(opposite).not.toBe(before)

  // Click the stitch for card 2 on row 3 to flip it, then again to put it back.
  const canvas = dialog.getByRole('img', { name: 'Woven band' })
  const cell = Number(await canvas.getAttribute('data-cell'))
  const box = await canvas.boundingBox()
  const scale = (box?.width ?? 1) / (await canvas.evaluate((c: HTMLCanvasElement) => c.width))
  await canvas.click({ position: { x: (1 * cell + cell / 2) * scale, y: (2 * cell + cell / 2) * scale } })
  const flipped = await band()
  expect(flipped).not.toBe(opposite)
  await canvas.click({ position: { x: (1 * cell + cell / 2) * scale, y: (2 * cell + cell / 2) * scale } })
  expect(await band()).toBe(opposite)
  await expect(dialog).toContainText('An S-threaded card turned forward makes a Z twist, leaning /')
})

test.describe('drawloom', () => {
  const dialog = (page: Page) => page.getByRole('dialog', { name: 'Drawloom' })

  test('designs in units, with the setup, ground treadling and drawing sequence', async ({ page }) => {
    await openTool(page, /Drawloom/)
    await expect(dialog(page).getByTestId('drawloom-setup')).toContainText(
      'Pattern harness: 24 draw cords, each lifting 5 ends. Ground harness: 5 shafts',
    )
    await expect(dialog(page).getByTestId('drawloom-ground')).toContainText('1, 3, 5, 2, 4')
    const sequence = dialog(page).getByTestId('drawloom-sequence').getByRole('listitem')
    await expect(sequence.first()).toHaveText('No cords: ground only')
    await expect(sequence.nth(5)).toHaveText('Draw cords 12–13')

    // Paint a unit in the first row: now it draws that cord.
    await dialog(page).getByRole('checkbox', { name: 'Unit row 1, draw cord 3', exact: true }).click()
    await expect(sequence.first()).toHaveText('Draw cords 3')
    await dialog(page).getByLabel('Unit size (ends)').fill('10')
    await expect(dialog(page)).toContainText('The cloth (240 ends × 240 picks)')
    await dialog(page).getByRole('combobox', { name: 'Ground weave' }).click()
    await page.getByRole('option', { name: '8-end satin damask' }).click()
    await expect(dialog(page).getByTestId('drawloom-setup')).toContainText('Ground harness: 8 shafts')
  })

  test('turns the design into a shaft draft when it fits', async ({ page }) => {
    await openTool(page, /Drawloom/)
    await dialog(page).getByRole('button', { name: 'Make a shaft draft' }).click()
    await expect(toast(page)).toContainText('Drawloom design as a shaft draft')
    await expect(page.getByLabel('Ends', { exact: true })).toHaveValue('120')
    expect(Number(await page.getByLabel('Shafts', { exact: true }).inputValue())).toBeLessThanOrEqual(128)
  })
})
