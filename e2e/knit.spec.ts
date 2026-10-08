import { readFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'
import { knitSquare, openApp, openKnit, toolbarButton, writtenRow } from './helpers'

test.beforeEach(async ({ page }) => openKnit(page))

const newChart = async (page: import('@playwright/test').Page) => {
  await page.getByRole('button', { name: 'New' }).click()
  await expect(page.getByLabel('Stitches', { exact: true })).toHaveValue('24')
}

test('has its own name, logo, page title and a link back to Weave Patterner', async ({ page }) => {
  await expect(page).toHaveTitle(/Knit Patterner/)
  await expect(page.getByRole('link', { name: 'Knit Patterner' })).toBeVisible()
  await expect(page.getByRole('banner').getByRole('link', { name: 'Weave Patterner' })).toHaveAttribute('href', '../')
  await page.getByRole('banner').getByRole('link', { name: 'Weave Patterner' }).click()
  await expect(page.getByRole('group', { name: 'Threading' })).toBeVisible()
})

test('Weave Patterner links to Knit Patterner from the Tools menu', async ({ page }) => {
  await openApp(page)
  await toolbarButton(page, 'Tools').click()
  await page.getByRole('menuitem', { name: /Knit Patterner/ }).click()
  await expect(page.getByRole('grid', { name: 'Knitting chart' })).toBeVisible()
})

test('painting stitches writes the pattern: right-side rows from the right, wrong-side rows from the left', async ({
  page,
}) => {
  await newChart(page)
  expect(await writtenRow(page, 1)).toBe('k24.')
  await page.getByRole('button', { name: 'Purl', exact: true }).click()
  await knitSquare(page, 1, 1).click()
  expect(await writtenRow(page, 1)).toBe('p1, k23.')

  // Drag along row 2 over its four leftmost squares (stitches 24 to 21): read from the left on the wrong side, and
  // purl squares are knitted there.
  const from = await knitSquare(page, 2, 24).boundingBox()
  const to = await knitSquare(page, 2, 21).boundingBox()
  if (!from || !to) throw new Error('chart not visible')
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2)
  await page.mouse.down()
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 8 })
  await page.mouse.up()
  expect(await writtenRow(page, 2)).toBe('k4, p20.')
  await expect(page.getByTestId('knit-written')).toContainText('Row 2 (WS)')

  // The whole drag undoes in one go.
  await page.getByRole('button', { name: 'Undo' }).click()
  expect(await writtenRow(page, 2)).toBe('p24.')
  await page.getByRole('button', { name: 'Redo' }).click()
  expect(await writtenRow(page, 2)).toBe('k4, p20.')
})

test('cables, decreases and yarn overs, with stitch counts checked', async ({ page }) => {
  await newChart(page)
  await page.getByRole('button', { name: '2/2 right cross' }).click()
  // A cable fills its squares to the right of the one clicked: stitches 4 to 1, worked first.
  await knitSquare(page, 1, 4).click()
  expect(await writtenRow(page, 1)).toBe('2/2 RC, k20.')
  await expect(page.locator('.knit-cable')).toHaveCount(1)

  // A yarn over in place of a knit works one stitch fewer off the needle than the row below left.
  await page.getByRole('button', { name: 'Yarn over', exact: true }).click()
  await knitSquare(page, 3, 10).click()
  await expect(page.getByTestId('knit-problems')).toContainText('Row 3 works 23 stitches, but row 2 left 24.')
  // A decrease beside it balances the count.
  await page.getByRole('button', { name: 'Knit 2 together' }).click()
  await knitSquare(page, 3, 11).click()
  await expect(page.getByTestId('knit-problems')).toHaveCount(0)
  expect(await writtenRow(page, 3)).toBe('k9, yo, k2tog, k13.')
})

test('repeats are written with asterisks, and in the round every round reads from the right', async ({ page }) => {
  await page.getByRole('button', { name: 'Samples' }).click()
  await page.getByRole('menuitem', { name: /2×2 rib/ }).click()
  expect(await writtenRow(page, 1)).toBe('*k2, p2; rep from * to end.')
  await page.getByRole('button', { name: 'In the round' }).click()
  await expect(page.getByTestId('knit-written')).toContainText('Round 2:')
  expect(await writtenRow(page, 2)).toBe('*k2, p2; rep from * to end.')
})

