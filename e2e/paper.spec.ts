import { readFileSync } from 'node:fs'
import { createCanvas } from '@napi-rs/canvas'
import { expect, type Page, test } from '@playwright/test'
import type { SheetSpec } from '../src/paper/layout'
import type { Picture } from '../src/paper/scan'
import { filledSheet, photograph } from '../src/paper/testSheets'
import { openApp, openTool, toast } from './helpers'

const dialog = (page: Page) => page.getByRole('dialog', { name: 'Draw on paper' })

/** A picture as a PNG file. */
async function png(pic: Picture): Promise<Buffer> {
  const canvas = createCanvas(pic.width, pic.height)
  const ctx = canvas.getContext('2d')
  const img = ctx.createImageData(pic.width, pic.height)
  img.data.set(pic.data)
  ctx.putImageData(img, 0, 0)
  return canvas.encode('png')
}

test.beforeEach(async ({ page }) => openApp(page))

test('prints a sheet to draw on, with the grid size and name chosen', async ({ page }) => {
  await openTool(page, /Draw on paper/)
  await dialog(page).getByLabel('Name').fill('Paper twill')
  await dialog(page).getByLabel('Ends (across)').fill('16')
  await dialog(page).getByLabel('Picks (down)').fill('20')
  await expect(
    dialog(page).getByRole('img', { name: /^The sheet to print: 16 by 20 squares on (A4|US Letter)$/ }),
  ).toBeVisible()
  await expect(dialog(page).getByTestId('paper-size')).toContainText(/Squares of [\d.]+ mm, portrait/)
  const download = page.waitForEvent('download')
  await dialog(page).getByRole('button', { name: 'Download PDF' }).click()
  const file = await download
  expect(file.suggestedFilename()).toBe('Paper twill (to draw on).pdf')
  expect(
    readFileSync((await file.path()) ?? '')
      .subarray(0, 5)
      .toString(),
  ).toBe('%PDF-')
  // Too many squares for the paper: it says so.
  await dialog(page).getByLabel('Ends (across)').fill('190')
  await dialog(page).getByLabel('Picks (down)').fill('190')
  await expect(dialog(page)).toContainText('choose bigger paper or fewer squares')
  await expect(dialog(page).getByRole('button', { name: 'Download PDF' })).toBeDisabled()
})

test('reads a photo of the filled-in sheet and opens it as a new pattern', async ({ page }) => {
  const spec: SheetSpec = { kind: 'drawdown', name: 'From my notebook', ends: 16, picks: 16, paper: 'a4' }
  const twill = (r: number, c: number) => (r + c) % 4 < 2
  const sheet = filledSheet(spec, {
    cell: (r, c) => (twill(r, c) ? '#1f3a93' : null),
    warp: () => '#1f3a93',
    weft: () => '#e8b923',
  })
  const photo = photograph(
    sheet,
    [
      { x: 90, y: 70 },
      { x: 1100, y: 40 },
      { x: 1180, y: 1560 },
      { x: 50, y: 1500 },
    ],
    1250,
    1620,
  )
  await openTool(page, /Draw on paper/)
  await dialog(page).getByRole('tab', { name: '2. Read it back' }).click()
  await expect(dialog(page).getByRole('button', { name: 'Open as a new pattern' })).toBeDisabled()
  await dialog(page)
    .getByLabel('Scan or photo of the sheet')
    .setInputFiles({ name: 'photo.png', mimeType: 'image/png', buffer: await png(photo) })
  await expect(dialog(page).getByTestId('paper-summary')).toContainText(
    '16 ends × 16 picks: 128 warp and 128 weft squares, woven on 4 shafts and 4 treadles',
  )
  await dialog(page).getByRole('button', { name: 'Open as a new pattern' }).click()
  await expect(dialog(page)).toHaveCount(0)
  await expect(toast(page)).toContainText('Opened "From my notebook" from the paper: 4 shafts, 4 treadles')
  await expect(page.getByRole('banner')).toContainText('From my notebook')
  await expect(page.getByLabel('Ends', { exact: true })).toHaveValue('16')
  await expect(page.getByLabel('Shafts', { exact: true })).toHaveValue('4')
})

test('says when a picture has no sheet in it', async ({ page }) => {
  await openTool(page, /Draw on paper/)
  await dialog(page).getByRole('tab', { name: '2. Read it back' }).click()
  const blank = { data: new Uint8ClampedArray(300 * 200 * 4).fill(220), width: 300, height: 200 }
  await dialog(page)
    .getByLabel('Scan or photo of the sheet')
    .setInputFiles({ name: 'blank.png', mimeType: 'image/png', buffer: await png(blank) })
  await expect(dialog(page).getByTestId('paper-error')).toContainText('Couldn’t find the sheet’s QR code')
})
