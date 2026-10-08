import { expect, type Page, test } from '@playwright/test'
import { encodePng } from '../mcp/png'
import { ends, openApp, openTool, picks, setField, toast } from './helpers'

/** A PNG picture: `colour(x, y)` gives each pixel's [r, g, b]. */
function png(width: number, height: number, colour: (x: number, y: number) => [number, number, number]) {
  const rgb = new Uint8Array(width * height * 3)
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) rgb.set(colour(x, y), (y * width + x) * 3)
  return { name: 'picture.png', mimeType: 'image/png', buffer: encodePng(width, height, rgb) }
}

/** A dark cross on white, 48 × 48. */
const cross = png(48, 48, (x, y) => ((x >= 16 && x < 32) || (y >= 16 && y < 32) ? [20, 20, 60] : [250, 250, 245]))

test.beforeEach(async ({ page }) => openApp(page))

test.describe('more block structures', () => {
  const dialog = (page: Page) => page.getByRole('dialog', { name: 'Block profile' })
  async function choose(page: Page, structure: string) {
    await dialog(page).getByRole('combobox', { name: 'Structure' }).click()
    await page.getByRole('option', { name: structure, exact: true }).click()
  }

  test('shadow weave, taqueté and rep weave', async ({ page }) => {
    await openTool(page, /Block profile/)
    const result = dialog(page).getByTestId('profile-result')
    await choose(page, 'Shadow weave')
    await expect(result).toHaveText('Makes 4 shafts, 4 treadles, 28 ends × 28 picks')
    await expect(dialog(page).getByLabel('Light')).toBeVisible()
    await choose(page, 'Taqueté')
    await expect(result).toHaveText('Makes 4 shafts, 4 treadles, 28 ends × 28 picks')
    await expect(dialog(page).getByLabel('Weft B')).toBeVisible()
    await choose(page, 'Rep weave')
    await expect(result).toHaveText('Makes 4 shafts, 2 treadles, 28 ends × 28 picks')
    await expect(dialog(page).getByLabel('Thin weft')).toBeVisible()
    await dialog(page).getByLabel('Dark warp').fill('#000000')
    await dialog(page).getByRole('button', { name: 'Create draft' }).click()
    await expect(page.getByLabel('Warp 1', { exact: true })).toHaveValue('#000000')
    await expect(page.getByLabel('Warp 2', { exact: true })).not.toHaveValue('#000000')
  })
})

test('echo weave threads a design line with its echo in two colours', async ({ page }) => {
  await openTool(page, /Echo weave/)
  const echo = page.getByRole('dialog', { name: 'Echo weave' })
  await expect(echo.getByTestId('echo-result')).toHaveText('Makes 8 shafts, 28 ends × 28 picks')
  await echo.getByLabel('Tie-up (up/down)').fill('3/1/1')
  await expect(echo.getByRole('alert')).toContainText('as many down counts')
  await echo.getByLabel('Tie-up (up/down)').fill('2/2')
  await expect(echo.getByRole('alert')).toContainText('need to add up to 8')
  await echo.getByLabel('Tie-up (up/down)').fill('3/1/1/3')
  await echo.getByLabel('Warp colour A').fill('#ff0000')
  await echo.getByRole('button', { name: 'Create draft' }).click()
  await expect(toast(page)).toContainText('Echo weave')
  await expect(echo).toBeHidden()
  await expect(page.getByLabel('Shafts', { exact: true })).toHaveValue('8')
  await expect(page.getByLabel('Warp 1', { exact: true })).toHaveValue('#ff0000')
  await expect(page.getByLabel('Warp 2', { exact: true })).toHaveValue('#1a237e')
})

test('picture to draft turns a picture into blocks', async ({ page }) => {
  await openTool(page, /Picture to draft/)
  const dialog = page.getByRole('dialog', { name: 'Picture to draft' })
  await expect(dialog.getByRole('button', { name: 'Create draft' })).toBeDisabled()
  await dialog.getByLabel('Picture file').setInputFiles(cross)
  await expect(dialog.getByRole('img', { name: 'Picture as blocks' })).toBeVisible()
  // A cross needs only two blocks: plain columns and the middle band.
  await expect(dialog).toContainText('As 2 blocks')
  await expect(dialog.getByTestId('picture-result')).toContainText('100% of the picture kept')
  await expect(dialog.getByTestId('picture-result')).toContainText('Makes 4 shafts, 6 treadles, 96 ends × 96 picks')

  await dialog.getByRole('combobox', { name: 'Structure' }).click()
  await page.getByRole('option', { name: /^Damask/ }).click()
  await expect(dialog.getByTestId('picture-result')).toContainText('Makes 10 shafts')
  await dialog.getByRole('button', { name: 'Create draft' }).click()
  await expect(toast(page)).toContainText('Draft made from your picture')
  expect(await ends(page)).toBe('120')

  await openTool(page, /Picture to draft/)
  await dialog
    .getByLabel('Picture file')
    .setInputFiles({ name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('hi') })
  await expect(dialog.getByRole('alert')).toContainText("isn't a picture")
})

test('colourways can take their colours from a photo', async ({ page }) => {
  await openTool(page, /Colourways/)
  const ways = page.getByRole('dialog', { name: 'Colourways' })
  await expect(ways.getByRole('region', { name: 'From a photo' })).toContainText('Choose a photo below')
  // Dark green and pale yellow: the red warp (darker) becomes green, the white weft yellow.
  await ways.getByLabel('Photo for colours').setInputFiles(png(20, 20, (x) => (x < 10 ? [0, 80, 0] : [250, 240, 160])))
  await ways.getByRole('button', { name: 'Use Colours from your photo' }).click()
  await expect(page.getByLabel('Warp 1', { exact: true })).toHaveValue('#005000')
  await expect(page.getByLabel('Weft 1', { exact: true })).toHaveValue('#faf0a0')
})

test('finds the smallest repeat and trims the draft to it', async ({ page }) => {
  await expect(page.getByTestId('repeat')).toHaveText('Repeat: 4 ends × 4 picks')
  await page.getByRole('button', { name: 'Trim to one repeat' }).click()
  expect([await ends(page), await picks(page)]).toEqual(['4', '4'])
  await expect(page.getByRole('button', { name: 'Trim to one repeat' })).toBeDisabled()
  // Widening it again adds unthreaded ends, which aren't part of the repeat.
  await setField(page.getByLabel('Ends', { exact: true }), '12')
  await expect(page.getByTestId('repeat')).toHaveText('Repeat: 12 ends × 4 picks')
})

test('a dialog loads when first opened and keeps what you set in it', async ({ page }) => {
  await openTool(page, /Echo weave/)
  const echo = page.getByRole('dialog', { name: 'Echo weave' })
  await echo.getByLabel('Echo shift (shafts)').fill('3')
  await echo.getByRole('button', { name: 'Cancel' }).click()
  await expect(echo).toBeHidden()
  await openTool(page, /Echo weave/)
  await expect(echo.getByLabel('Echo shift (shafts)')).toHaveValue('3')
})