test('colourwork names the colours and flags long floats', async ({ page }) => {
  await page.getByRole('button', { name: 'Samples' }).click()
  await page.getByRole('menuitem', { name: /Fair Isle/ }).click()
  await expect(page.getByTestId('knit-problems')).toHaveCount(0)
  expect(await writtenRow(page, 4)).toMatch(/^\*k1 A, k1 B, k5 A, k1 B; rep from \* to end\.$/)
  const limit = page.getByLabel('Longest float')
  await limit.fill('3')
  await expect(page.getByTestId('knit-problems')).toContainText('floats behind 5 stitches')
  await expect(page.getByRole('img', { name: 'Knitted fabric preview' })).toBeVisible()
})

test('the knitted preview is large, with the repeats switch below it', async ({ page }) => {
  const preview = await page.getByRole('img', { name: 'Knitted fabric preview' }).boundingBox()
  const toggle = await page.getByLabel('Show repeats').boundingBox()
  expect(preview?.width).toBeGreaterThan(500)
  expect(toggle?.y).toBeGreaterThan((preview?.y ?? 0) + (preview?.height ?? 0) + 4)
})

test('works out the cast-on for a finished width', async ({ page }) => {
  await page.getByRole('button', { name: 'Samples' }).click()
  await page.getByRole('menuitem', { name: /2×2 rib/ }).click()
  await page.getByLabel('Finished width (cm)').fill('20')
  // 20 cm at 22 sts per 10 cm is 44 sts: 4 repeats of 12 is the nearest, 48.
  await expect(page.getByTestId('knit-cast-on')).toContainText('Cast on 48 stitches (4 repeats of 12)')
  // With 8 edge stitches, 36 are left for the pattern: 3 repeats.
  await page.getByLabel('Edge stitches').fill('8')
  await expect(page.getByTestId('knit-cast-on')).toContainText('Cast on 44 stitches (3 repeats of 12 + 8)')
})

test('remembers the chart, and saves, opens and exports it', async ({ page }) => {
  await newChart(page)
  await page.getByLabel('Name').fill('My swatch')
  await page.getByRole('button', { name: 'Purl', exact: true }).click()
  await knitSquare(page, 1, 2).click()
  await page.waitForTimeout(400)
  await page.reload()
  await expect(page.getByLabel('Name')).toHaveValue('My swatch')
  expect(await writtenRow(page, 1)).toBe('k1, p1, k22.')

  await page.getByRole('button', { name: 'Export' }).click()
  const text = page.waitForEvent('download')
  await page.getByRole('menuitem', { name: 'Written pattern (text)' }).click()
  const textFile = await text
  expect(textFile.suggestedFilename()).toBe('My swatch.txt')
  const pattern = readFileSync((await textFile.path()) ?? '', 'utf8')
  expect(pattern).toContain('Cast on 24 stitches.')
  expect(pattern).toContain('Row 1 (RS): k1, p1, k22.')

  await page.getByRole('button', { name: 'Export' }).click()
  const file = page.waitForEvent('download')
  await page.getByRole('menuitem', { name: /Chart file/ }).click()
  const saved = readFileSync((await (await file).path()) ?? '', 'utf8')

  await page.getByRole('button', { name: 'Export' }).click()
  const png = page.waitForEvent('download')
  await page.getByRole('menuitem', { name: 'Chart image (PNG)' }).click()
  expect((await png).suggestedFilename()).toBe('My swatch.png')

  await newChart(page)
  expect(await writtenRow(page, 1)).toBe('k24.')
  await page.getByLabel('Chart file to open').setInputFiles({
    name: 'My swatch.knit.json',
    mimeType: 'application/json',
    buffer: Buffer.from(saved),
  })
  expect(await writtenRow(page, 1)).toBe('k1, p1, k22.')
  await expect(page.getByLabel('Name')).toHaveValue('My swatch')
})

test('mirrors the chart, and paints with the keyboard', async ({ page }) => {
  await newChart(page)
  await page.getByRole('button', { name: 'Knit 2 together' }).click()
  await knitSquare(page, 1, 1).click()
  await page.getByRole('button', { name: 'Mirror' }).click()
  // The decrease works 2 stitches as one square, so 25 are cast on; mirrored it leans the other way, at the other end.
  expect(await writtenRow(page, 1)).toBe('k23, ssk. (24 sts)')
  // The cursor starts at row 1, stitch 1; up then Space paints row 2, stitch 1.
  await page.getByRole('button', { name: 'Purl', exact: true }).click()
  await page.getByRole('grid', { name: 'Knitting chart' }).focus()
  await page.keyboard.press('ArrowUp')
  await page.keyboard.press(' ')
  expect(await writtenRow(page, 2)).toBe('p23, k1.')
})

