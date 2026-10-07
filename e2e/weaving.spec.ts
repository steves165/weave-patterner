import { expect, type Page, test } from '@playwright/test'
import { importFile, openApp, setField, toolbarButton } from './helpers'

const pickNumber = (page: Page) => page.getByTestId('pick-number')
const instruction = (page: Page) => page.getByTestId('instruction')

async function openWeaving(page: Page) {
  await toolbarButton(page, 'Weave').click()
  await expect(page.getByRole('dialog', { name: /Weaving:/ })).toBeVisible()
}

test.beforeEach(async ({ page }) => openApp(page))

test('shows the first pick: treadle, weft colour and what comes next', async ({ page }) => {
  await openWeaving(page)
  await expect(pickNumber(page)).toContainText('Pick 1')
  await expect(pickNumber(page)).toContainText('of 32')
  await expect(instruction(page)).toHaveText('Press treadle 1')
  await expect(page.getByRole('listitem', { name: 'treadle 1, use' })).toBeVisible()
  await expect(page.getByRole('listitem', { name: 'treadle 2', exact: true })).toBeVisible()
  await expect(page.getByTestId('weft-colour')).toHaveText('Weft #ffffff')
  await expect(page.getByTestId('upcoming')).toContainText('2')
})

test('steps forward and back with buttons, keys and page-turner pedals', async ({ page }) => {
  await openWeaving(page)
  await page.getByRole('button', { name: 'Next pick' }).click()
  await expect(pickNumber(page)).toContainText('Pick 2')
  await expect(instruction(page)).toHaveText('Press treadle 2')
  for (const key of ['ArrowRight', ' ', 'PageDown', 'Enter']) await page.keyboard.press(key)
  await expect(pickNumber(page)).toContainText('Pick 6')
  for (const key of ['ArrowLeft', 'PageUp']) await page.keyboard.press(key)
  await expect(pickNumber(page)).toContainText('Pick 4')
  await page.getByRole('button', { name: 'Back' }).click()
  await expect(pickNumber(page)).toContainText('Pick 3')
})

test('wraps to the next repeat after the last pick', async ({ page }) => {
  await setField(page.getByLabel('Picks', { exact: true }), '4')
  await openWeaving(page)
  for (let i = 0; i < 4; i++) await page.keyboard.press('ArrowRight')
  await expect(pickNumber(page)).toContainText('Pick 1')
  await expect(page.getByTestId('repeat-number')).toHaveText('Repeat 2')
  await page.keyboard.press('ArrowLeft')
  await expect(pickNumber(page)).toContainText('Pick 4')
  await expect(page.getByTestId('repeat-number')).toHaveText('Repeat 1')
})

test('shows shafts to lift for dobby looms', async ({ page }) => {
  await openWeaving(page)
  await page.getByRole('button', { name: 'Shafts' }).click()
  await expect(instruction(page)).toHaveText('Lift shafts 1, 2')
  await expect(page.getByRole('listitem', { name: 'shaft 2, use' })).toBeVisible()
  await expect(page.getByRole('listitem', { name: 'shaft 3', exact: true })).toBeVisible()
})

test('says when a pick has no treadle', async ({ page }) => {
  await page.getByRole('checkbox', { name: 'Pick 1, treadle 1' }).click()
  await openWeaving(page)
  await expect(instruction(page)).toHaveText('No treadles for this pick')
})

test('jumps to a pick and starts over', async ({ page }) => {
  await openWeaving(page)
  const goTo = page.getByLabel('Go to pick')
  await goTo.fill('20')
  await goTo.press('Enter')
  await expect(pickNumber(page)).toContainText('Pick 20')
  await page.getByRole('button', { name: 'Start over' }).click()
  await expect(pickNumber(page)).toContainText('Pick 1')
})

test('remembers where you got to for each pattern, across reloads', async ({ page }) => {
  await importFile(page)
  await openWeaving(page)
  await expect(page.getByRole('dialog')).toContainText('Weaving: Green blocks')
  for (let i = 0; i < 9; i++) await page.keyboard.press('ArrowRight')
  await expect(pickNumber(page)).toContainText('Pick 10')
  await page.getByRole('button', { name: 'Close weaving mode' }).click()

  await page.reload()
  await importFile(page)
  await openWeaving(page)
  await expect(pickNumber(page)).toContainText('Pick 10')
})
