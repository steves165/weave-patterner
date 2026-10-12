import { expect, type Page, test } from '@playwright/test'
import { openApp, toolbarButton } from './helpers'

async function openBackup(page: Page) {
  await toolbarButton(page, 'Load').click()
  await page.getByRole('button', { name: 'Back up or restore…' }).click()
  return page.getByRole('dialog', { name: 'Back up or restore' })
}

test('a backup moves patterns and colours to another device', async ({ page, browser }, info) => {
  // On the first device: a saved pattern and a favourite colour.
  await openApp(page)
  await page.evaluate(() => localStorage.setItem('wp-colours', '{"favourites":["#123456"],"palettes":[]}'))
  await toolbarButton(page, 'Save').click()
  await page.getByRole('dialog').getByLabel('Name').fill('Travelling towel')
  await page.getByRole('dialog').getByRole('button', { name: 'Save' }).click()

  let dialog = await openBackup(page)
  await expect(dialog.getByTestId('backup-contents')).toHaveText(
    'This browser has 1 weaving draft, no knitting charts and no sewing projects.',
  )
  const downloading = page.waitForEvent('download')
  await dialog.getByRole('button', { name: 'Download backup' }).click()
  const file = await downloading
  expect(file.suggestedFilename()).toMatch(/^patterner-backup-\d{4}-\d{2}-\d{2}\.json$/)
  const path = info.outputPath('backup.json')
  await file.saveAs(path)

  // On the second device (a browser with nothing saved).
  const other = await browser.newContext()
  const phone = await other.newPage()
  await openApp(phone)
  dialog = await openBackup(phone)
  await expect(dialog.getByTestId('backup-contents')).toContainText('no weaving drafts')
  await dialog.getByLabel('Backup file').setInputFiles(path)
  await expect(dialog.getByTestId('backup-chosen')).toContainText('1 weaving draft')
  await expect(dialog.getByLabel(/Also restore colours and settings/)).toBeChecked()
  await dialog.getByRole('button', { name: 'Restore', exact: true }).click()

  await expect(phone.getByText('Restored 1 pattern and your settings.')).toBeVisible()
  expect(await phone.evaluate(() => JSON.parse(localStorage.getItem('wp-colours') ?? '{}').favourites)).toEqual([
    '#123456',
  ])
  await toolbarButton(phone, 'Load').click()
  await expect(phone.getByRole('dialog')).toContainText('Travelling towel')
  await other.close()
})

test('choosing a file that isn’t a backup says so', async ({ page }) => {
  await openApp(page)
  const dialog = await openBackup(page)
  await dialog.getByLabel('Backup file').setInputFiles({
    name: 'notes.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{"hello":1}'),
  })
  await expect(dialog.getByRole('alert')).toContainText('isn’t a Patterner backup file')
  await expect(dialog.getByRole('button', { name: 'Restore', exact: true })).toHaveCount(0)
})