test('saves charts by name and loads them again, apart from the weaving patterns', async ({ page }) => {
  await page.getByRole('button', { name: 'Samples' }).click()
  await page.getByRole('menuitem', { name: /Seed stitch/ }).click()
  const seedRow = await writtenRow(page, 1)
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  const save = page.getByRole('dialog', { name: 'Save pattern' })
  await save.getByLabel('Name').fill('My seed')
  await save.getByRole('button', { name: 'Save' }).click()
  await expect(page.locator('.MuiSnackbarContent-message')).toHaveText('Saved "My seed"')

  await page.getByRole('button', { name: 'Samples' }).click()
  await page.getByRole('menuitem', { name: /2×2 rib/ }).click()
  expect(await writtenRow(page, 1)).not.toBe(seedRow)

  await page.getByRole('button', { name: 'Load', exact: true }).click()
  const load = page.getByRole('dialog', { name: /Load pattern/ })
  await expect(load).toContainText('1 of 200 saved')
  await load.getByRole('button', { name: /My seed/ }).click()
  await expect(page.locator('.MuiSnackbarContent-message')).toHaveText('Loaded "My seed"')
  expect(await writtenRow(page, 1)).toBe(seedRow)
  await expect(page.getByLabel('Name', { exact: true })).toHaveValue('My seed')

  // Weave Patterner keeps its own list.
  await page.goto('./')
  await page.getByRole('button', { name: 'Load' }).click()
  await expect(page.getByRole('dialog', { name: /Load pattern/ })).not.toContainText('My seed')
})

test('knitting mode follows the chart a row at a time, and remembers where you got to', async ({ page }) => {
  await page.getByRole('button', { name: 'Samples' }).click()
  await page.getByRole('menuitem', { name: /2×2 rib/ }).click()
  await page.getByRole('button', { name: 'Start knitting' }).click()
  const mode = page.getByRole('dialog', { name: /Knitting: 2×2 rib/ })
  await expect(mode.getByTestId('knitting-row')).toContainText('Row 1 · right side · read the chart right to left')
  await expect(mode.getByTestId('knitting-instruction')).toHaveText(await writtenRow(page, 1))
  await mode.getByRole('button', { name: 'Row done' }).click()
  await expect(mode.getByTestId('knitting-row')).toContainText('Row 2 · wrong side · read the chart left to right')
  // Past the last row (the rib is 2 rows) it starts the chart again, counting the repeats.
  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('ArrowRight')
  await expect(mode.getByTestId('knitting-count')).toContainText('Repeat 3 of the chart · 4 rows knitted')
  await mode.getByRole('button', { name: 'Close knitting mode' }).click()
  await page.reload()
  await page.getByRole('button', { name: 'Start knitting' }).click()
  await expect(page.getByTestId('knitting-count')).toContainText('Repeat 3 of the chart · 4 rows knitted')
  await page.getByRole('button', { name: 'Start again' }).click()
  await expect(page.getByTestId('knitting-row')).toContainText('Row 1 ·')
})

test('select squares to copy, paste, flip and make the pattern repeat', async ({ page }) => {
  await newChart(page)
  await page.getByRole('button', { name: 'Purl', exact: true }).click()
  await knitSquare(page, 1, 1).click()
  await page.getByRole('button', { name: 'Yarn over', exact: true }).click()
  await knitSquare(page, 1, 2).click()
  // Select stitches 1–2 of row 1 by dragging, then copy and paste them at stitches 3–4.
  await page.getByRole('button', { name: 'Select' }).click()
  await knitSquare(page, 1, 2).hover()
  await page.mouse.down()
  await knitSquare(page, 1, 1).hover()
  await page.mouse.up()
  await expect(page.getByTestId('selection-size')).toHaveText('2 stitches × 1 row')
  await page.keyboard.press('Control+c')
  await knitSquare(page, 1, 4).click()
  await page.keyboard.press('Control+v')
  expect(await writtenRow(page, 1)).toMatch(/^\*p1, yo; rep from \* to last 20 sts, k20\./)
  // Flip the two pasted squares across.
  await knitSquare(page, 1, 4).hover()
  await page.mouse.down()
  await knitSquare(page, 1, 3).hover()
  await page.mouse.up()
  await page.getByRole('button', { name: 'Flip across' }).click()
  expect(await writtenRow(page, 1)).toMatch(/^p1, yo twice, p1, k20\./)
  // Make stitches 1–4 the repeat: outlined in red, and written as one.
  await knitSquare(page, 1, 4).hover()
  await page.mouse.down()
  await knitSquare(page, 1, 1).hover()
  await page.mouse.up()
  await page.getByRole('button', { name: 'Make the repeat' }).click()
  await expect(page.locator('.knit-repeat')).toHaveCount(24)
  expect(await writtenRow(page, 1)).toMatch(/^\*p1, yo twice, p1; rep from \* to last 20 sts, k20\./)
  await expect(page.getByTestId('knit-cast-on-text')).toContainText('Cast on a multiple of 2 stitches plus 20')
  await page.keyboard.press('Escape')
  await expect(page.getByTestId('selection-size')).toHaveCount(0)
})

