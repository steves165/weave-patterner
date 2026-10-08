import { readFileSync } from 'node:fs'
import { expect, type Page, test } from '@playwright/test'
import { decodePattern, encodePattern } from '../src/share'
import { importFile as parsePattern } from '../src/weave'
import { cell, ends, importFile, openApp, sampleText, setField, threading, toast, toolbarButton } from './helpers'

const title = (page: Page) => page.locator('.MuiAppBar-root')

test.beforeEach(async ({ page }) => openApp(page))

test('saves with a sequential name, loads, renames and deletes', async ({ page }) => {
  await toolbarButton(page, 'Save').click()
  const save = page.getByRole('dialog', { name: 'Save pattern' })
  await expect(save.getByLabel('Name')).toHaveValue('Pattern 1')
  await save.getByRole('button', { name: 'Save' }).click()
  await expect(title(page)).toContainText('Pattern 1')

  await cell(page, 'End 1, shaft 4').click()
  await toolbarButton(page, 'Save').click()
  await expect(save.getByLabel('Name')).toHaveValue('Pattern 1')
  await save.getByLabel('Name').fill('My twill')
  await save.getByRole('button', { name: 'Save' }).click()

  await toolbarButton(page, 'Load').click()
  const load = page.getByRole('dialog', { name: /Load pattern/ })
  await expect(load).toContainText('2 of 200 saved')
  await load.getByRole('button', { name: 'Rename' }).first().click()
  await load.getByRole('textbox', { name: 'Name' }).fill('Renamed')
  await load.getByRole('textbox', { name: 'Name' }).press('Enter')
  await expect(load.getByText('Renamed')).toBeVisible()
  await load.getByText('Pattern 1').click()
  await expect(title(page)).toContainText('Pattern 1')
  expect(await threading(page)).toMatch(/^1/)

  await toolbarButton(page, 'Load').click()
  await load.getByRole('button', { name: 'Delete' }).first().click()
  // The confirm button has text; the row icons are labelled "Delete" too.
  await load.getByRole('button', { name: 'Delete' }).filter({ hasText: 'Delete' }).click()
  await expect(load).toContainText('1 of 200 saved')
})

test('exports a pattern file and a WIF that both import back', async ({ page }) => {
  await importFile(page)
  for (const item of [/Pattern file/, /^WIF \(\.wif\)/, /WIF lift plan/]) {
    await toolbarButton(page, 'Export').click()
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('menuitem', { name: item }).click(),
    ])
    const path = test.info().outputPath(download.suggestedFilename())
    await download.saveAs(path)
    expect(download.suggestedFilename()).toMatch(/^Green blocks/)
    await page.getByRole('button', { name: 'New' }).click()
    await importFile(page, path)
    await expect(title(page)).toContainText('Green blocks')
    expect(await ends(page)).toBe('96')
  }
  // The re-imported pattern weaves the same cloth as the sample.
  const original = parsePattern(sampleText()).draft
  expect(await threading(page)).toBe(original.threading.map((s) => s + 1).join(''))
})

test('rejects a file that is not a pattern', async ({ page }) => {
  await toolbarButton(page, 'Import').click()
  await page
    .locator('input[type=file]')
    .setInputFiles({ name: 'notes.json', mimeType: 'application/json', buffer: Buffer.from('{"hello":1}') })
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText('notes.json')
})

test('opens a pattern from a share link', async ({ page }) => {
  const { draft } = parsePattern(sampleText())
  await page.goto(`/#pattern=${await encodePattern('Linked', draft)}`)
  await expect(title(page)).toContainText('Linked')
  await expect(toast(page)).toContainText('Opened "Linked" from link')
  expect(new URL(page.url()).hash).toBe('')
  expect(await ends(page)).toBe('96')
  // sanity-check the helper the MCP server uses
  expect((await decodePattern(await encodePattern('x', draft))).draft).toEqual(draft)
})

test('print shows only the framed draft', async ({ page }) => {
  await importFile(page)
  await page.emulateMedia({ media: 'print' })
  await expect(page.locator('.print-sheet')).toBeVisible()
  await expect(page.locator('.print-sheet h1')).toHaveText('Green blocks')
  await expect(page.locator('.MuiAppBar-root')).toBeHidden()
  await expect(page.locator('.print-draft text').first()).toHaveText('4')
})

test('theme toggle switches to dark mode', async ({ page }) => {
  const toggle = page.getByRole('button', { name: /theme/ })
  await toggle.click() // system -> light
  await toggle.click() // light -> dark
  await expect(page.locator('html')).toHaveClass(/dark/)
})

test('made-by link points at the repo', async ({ page }) => {
  await expect(page.getByRole('link', { name: 'Made by steves165' })).toHaveAttribute(
    'href',
    'https://github.com/steves165/weave-patterner',
  )
})

test('the sample file on disk is the one used in tests', () => {
  expect(JSON.parse(readFileSync(new URL('../samples/Green blocks.weave.json', import.meta.url), 'utf8')).name).toBe(
    'Green blocks',
  )
})

test('supports up to 128 shafts and treadles', async ({ page }) => {
  const shafts = page.getByLabel('Shafts', { exact: true })
  const treadles = page.getByLabel('Treadles', { exact: true })
  await setField(page.getByLabel('Ends', { exact: true }), '128')
  await setField(page.getByLabel('Picks', { exact: true }), '128')
  await setField(shafts, '128')
  await setField(treadles, '130')
  await expect(shafts).toHaveValue('128')
  await expect(treadles).toHaveValue('128') // clamped to the limit
  await expect(cell(page, 'End 128, shaft 128')).toHaveAttribute('aria-checked', 'true')
  await expect(cell(page, 'Treadle 128, shaft 128')).toBeVisible()
  await expect(cell(page, 'Pick 128, treadle 128')).toHaveAttribute('aria-checked', 'true')
  await expect(page.getByText('128 shafts · 128 treadles').first()).toBeVisible()
})

test('the app replaces the search summary, and the page has its title and icons', async ({ page }) => {
  await expect(page).toHaveTitle(/Weave Patterner – Free Online Weaving Draft Designer/)
  await expect(page.getByRole('heading', { name: /free online weaving draft designer/ })).toHaveCount(0)
  await expect(page.locator('link[rel="icon"][type="image/svg+xml"]')).toHaveAttribute('href', './favicon.svg')
  const icon = await page.request.get('favicon.svg')
  expect(icon.ok()).toBe(true)
  const manifest = await page.request.get('manifest.webmanifest')
  expect((await manifest.json()).short_name).toBe('Weave Patterner')
})

test('New starts with completely empty grids', async ({ page }) => {
  await page.getByRole('button', { name: 'New' }).click()
  await expect(toast(page)).toContainText('New pattern: empty grids')
  expect(await threading(page)).toBe('0'.repeat(32))
  await expect(page.locator('.draft [role=checkbox][aria-checked="true"]')).toHaveCount(0)
  // With nothing lifted, the whole cloth shows weft.
  await expect(page.locator('.drawdown .cell.warp')).toHaveCount(0)
  // A new pattern is a fresh start: there's nothing to undo.
  await expect(page.getByRole('button', { name: 'Undo' })).toBeDisabled()
})
