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
  await expect(page.getByRole('link', { name: 'Weave Patterner' })).toHaveAttribute('href', '../')
  await page.getByRole('link', { name: 'Weave Patterner' }).click()
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
  await page.getByRole('button', { name: 'Yarn over' }).click()
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