test('estimates the yarn needed in each colour', async ({ page }) => {
  await page.getByRole('button', { name: 'Samples' }).click()
  await page.getByRole('menuitem', { name: /Fair Isle/ }).click()
  const yarn = page.getByTestId('knit-yarn')
  await expect(yarn.locator('tr')).toHaveCount(2)
  const metres = async () => Number((await yarn.locator('tr[data-color="A"] td').nth(1).innerText()).replace(' m', ''))
  const before = await metres()
  expect(before).toBeGreaterThan(50)
  await yarn.getByLabel('Length (cm)').fill('120')
  await expect.poll(metres).toBeGreaterThan(before * 1.9)
  await yarn.getByLabel('Metres per ball').fill('100000')
  await expect(yarn.locator('tr[data-color="A"]')).toContainText('1 ball')
})

test('make a panel, name it, and save it to put into another chart', async ({ page }) => {
  await page.getByRole('button', { name: 'Samples' }).click()
  await page.getByRole('menuitem', { name: /Cable panel/ }).click()
  // The cable sits in stitches 3–6.
  await page.getByRole('button', { name: 'Select' }).click()
  await knitSquare(page, 1, 6).hover()
  await page.mouse.down()
  await knitSquare(page, 1, 3).hover()
  await page.mouse.up()
  await page.getByRole('button', { name: 'Make a panel' }).click()
  expect(await writtenRow(page, 1)).toMatch(/work Panel A/)
  await page.locator('.knit-panel[data-panel="A"]').click()
  const dialog = page.getByRole('dialog', { name: 'Panels' })
  await dialog.getByLabel('Name of panel A').fill('Cable')
  await dialog.getByRole('button', { name: 'Save to store' }).click()
  await expect(dialog.getByTestId('panel-store')).toContainText('Cable')
  await dialog.getByRole('button', { name: 'Done' }).click()
  await expect(page.getByTestId('knit-panel-written').first()).toContainText('Panel A (Cable), stitches 3–6')

  // A new chart, with the saved cable put in at the right edge.
  await newChart(page)
  await page.getByRole('button', { name: 'Panels…' }).click()
  await dialog.getByRole('button', { name: 'Put in Cable' }).click()
  await dialog.getByRole('button', { name: 'Done' }).click()
  await expect(page.getByLabel('Stitches', { exact: true })).toHaveValue('28')
  expect(await writtenRow(page, 1)).toMatch(/^work Panel A, k24/)
})

test('turns a two-colour design into mosaic knitting', async ({ page }) => {
  await page.getByRole('button', { name: 'Samples' }).click()
  await page.getByRole('menuitem', { name: /Fair Isle/ }).click()
  const rows = Number(await page.getByLabel('Rows', { exact: true }).inputValue())
  await page.getByRole('button', { name: 'Make a mosaic…' }).click()
  const dialog = page.getByRole('dialog', { name: 'Make a mosaic' })
  await expect(dialog.getByTestId('mosaic-result')).toContainText(`${rows} design rows make ${rows * 2} mosaic rows`)
  await dialog.getByRole('button', { name: 'Make the mosaic' }).click()
  await expect(page.getByLabel('Rows', { exact: true })).toHaveValue(String(rows * 2))
  // Each row is worked in one colour, slipping the other.
  expect(await writtenRow(page, 3)).toMatch(/sl\d? wyib/)
  expect(await writtenRow(page, 3)).not.toMatch(/ A/)
  await page.getByRole('button', { name: 'Undo' }).click()
  await expect(page.getByLabel('Rows', { exact: true })).toHaveValue(String(rows))
})

