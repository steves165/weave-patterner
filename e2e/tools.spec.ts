import { expect, type Page, test } from '@playwright/test'
import { ends, openApp, openTool, picks, threading, toast, toolbarButton, treadling } from './helpers'

const dialog = (page: Page) => page.getByRole('dialog', { name: 'Sequence tools' })

async function sequenceTools(page: Page, from?: number, to?: number) {
  await openTool(page, /Sequence tools/)
  if (from !== undefined) await dialog(page).getByLabel('From').fill(String(from))
  if (to !== undefined) await dialog(page).getByLabel('To').fill(String(to))
}

test.beforeEach(async ({ page }) => openApp(page))

test('fills the threading with a point draw', async ({ page }) => {
  await sequenceTools(page)
  await expect(page.getByTestId('sequence-preview')).toHaveText('1 2 3 4 3 2')
  await dialog(page).getByRole('button', { name: 'Fill ends 1–32' }).click()
  await expect(dialog(page)).toBeHidden()
  expect(await threading(page)).toBe('123432'.repeat(6).slice(0, 32))
  await expect(toast(page)).toContainText('Filled ends 1–32')
})

test('fills with an advancing twill and a custom sequence', async ({ page }) => {
  await sequenceTools(page, 1, 12)
  await dialog(page).getByLabel('Pattern').click()
  await page.getByRole('option', { name: 'Advancing twill' }).click()
  await dialog(page).getByLabel('Run').fill('3')
  await expect(page.getByTestId('sequence-preview')).toHaveText('1 2 3 2 3 4 3 4 1 4 1 2')
  await dialog(page)
    .getByRole('button', { name: /Fill ends/ })
    .click()
  expect((await threading(page)).slice(0, 12)).toBe('123234341412')

  await sequenceTools(page, 1, 6)
  await dialog(page).getByLabel('Pattern').click()
  await page.getByRole('option', { name: 'Custom sequence' }).click()
  await dialog(page)
    .getByLabel(/Shafts \(0 = empty\)/)
    .fill('4-1 0 2')
  await dialog(page)
    .getByRole('button', { name: /Fill ends/ })
    .click()
  expect((await threading(page)).slice(0, 6)).toBe('432102')
})

test('repeats, mirrors, reverses, inserts and deletes ends', async ({ page }) => {
  await sequenceTools(page, 1, 4)
  await dialog(page).getByLabel('Times').fill('2')
  await dialog(page).getByRole('button', { name: 'Repeat' }).click()
  expect(await ends(page)).toBe('40')
  expect((await threading(page)).slice(0, 12)).toBe('123412341234')

  await sequenceTools(page, 1, 4)
  await dialog(page).getByRole('button', { name: 'Mirror' }).click()
  expect((await threading(page)).slice(0, 8)).toBe('12343211')
  expect(await ends(page)).toBe('43')

  await sequenceTools(page, 1, 4)
  await dialog(page).getByRole('button', { name: 'Reverse' }).click()
  expect((await threading(page)).slice(0, 4)).toBe('4321')

  await sequenceTools(page, 2)
  await dialog(page).getByLabel('Count').fill('3')
  await dialog(page).getByRole('button', { name: 'Insert empty ends at 2' }).click()
  expect((await threading(page)).slice(0, 5)).toBe('40003')
  expect(await ends(page)).toBe('46')

  await sequenceTools(page, 2, 4)
  await dialog(page).getByRole('button', { name: 'Delete' }).click()
  expect(await ends(page)).toBe('43')
  expect((await threading(page)).slice(0, 2)).toBe('43')
})

test('works on the treadling', async ({ page }) => {
  await sequenceTools(page)
  await dialog(page).getByRole('button', { name: 'Treadling (picks)' }).click()
  await expect(dialog(page).getByLabel('To')).toHaveValue('32')
  await dialog(page).getByLabel('To').fill('2')
  await dialog(page).getByRole('button', { name: 'Repeat' }).click()
  expect(await picks(page)).toBe('34') // picks 1-2 added once more
  expect((await treadling(page)).slice(0, 4)).toBe('1212')
})

test('explains mistakes instead of changing the draft', async ({ page }) => {
  const start = await threading(page)
  await sequenceTools(page, 1, 4)
  await dialog(page).getByLabel('Pattern').click()
  await page.getByRole('option', { name: 'Custom sequence' }).click()
  await dialog(page)
    .getByLabel(/Shafts/)
    .fill('1 9')
  await dialog(page)
    .getByRole('button', { name: /Fill ends/ })
    .click()
  await expect(dialog(page).getByRole('alert')).toHaveText("Shaft 9 doesn't exist; this draft has 4 shafts")

  await dialog(page).getByLabel('To').fill('99')
  await dialog(page).getByRole('button', { name: 'Reverse' }).click()
  await expect(dialog(page).getByRole('alert')).toHaveText('Choose a range between 1 and 32')
  await dialog(page).getByRole('button', { name: 'Close' }).click()
  expect(await threading(page)).toBe(start)
})

test('tool changes can be undone', async ({ page }) => {
  const start = await threading(page)
  await sequenceTools(page, 1, 4)
  await dialog(page).getByRole('button', { name: 'Reverse' }).click()
  expect(await threading(page)).not.toBe(start)
  await toolbarButton(page, 'Undo').click()
  expect(await threading(page)).toBe(start)
})

test('tromp as writ copies the threading into the treadling', async ({ page }) => {
  await sequenceTools(page)
  await dialog(page)
    .getByRole('button', { name: /Fill ends/ })
    .click()
  await openTool(page, /Tromp as writ/)
  expect(await treadling(page)).toBe(await threading(page))
  expect(await picks(page)).toBe('32')
  await expect(toast(page)).toContainText('Treadling now follows the threading (32 picks)')
})
