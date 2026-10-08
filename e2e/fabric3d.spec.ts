import { expect, type Page, test } from '@playwright/test'
import { openApp, openTool, toolbarButton } from './helpers'

const view = (page: Page) => page.getByTestId('fabric-3d')
const canvas = (page: Page) => page.getByRole('img', { name: '3D preview of the cloth' })

/** Distinct colours in a coarse sample of the rendered picture: a blank or single-colour canvas has very few. */
const colourCount = (page: Page) =>
  canvas(page).evaluate((c: HTMLCanvasElement) => {
    const copy = document.createElement('canvas')
    copy.width = 64
    copy.height = 64
    const ctx = copy.getContext('2d') as CanvasRenderingContext2D
    ctx.drawImage(c, 0, 0, 64, 64)
    const data = ctx.getImageData(0, 0, 64, 64).data
    const seen = new Set<string>()
    for (let i = 0; i < data.length; i += 4) seen.add(`${data[i] >> 4},${data[i + 1] >> 4},${data[i + 2] >> 4}`)
    return seen.size
  })

test.beforeEach(async ({ page }) => openApp(page))

test('renders the cloth in 3D, with controls for the area, thickness and side', async ({ page }) => {
  await toolbarButton(page, '3D').click()
  await expect(page.getByRole('dialog', { name: /3D preview/ })).toBeVisible()
  await expect(canvas(page)).toBeVisible()
  await expect(view(page)).toHaveAttribute('data-threads', '64') // 32 ends + 32 picks
  await expect.poll(() => colourCount(page)).toBeGreaterThan(20)

  const area = page.getByRole('slider', { name: /Threads shown/ })
  await area.focus()
  await area.press('Home')
  await expect(view(page)).toHaveAttribute('data-ends', '4')
  await expect(page.getByText('Threads shown: 4 ends × 4 picks')).toBeVisible()

  await page.getByRole('button', { name: 'Show back' }).click()
  await expect(view(page)).toHaveAttribute('data-side', 'back')
  await expect(page.getByRole('button', { name: 'Show face' })).toBeVisible()

  const thickness = page.getByRole('slider', { name: /Thread thickness/ })
  await thickness.focus()
  await thickness.press('End')
  await expect(page.getByText('Thread thickness: 100%')).toBeVisible()

  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Save image' }).click()
  expect((await download).suggestedFilename()).toBe('pattern-3d.png')

  await page.getByRole('button', { name: 'Close 3D preview' }).click()
  await expect(page.getByRole('dialog', { name: /3D preview/ })).toBeHidden()
})

test('shows double cloth as two layers', async ({ page }) => {
  await openTool(page, /Double cloth/)
  await page.getByRole('dialog', { name: 'Double cloth' }).getByRole('button', { name: 'Create draft' }).click()
  await toolbarButton(page, '3D').click()
  await expect(page.getByText(/Double cloth: the lower layer is drawn behind the upper/)).toBeVisible()
  await expect.poll(() => colourCount(page)).toBeGreaterThan(20)
})

test('explains when WebGL is not available', async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, ...rest: unknown[]) {
      return type.startsWith('webgl') ? null : original.call(this, type as '2d', ...(rest as []))
    } as typeof original
  })
  await page.reload()
  await toolbarButton(page, '3D').click()
  await expect(page.getByRole('alert')).toHaveText(/needs WebGL/)
  await expect(page.getByRole('button', { name: 'Save image' })).toBeDisabled()
})
