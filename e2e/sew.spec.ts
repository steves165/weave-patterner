import { readFileSync } from 'node:fs'
import { expect, type Page, test } from '@playwright/test'
import { encodeProject, newProject } from '../src/sew/project'
import { openSew, toast, toolbarButton } from './helpers'

const pattern = (page: Page) => page.getByRole('img', { name: /pattern, / })
const settings = (page: Page) => page.getByRole('complementary', { name: 'Pattern settings' })
const buy = (page: Page) => page.getByTestId('sew-buy')

test('opens with a T-shirt pattern, its sketch, layout, materials and steps', async ({ page }) => {
  await openSew(page)
  await expect(page).toHaveTitle(/Sew Patterner/)
  await expect(pattern(page)).toHaveAttribute(
    'aria-label',
    /^T-shirt pattern, UK 12: Front \(1 to cut\), Back \(1 to cut\), Sleeve \(2 to cut\), Neckband/,
  )
  await expect(page.getByRole('img', { name: 'Sketch of the t-shirt from the front' })).toBeVisible()
  await expect(buy(page)).toContainText(/Buy [\d.]+ m of 140 cm main fabric/)
  await expect(page.getByTestId('sew-steps').locator('li')).toHaveCount(7)
  await expect(page.getByRole('contentinfo')).toContainText('Measurements and pieces look right')
  await expect(page.getByRole('link', { name: 'Weave Patterner' }).first()).toBeVisible()
  await expect(page.getByRole('link', { name: 'Knit Patterner' }).first()).toBeVisible()
})

