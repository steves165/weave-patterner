import { expect, type Page, test } from '@playwright/test'
import { blankChart, paint } from '../src/knit/chart'
import { encodeChart } from '../src/knit/share'
import { cell, openApp, openKnit, toast, toolbarButton } from './helpers'

/** Pretends the browser can share (as phones do), recording what was shared. */
async function fakeShareSheet(page: Page) {
  await page.addInitScript(() => {
    const shared: unknown[] = []
    Object.assign(window, { shared })
    navigator.share = async (data?: ShareData) => {
      shared.push({
        title: data?.title,
        text: data?.text,
        url: data?.url,
        files: data?.files?.map((f) => ({ name: f.name, type: f.type, size: f.size })),
      })
    }
    navigator.canShare = () => true
  })
}
const shared = (page: Page) => page.evaluate(() => (window as unknown as { shared: unknown[] }).shared)

test('Share gives a link that opens the pattern, and links to share it on other sites', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await openApp(page)
  await cell(page, 'End 1, shaft 3').click()
  await toolbarButton(page, 'Share').click()
  const dialog = page.getByRole('dialog', { name: /^Share/ })
  const field = dialog.getByLabel('Anyone with this link can open the design')
  await expect(field).toHaveValue(/^https:\/\/steves165\.github\.io\/weave-patterner\/\?pattern=[\w-]+$/)
  const link = await field.inputValue()

  await dialog.getByRole('button', { name: 'Copy the link' }).click()
  await expect(toast(page)).toContainText('Link copied')
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(link)

  const pinterest = new URL((await dialog.getByRole('link', { name: 'Pinterest' }).getAttribute('href')) ?? '')
  expect(pinterest.host).toBe('www.pinterest.com')
  expect(pinterest.searchParams.get('url')).toBe(link)
  const facebook = new URL((await dialog.getByRole('link', { name: 'Facebook' }).getAttribute('href')) ?? '')
  expect(facebook.searchParams.get('u')).toBe(link)
  await expect(dialog.getByRole('link', { name: 'WhatsApp' })).toHaveAttribute('target', '_blank')
  // Without a share menu (a desktop browser), there's no Share button for it.
  await expect(dialog.getByRole('button', { name: 'Share link…' })).toHaveCount(0)

  // The link opens the same pattern, here.
  const local = new URL(link)
  await page.goto(`./${local.search}`)
  await expect(page.getByRole('group', { name: 'Threading' })).toBeVisible()
  await expect(cell(page, 'End 1, shaft 3')).toBeChecked()
})

test('Share downloads a picture for Instagram or Pinterest', async ({ page }) => {
  await openApp(page)
  await toolbarButton(page, 'Share').click()
  const dialog = page.getByRole('dialog', { name: /^Share/ })
  await expect(dialog.getByRole('img', { name: /for sharing/ })).toBeVisible()

  let download = page.waitForEvent('download')
  await dialog.getByRole('button', { name: 'Download picture' }).click()
  expect((await download).suggestedFilename()).toMatch(/\(Instagram\)\.png$/)
  const square = await dialog
    .getByRole('img', { name: /for sharing/ })
    .evaluate((img: HTMLImageElement) => [img.naturalWidth, img.naturalHeight])
  expect(square).toEqual([1080, 1080])

  await dialog.getByRole('button', { name: 'Tall (Pinterest)' }).click()
  await expect
    .poll(() => dialog.getByRole('img', { name: /for sharing/ }).evaluate((img: HTMLImageElement) => img.naturalHeight))
    .toBe(1500)
  download = page.waitForEvent('download')
  await dialog.getByRole('button', { name: 'Download picture' }).click()
  expect((await download).suggestedFilename()).toMatch(/\(Pinterest\)\.png$/)
})

test('on a phone, Share uses the share menu for the link and the picture', async ({ page }) => {
  await fakeShareSheet(page)
  await openApp(page)
  await toolbarButton(page, 'Share').click()
  const dialog = page.getByRole('dialog', { name: /^Share/ })
  await expect(dialog.getByLabel('Anyone with this link can open the design')).toHaveValue(/\?pattern=/)
  await dialog.getByRole('button', { name: 'Share link…' }).click()
  await dialog.getByRole('button', { name: 'Share picture…' }).click()
  const [linkShare, pictureShare] = (await shared(page)) as {
    url?: string
    text?: string
    files?: { name: string; type: string; size: number }[]
  }[]
  expect(linkShare.url).toMatch(/\?pattern=/)
  expect(linkShare.text).toContain('a weaving draft I made with Weave Patterner')
  expect(pictureShare.files?.[0]).toMatchObject({ type: 'image/png', name: expect.stringMatching(/Instagram/) })
  expect(pictureShare.files?.[0].size).toBeGreaterThan(10000)
})

test.describe('Knit Patterner', () => {
  test('Share gives a link that opens the chart', async ({ page }) => {
    await openKnit(page)
    await page.getByLabel('Name').fill('My moss')
    await toolbarButton(page, 'Share').click()
    const dialog = page.getByRole('dialog', { name: 'Share “My moss”' })
    const field = dialog.getByLabel('Anyone with this link can open the design')
    await expect(field).toHaveValue(/^https:\/\/steves165\.github\.io\/weave-patterner\/knit\/\?chart=[\w-]+$/)
    await expect(dialog.getByRole('img', { name: /for sharing/ })).toBeVisible()
    const link = new URL(await field.inputValue())
    await page.keyboard.press('Escape')

    await page.goto(`./knit/${link.search}`)
    await expect(page.getByLabel('Name')).toHaveValue('My moss')
    await expect(toast(page)).toContainText('Opened “My moss” from the link')
    expect(new URL(page.url()).search).toBe('')
  })

  test('opens a chart link, and says so when the link is damaged', async ({ page }) => {
    const chart = paint(blankChart(10, 6), 0, 0, { stitch: 'p' })
    await openKnit(page)
    await page.goto(`./knit/?chart=${await encodeChart('Linked chart', chart)}`)
    await expect(page.getByLabel('Name')).toHaveValue('Linked chart')
    await page.goto('./knit/?chart=broken')
    await expect(toast(page)).toContainText('The chart link is damaged or incomplete')
  })

  test('still opens older sample links with the sample in the hash', async ({ page }) => {
    await openKnit(page)
    // A fresh load: going from /knit/ to /knit/#… wouldn't reload the page.
    await page.goto('about:blank')
    await page.goto('./knit/#sample=seed-stitch')
    await expect(page.getByLabel('Name')).toHaveValue('Seed stitch')
    expect(new URL(page.url()).hash).toBe('')
  })
})
