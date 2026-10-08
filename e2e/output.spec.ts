import { readFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'
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
  // Choose from the menu on screen, then look at the page as the printer would see it.
  const printVia = async (item: string | RegExp) => {
    await page.emulateMedia({ media: 'screen' })
    await toolbarButton(page, 'Print').click()
    await page.getByRole('menuitem', { name: item, exact: typeof item === 'string' }).click()
    await page.emulateMedia({ media: 'print' })
  }

  await printVia('Print draft')
  await expect(page.locator('.print-draft')).toBeVisible()
  await expect(instructions).toHaveCount(0)

  await printVia(/Print draft and written instructions/)
  await expect(instructions).toBeVisible()
  await expect(instructions).toContainText('Ends 1–16: 3 3 1 4 2 2 4 1 3 3 1 4 2 2 4 1')
  await expect(instructions).toContainText('Treadle 1: shafts 3, 4')
  await expect(instructions).toContainText('Picks 1–16:')
  expect(await page.evaluate(() => (window as unknown as { printed: number }).printed)).toBe(2)
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
