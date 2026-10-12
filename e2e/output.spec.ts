import { readFileSync } from 'node:fs'
import { createCanvas, loadImage } from '@napi-rs/canvas'
import { expect, test } from '@playwright/test'
import jsQR from 'jsqr'
import { importFile, openApp, toolbarButton } from './helpers'

test.beforeEach(async ({ page }) => {
  await openApp(page)
  await importFile(page)
})

test('prints written instructions only when asked', async ({ page }) => {
  // Stub the browser print dialog: record calls instead of opening it.
  await page.evaluate(() => {
    ;(window as unknown as { printed: number }).printed = 0
    window.print = () => {
      ;(window as unknown as { printed: number }).printed++
    }
  })
  const instructions = page.getByRole('region', { name: 'Written instructions' })
  // Choose in the Print dialog, then look at the page as the printer would see it.
  const printWith = async (written: boolean) => {
    await page.emulateMedia({ media: 'screen' })
    await toolbarButton(page, 'Print').click()
    const dialog = page.getByRole('dialog', { name: 'Print' })
    await dialog.getByRole('checkbox', { name: /Written instructions/ }).setChecked(written)
    await dialog.getByRole('button', { name: 'Print' }).click()
    await page.emulateMedia({ media: 'print' })
  }

  await printWith(false)
  await expect(page.locator('.print-draft')).toBeVisible()
  await expect(page.locator('.print-sheet h1')).toHaveText('Green blocks')
  await expect(page.locator('.print-made')).toHaveText('Made with Weave Patterner · weave-patterner.com')
  await expect(page.getByRole('img', { name: 'The woven cloth of Green blocks' })).toBeVisible()
  await expect(instructions).toHaveCount(0)

  await printWith(true)
  await expect(instructions).toBeVisible()
  await expect(instructions).toContainText('Ends 1–16: 3 3 1 4 2 2 4 1 3 3 1 4 2 2 4 1')
  await expect(instructions).toContainText('Treadle 1: shafts 3, 4')
  await expect(instructions).toContainText('Picks 1–16:')
  expect(await page.evaluate(() => (window as unknown as { printed: number }).printed)).toBe(2)
})

test('the cloth picture is already drawn when the browser prints', async ({ page }) => {
  // The browser takes its picture of the page as print() is called: look at the cloth right then.
  await page.evaluate(() => {
    const w = window as unknown as { drawn: boolean | null }
    w.drawn = null
    window.print = () => {
      const canvas = document.querySelector<HTMLCanvasElement>('.print-cloth')
      const px = canvas?.getContext('2d')?.getImageData(0, 0, canvas.width, canvas.height).data
      // Drawn: no pixel left transparent.
      w.drawn = !!px && px.every((v, i) => i % 4 !== 3 || v === 255)
    }
  })
  await toolbarButton(page, 'Print').click()
  await page.getByRole('dialog', { name: 'Print' }).getByRole('button', { name: 'Print' }).click()
  await expect.poll(() => page.evaluate(() => (window as unknown as { drawn: boolean | null }).drawn)).toBe(true)
  // And the same through the browser's own Print (Ctrl+P), which draws the sheet as it starts.
  await page.evaluate(() => window.dispatchEvent(new Event('afterprint')))
  await page.evaluate(() => {
    window.dispatchEvent(new Event('beforeprint'))
    window.print()
  })
  expect(await page.evaluate(() => (window as unknown as { drawn: boolean | null }).drawn)).toBe(true)
})