test('intarsia counts bobbins and twists instead of checking floats', async ({ page }) => {
  await page.getByRole('button', { name: 'Samples' }).click()
  await page.getByRole('menuitem', { name: /Fair Isle/ }).click()
  await page.getByLabel('Longest float').fill('2')
  await expect(page.getByTestId('knit-problems')).toContainText('floats behind')
  await page.getByRole('button', { name: 'Intarsia', exact: true }).click()
  await expect(page.getByTestId('knit-problems')).toHaveCount(0)
  await expect(page.getByTestId('knit-bobbins')).toContainText(/\d+ bobbins: A ×\d+, B ×\d+/)
  await expect(page.getByTestId('knit-intarsia').locator('li[data-intarsia-row="1"]')).toContainText('twist')
})

test('sizes: cast-on, rows and yarn for each, and increases or decreases spread evenly', async ({ page }) => {
  await page.getByRole('button', { name: 'Samples' }).click()
  await page.getByRole('menuitem', { name: /2×2 rib/ }).click()
  const sizes = page.getByTestId('knit-sizes')
  await sizes.getByRole('button', { name: 'Add a size' }).click()
  await sizes.getByRole('button', { name: 'Add a size' }).click()
  await expect(sizes.locator('tr[data-size]')).toHaveCount(2)
  // 45 cm at 22 sts per 10 cm is 99 sts: in 12-stitch repeats, 8 repeats is 96.
  await expect(sizes.locator('tr[data-size="XS"] [data-testid="size-cast-on"]')).toHaveText('96')
  await sizes.getByLabel('S width', { exact: true }).fill('60')
  await expect(sizes.locator('tr[data-size="S"] [data-testid="size-cast-on"]')).toHaveText('132')
  await expect(sizes.getByRole('img', { name: 'Outline of the piece in 2 sizes' })).toBeVisible()
  await sizes.getByLabel('Stitches on the needle').fill('50')
  await sizes.getByLabel('By').fill('5')
  await expect(sizes.getByTestId('spread-evenly')).toHaveText('(k8, k2tog) 5 times. (45 sts)')
  await sizes.getByRole('button', { name: 'Increase' }).click()
  await expect(sizes.getByTestId('spread-evenly')).toHaveText('(k10, m1) 5 times. (55 sts)')
})

test('shows the knitting made up in 3D as a sweater, hat, coat or skirt', { tag: '@3d' }, async ({ page }) => {
  await page.getByRole('button', { name: 'Samples' }).click()
  await page.getByRole('menuitem', { name: /Fair Isle/ }).click()
  await page.getByRole('button', { name: '3D', exact: true }).click()
  const view = page.getByTestId('knit-3d')
  await expect(page.getByRole('img', { name: '3D preview of the knitting' })).toBeVisible({ timeout: 20_000 })
  for (const [label, value] of [
    ['A hat', 'hat'],
    ['A coat', 'coat'],
    ['A skirt', 'skirt'],
    ['A sweater', 'sweater'],
  ]) {
    await page.getByRole('combobox', { name: 'Made up as' }).click()
    await page.getByRole('option', { name: label }).click()
    await expect(view).toHaveAttribute('data-garment', value)
  }
  const size = page.getByRole('slider', { name: /Pattern size/ })
  await size.focus()
  await size.press('End')
  await expect(page.getByText('Pattern size: 6× real size')).toBeVisible()
  await page.getByRole('button', { name: 'Close 3D preview' }).click()
  await expect(view).toHaveCount(0)
})

test('imports a written pattern as a chart', async ({ page }) => {
  await page.getByRole('button', { name: 'Import' }).click()
  await page.getByRole('menuitem', { name: /Written pattern/ }).click()
  const dialog = page.getByRole('dialog', { name: 'Import a written pattern' })
  await dialog
    .getByLabel('Written pattern')
    .fill('Cast on 12 stitches.\nRow 1 (RS): k1, *yo, k2tog; rep from * to last st, k1.\nRow 2 (WS): purl.')
  await expect(dialog.getByTestId('import-result')).toHaveText('2 rows, 12 stitches wide.')
  await dialog.getByRole('button', { name: 'Make the chart' }).click()
  await expect(page.getByLabel('Stitches', { exact: true })).toHaveValue('12')
  expect(await writtenRow(page, 1)).toMatch(/^k1, \*yo, k2tog; rep from \* to last st, k1\./)
  expect(await writtenRow(page, 2)).toMatch(/^p12\./)
})