test('choosing a design and its style redrafts the pattern', async ({ page }) => {
  await openSew(page)
  await page.getByRole('button', { name: 'Shift dress', exact: true }).click()
  await expect(pattern(page)).toHaveAttribute(
    'aria-label',
    /^Shift dress pattern, UK 12: .*Front facing.*Sleeve.*Pocket bag/,
  )
  await expect(page.getByRole('banner')).toContainText('My shift dress')
  // Sleeveless: bias binding instead of sleeves, and its steps.
  await settings(page).getByLabel('Sleeves').click()
  await page.getByRole('option', { name: 'Sleeveless' }).click()
  await expect(pattern(page)).toHaveAttribute('aria-label', /Armhole binding \(bias\)/)
  await expect(pattern(page)).not.toHaveAttribute('aria-label', /Sleeve \(/)
  await expect(page.getByTestId('sew-steps')).toContainText('bias binding')
  // No pockets: no pocket bags.
  await settings(page).getByLabel('Pockets in the side seams').uncheck()
  await expect(pattern(page)).not.toHaveAttribute('aria-label', /Pocket bag/)
  await toolbarButton(page, 'Undo').click()
  await expect(pattern(page)).toHaveAttribute('aria-label', /Pocket bag/)
})

test('drafts to your measurements, and checks them', async ({ page }) => {
  await openSew(page, { at: '?design=skirt' })
  const before = await buy(page).innerText()
  await settings(page).getByRole('button', { name: 'My measurements' }).click()
  await expect(page.getByRole('banner')).toContainText('Fitted skirt · Made to measure')
  await settings(page).getByLabel('Hips (cm)').fill('130')
  await expect(pattern(page)).toBeVisible()
  await expect.poll(() => buy(page).innerText()).not.toBe(before)
  await settings(page).getByLabel('Waist (cm)').fill('150')
  await expect(page.getByTestId('sew-warning').first()).toContainText('much bigger than the hips')
})

test('saves measurements to use again', async ({ page }) => {
  await openSew(page)
  await settings(page).getByRole('button', { name: 'My measurements' }).click()
  await settings(page).getByLabel('Bust or chest (cm)').fill('101')
  await settings(page).getByRole('button', { name: 'Save measurements' }).click()
  await page.getByLabel('Whose measurements').fill('Sam')
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(toast(page)).toContainText('Saved the measurements as “Sam”')
  await settings(page).getByRole('button', { name: 'Standard size' }).click()
  await settings(page).getByRole('button', { name: 'Use saved…' }).click()
  await page.getByRole('menuitem', { name: /^Sam/ }).click()
  await expect(settings(page).getByLabel('Bust or chest (cm)')).toHaveValue('101')
})

test('nests other sizes, shows inches and yards, and leaves allowances off', async ({ page }) => {
  await openSew(page)
  await settings(page).getByRole('group', { name: 'Nested sizes' }).getByRole('button', { name: '16' }).click()
  await expect(page.getByTestId('size-key')).toContainText('UK 16')
  await expect(pattern(page).locator('polygon.sew-size')).toHaveCount(4)
  await settings(page).getByRole('button', { name: 'Inches' }).click()
  await expect(settings(page).getByLabel('Bust or chest (in)')).toHaveValue('35.875')
  await expect(buy(page)).toContainText('yd')
  await settings(page).getByLabel('Add seam allowances').uncheck()
  await expect(page.getByTestId('sew-summary')).toContainText('no seam allowances')
  await expect(pattern(page).locator('polygon.sew-sew')).toHaveCount(0)
})

test('lays the pieces out on narrower fabric and says to buy more', async ({ page }) => {
  await openSew(page, { at: '?design=trousers' })
  const metres = async () => Number((await buy(page).innerText()).match(/Buy ([\d.]+) m/)?.[1])
  const wide = await metres()
  await page.getByLabel('Fabric width').click()
  await page.getByRole('option', { name: '90 cm' }).click()
  await expect.poll(metres).toBeGreaterThan(wide)
  await expect(page.getByRole('img', { name: /^Cutting layout on 90 cm main fabric/ })).toBeVisible()
  await expect(page.getByTestId('sew-needs')).toContainText('Main fabric')
})

test('exports PDFs, SVG, DXF and a project file that opens again', async ({ page }) => {
  await openSew(page)
  const exportItem = async (name: RegExp) => {
    await toolbarButton(page, 'Export').click()
    const download = page.waitForEvent('download')
    await page.getByRole('menuitem', { name }).click()
    return download
  }
  for (const [item, file] of [
    [/^PDF for home printing \(A4\)/, /\(A4\)\.pdf$/],
    [/^PDF for a copy shop/, /\(A0\)\.pdf$/],
    [/^Projector PDF/, /\(projector\)\.pdf$/],
  ] as const) {
    const d = await exportItem(item)
    expect(d.suggestedFilename()).toMatch(file)
    const bytes = readFileSync((await d.path()) ?? '')
    expect(bytes.subarray(0, 5).toString()).toBe('%PDF-')
  }
  const svg = await exportItem(/^SVG/)
  expect(readFileSync((await svg.path()) ?? '', 'utf8')).toMatch(/<svg [^>]*width="[\d.]+cm"/)
  const dxf = await exportItem(/^DXF/)
  expect(readFileSync((await dxf.path()) ?? '', 'utf8')).toContain('POLYLINE')

  await settings(page).getByRole('button', { name: 'V-neck' }).click()
  const file = await exportItem(/Project file/)
  const path = (await file.path()) ?? ''
  await settings(page).getByRole('button', { name: 'Crew' }).click()
  await page
    .getByLabel('Project file to open')
    .setInputFiles({ name: 'mine.sew.json', mimeType: 'application/json', buffer: readFileSync(path) })
  await expect(toast(page)).toContainText('Opened mine.sew.json')
  await expect(settings(page).getByRole('button', { name: 'V-neck' })).toHaveAttribute('aria-pressed', 'true')
})

test('saves and loads projects in this browser', async ({ page }) => {
  await openSew(page, { at: '?design=apron' })
  await toolbarButton(page, 'Save').click()
  await page.getByRole('dialog').getByLabel('Name').fill('Kitchen apron')
  await page.getByRole('dialog').getByRole('button', { name: 'Save' }).click()
  await expect(toast(page)).toContainText('Saved "Kitchen apron"')
  await page.getByRole('button', { name: 'Tote bag', exact: true }).click()
  await toolbarButton(page, 'Load').click()
  await page.getByRole('dialog').getByText('Kitchen apron').click()
  await expect(pattern(page)).toHaveAttribute('aria-label', /^Apron pattern/)
})

test('opens shared links and design links', async ({ page }) => {
  const shared = await encodeProject('Linked hat', {
    ...newProject('bucket-hat'),
    options: { brim: 9, sideHeight: 8, reversible: false },
  })
  await openSew(page, { at: `?project=${shared}` })
  await expect(page.getByRole('banner')).toContainText('Linked hat')
  await expect(toast(page)).toContainText('Opened “Linked hat” from the link')
  expect(new URL(page.url()).search).toBe('')
  await page.goto('./sew/?design=circle-skirt')
  await expect(pattern(page)).toHaveAttribute('aria-label', /^Circle skirt pattern/)
  await page.goto('./sew/?project=broken')
  await expect(toast(page)).toContainText('The project link is damaged or incomplete')
})

test('Share gives a link to the project and a picture of the sketch', async ({ page }) => {
  await openSew(page)
  await toolbarButton(page, 'Share').click()
  const dialog = page.getByRole('dialog', { name: /^Share/ })
  await expect(dialog.getByLabel('Anyone with this link can open the design')).toHaveValue(/\/sew\/\?project=[\w-]+$/)
  await expect(dialog.getByRole('img', { name: /for sharing/ })).toBeVisible()
})

test('adds your own pieces: a rectangle and a drawn shape', async ({ page }) => {
  await openSew(page, { at: '?design=tote-bag' })
  const own = page.getByTestId('sew-own')
  await own.getByRole('button', { name: 'Rectangle' }).click()
  let dialog = page.getByRole('dialog')
  await dialog.getByLabel('Name').fill('Bow')
  await dialog.getByLabel('Width (cm)').fill('25')
  await dialog.getByRole('button', { name: 'Done' }).click()
  await expect(toast(page)).toContainText('Added Bow to the pattern')
  await expect(own).toContainText('Bow · 25 cm × 10 cm · cut 2')
  await expect(pattern(page)).toHaveAttribute('aria-label', /Bow \(2 to cut\)/)

  await own.getByRole('button', { name: 'Draw one' }).click()
  dialog = page.getByRole('dialog')
  await dialog.getByRole('button', { name: 'Add a point' }).click()
  await expect(dialog.getByRole('img', { name: /: 6 points$/ })).toBeVisible()
  await dialog.getByRole('button', { name: 'Remove point 6' }).click()
  await dialog.getByRole('row').nth(1).getByLabel('Across (cm)').fill('30')
  await dialog.getByRole('button', { name: 'Done' }).click()
  await expect(own).toContainText('Piece 2 · 5 points')
  await own.getByRole('button', { name: 'Remove Bow' }).click()
  await expect(pattern(page)).not.toHaveAttribute('aria-label', /Bow/)
})

test('projector mode shows the pattern full screen, with a square to set the scale', async ({ page }) => {
  await openSew(page)
  await page.getByRole('button', { name: 'Projector' }).click()
  const projector = page.getByRole('dialog', { name: 'Projector mode' })
  await expect(projector.getByRole('img', { name: 'The pattern, projected at full size' })).toBeVisible()
  await projector.getByRole('button', { name: 'Set the scale' }).click()
  const square = projector.getByTestId('calibration-square')
  const before = (await square.boundingBox())?.width ?? 0
  await projector.getByRole('slider', { name: 'Projection scale' }).press('ArrowRight')
  await expect.poll(async () => (await square.boundingBox())?.width ?? 0).toBeGreaterThan(before)
  await projector.getByRole('button', { name: 'Close projector mode' }).click()
  await expect(projector).toHaveCount(0)
})

test('help opens on F1, with how to measure', async ({ page }) => {
  await openSew(page)
  await page.keyboard.press('F1')
  const help = page.getByRole('dialog', { name: /Sew Patterner help/ })
  await help.getByLabel('Search help').fill('rise')
  await expect(help.locator('[data-topic="measuring"]')).toBeVisible()
})

test('the tour is offered to new visitors', async ({ page }) => {
  await openSew(page, { tour: 'new' })
  await page.getByRole('button', { name: 'Take the tour' }).click()
  await expect(page.getByTestId('tour')).toContainText('Welcome to Sew Patterner')
})

test('Weave and Knit Patterner link to Sew Patterner', async ({ page }) => {
  await openSew(page)
  await page.goto('./knit/')
  await expect(page.getByRole('link', { name: 'Sew Patterner' }).first()).toHaveAttribute('href', '../sew/')
})