test('the printed QR code opens the pattern in the app when scanned', async ({ page, browser }) => {
  await page.evaluate(() => {
    window.print = () => {}
  })
  await toolbarButton(page, 'Print').click()
  const dialog = page.getByRole('dialog', { name: 'Print' })
  await expect(dialog.getByRole('checkbox', { name: /QR code/ })).toBeChecked()
  await dialog.getByRole('button', { name: 'Print' }).click()
  await page.emulateMedia({ media: 'print' })
  const code = page.getByRole('img', { name: 'QR code that opens Green blocks in Weave Patterner' })
  await expect(code).toBeVisible()
  await expect(page.getByText('Scan with your phone’s camera to open this pattern in Weave Patterner')).toBeVisible()

  // Scan it as a phone would: a picture of the printed code, decoded.
  const link = await scanQr(await code.screenshot())
  expect(link).toMatch(/^https:\/\/weave-patterner\.com\/\?pattern=/)

  // Opening the link (here, on this copy of the site) imports the pattern in a fresh browser.
  const phone = await browser.newContext()
  const opened = await phone.newPage()
  await opened.addInitScript(() => localStorage.setItem('weave-analytics-consent', 'denied'))
  await opened.goto(`./${new URL(link ?? '').search}`)
  await expect(opened.getByText('Green blocks').first()).toBeVisible()
  await expect(opened.getByTestId('draft-summary')).toContainText('4 shafts')
  await phone.close()
})

test('exports the draft as SVG and PNG images', async ({ page }) => {
  for (const [label, ext] of [
    ['Image (SVG)', 'svg'],
    ['Image (PNG)', 'png'],
  ]) {
    await toolbarButton(page, 'Export').click()
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('menuitem', { name: label }).click(),
    ])
    expect(download.suggestedFilename()).toBe(`Green blocks.${ext}`)
    const path = test.info().outputPath(download.suggestedFilename())
    await download.saveAs(path)
    const bytes = readFileSync(path)
    if (ext === 'svg') {
      const text = bytes.toString('utf8')
      expect(text).toContain('<svg')
      expect(text).toContain('xmlns="http://www.w3.org/2000/svg"')
      expect(text).toContain('fill="#006600"') // the green warp
    } else {
      expect(bytes.subarray(1, 4).toString()).toBe('PNG')
      expect(bytes.readUInt32BE(16)).toBeGreaterThan(500) // width in pixels
    }
  }
})

test('exports bitmaps: black and white for jacquard looms, and in the thread colours', async ({ page }) => {
  const ends = Number(await page.getByLabel('Ends', { exact: true }).inputValue())
  const picks = Number(await page.getByLabel('Picks', { exact: true }).inputValue())
  for (const [label, file, bits] of [
    [/^Bitmap \(BMP\), black and white/, 'Green blocks.bmp', 1],
    [/^Bitmap \(BMP\), colours/, 'Green blocks (colours).bmp', 1],
  ] as const) {
    await toolbarButton(page, 'Export').click()
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('menuitem', { name: label }).click(),
    ])
    expect(download.suggestedFilename()).toBe(file)
    const bytes = readFileSync((await download.path()) ?? '')
    expect(bytes.subarray(0, 2).toString()).toBe('BM')
    expect(bytes.readUInt32LE(2)).toBe(bytes.length)
    // One pixel per crossing.
    expect([bytes.readInt32LE(18), bytes.readInt32LE(22), bytes.readUInt16LE(28)]).toEqual([ends, picks, bits])
    // Black and white, or the pattern's two thread colours (the green warp first).
    expect(bytes.subarray(54, 62)).toEqual(
      Buffer.from(
        file.includes('colours') ? [0, 0x66, 0, 0, ...bytes.subarray(58, 62)] : [255, 255, 255, 0, 0, 0, 0, 0],
      ),
    )
  }
})

/** The text in a QR code, read from a PNG screenshot of it. */
async function scanQr(png: Buffer): Promise<string | null> {
  const image = await loadImage(png)
  const canvas = createCanvas(image.width, image.height)
  const ctx = canvas.getContext('2d')
  ctx.drawImage(image, 0, 0)
  const { data, width, height } = ctx.getImageData(0, 0, image.width, image.height)
  return jsQR(new Uint8ClampedArray(data), width, height)?.data ?? null
}
