import { expect as baseExpect, type Page, test } from '@playwright/test'
import { openApp, openTool, toolbarButton } from './helpers'

// WebGL here is software-rendered: a frame can take most of a second when tests run side by side.
const expect = baseExpect.configure({ timeout: 15_000 })

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
  await expect.poll(() => colourCount(page), { timeout: 20_000 }).toBeGreaterThan(20)

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
  await expect.poll(() => colourCount(page), { timeout: 20_000 }).toBeGreaterThan(20)
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

test('sizes threads from the yarn library and spaces them by the sett', async ({ page }) => {
  await toolbarButton(page, '3D').click()
  await expect(page.getByTestId('look-info')).toHaveText(
    '8 ends and 8 picks per cm (from the warp calculator). Add a grist to yarns in the yarn library to size threads, and a texture to shape them.',
  )
  await page.getByRole('button', { name: 'Close 3D preview' }).click()

  await openTool(page, /Yarn library/)
  const yarns = page.getByRole('dialog', { name: 'Yarn library' })
  await yarns.getByRole('button', { name: 'Add a yarn for #8b0a0a' }).click()
  await yarns.getByLabel('Grist').fill('1500')
  await yarns.getByRole('button', { name: 'Done' }).click()
  await openTool(page, /Warp calculator/)
  const calc = page.getByRole('dialog', { name: 'Warp calculator' })
  await calc.getByLabel(/^Sett/).fill('6')
  await calc.getByRole('button', { name: 'Close' }).click()

  await toolbarButton(page, '3D').click()
  await expect(page.getByTestId('look-info')).toHaveText(
    '6 ends and 8 picks per cm (from the warp calculator). Thread sizes and textures from your yarn library.',
  )
  await expect.poll(() => colourCount(page), { timeout: 20_000 }).toBeGreaterThan(20)
  await page.getByLabel('Yarns and sett').uncheck()
  await expect(page.getByTestId('look-info')).toHaveCount(0)
})

test('yarn textures from the library shape the threads', async ({ page }) => {
  await openTool(page, /Yarn library/)
  const yarns = page.getByRole('dialog', { name: 'Yarn library' })
  await yarns.getByRole('button', { name: 'Add a yarn for #ffffff' }).click()
  await yarns.getByRole('combobox', { name: 'Texture' }).click()
  await page.getByRole('option', { name: 'Bouclé' }).click()
  await yarns.getByRole('button', { name: 'Done' }).click()

  // Remembered with the yarn.
  await page.reload()
  await openTool(page, /Yarn library/)
  await expect(page.getByRole('combobox', { name: 'Texture' })).toHaveText('Bouclé')
  await page.getByRole('dialog', { name: 'Yarn library' }).getByRole('button', { name: 'Done' }).click()

  await toolbarButton(page, '3D').click()
  await expect(page.getByTestId('look-info')).toContainText('Thread sizes and textures from your yarn library.')
  await expect.poll(() => colourCount(page), { timeout: 20_000 }).toBeGreaterThan(20)
})

test('shapes the cloth and animates the weaving', async ({ page }) => {
  await toolbarButton(page, '3D').click()
  await expect(view(page)).toHaveAttribute('data-woven', '32')
  await page.getByRole('combobox', { name: 'Show as' }).click()
  await page.getByRole('option', { name: 'Cushion' }).click()
  await expect(view(page)).toHaveAttribute('data-shape', 'cushion')
  await expect.poll(() => colourCount(page), { timeout: 20_000 }).toBeGreaterThan(20)

  await page.getByRole('button', { name: 'Weave it' }).click()
  await expect(page.getByRole('button', { name: 'Stop' })).toBeVisible()
  // Picks appear one by one.
  await expect.poll(async () => Number(await view(page).getAttribute('data-woven'))).toBeGreaterThan(2)
  await expect.poll(async () => Number(await view(page).getAttribute('data-woven'))).toBeLessThan(32)
  await page.getByRole('button', { name: 'Stop' }).click()
  await expect(view(page)).toHaveAttribute('data-woven', '32')
  await expect(page.getByRole('button', { name: 'Weave it' })).toBeVisible()
})

test('shows the cloth made up as a sofa, a rug and a tapestry', async ({ page }) => {
  await toolbarButton(page, '3D').click()
  for (const [label, value] of [
    ['On a sofa', 'sofa'],
    ['As a rug', 'rug'],
    ['As a tapestry', 'tapestry'],
  ]) {
    await page.getByRole('combobox', { name: 'Show as' }).click()
    await page.getByRole('option', { name: label }).click()
    await expect(view(page)).toHaveAttribute('data-shape', value)
    await expect.poll(() => colourCount(page), { timeout: 20_000 }).toBeGreaterThan(20)
  }
  // Thread controls give way to the pattern size; weaving and turning over don't apply.
  await expect(page.getByRole('slider', { name: /Threads shown/ })).toHaveCount(0)
  await expect(page.getByText('Pattern size: real size')).toBeVisible()
  const size = page.getByRole('slider', { name: /Pattern size/ })
  await size.focus()
  await size.press('End')
  await expect(page.getByText('Pattern size: 10× real size')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Weave it' })).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Show back' })).toBeDisabled()
  await page.getByRole('button', { name: 'Reset view' }).click()

  await page.getByRole('combobox', { name: 'Show as' }).click()
  await page.getByRole('option', { name: 'Flat' }).click()
  await expect(page.getByRole('slider', { name: /Threads shown/ })).toBeVisible()
})
