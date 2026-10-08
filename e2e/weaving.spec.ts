import { expect, type Page, test } from '@playwright/test'
import { importFile, openApp, setField, toolbarButton } from './helpers'

const pickNumber = (page: Page) => page.getByTestId('pick-number')
const instruction = (page: Page) => page.getByTestId('instruction')

async function openWeaving(page: Page) {
  await toolbarButton(page, 'Start weaving').click()
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
  await expect(page.getByTestId('weft-colour')).toHaveText('Weft #ffd3e4')
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

test.describe('chime on weft change', () => {
  test.beforeEach(async ({ page }) => {
    // Count chimes instead of making a sound.
    await page.addInitScript(() => {
      const w = window as unknown as { chimes: number }
      w.chimes = 0
      window.AudioContext = class {
        currentTime = 0
        destination = {}
        createOscillator() {
          return {
            frequency: {},
            connect: (n: unknown) => n,
            start: () => {
              w.chimes++
            },
            stop() {},
          }
        }
        createGain() {
          return {
            gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} },
            connect: (n: unknown) => n,
          }
        }
      } as unknown as typeof AudioContext
    })
    await page.reload()
  })
  const chimes = (page: Page) => page.evaluate(() => (window as unknown as { chimes: number }).chimes)

  test('chimes and shows a notice when stepping onto a new weft colour', async ({ page }) => {
    await page.getByLabel('Weft 3', { exact: true }).fill('#000000')
    await openWeaving(page)
    await expect(page.getByTestId('weft-change')).toHaveCount(0)
    await page.getByRole('button', { name: 'Next pick' }).click() // pick 2: still white
    expect(await chimes(page)).toBe(0)
    await page.getByRole('button', { name: 'Next pick' }).click() // pick 3: black
    await expect(page.getByTestId('weft-change')).toHaveText('Change weft')
    expect(await chimes(page)).toBe(2) // two notes
    await page.getByRole('button', { name: 'Next pick' }).click() // pick 4: back to white
    expect(await chimes(page)).toBe(4)
    await page.getByRole('button', { name: 'Back' }).click() // going back doesn't chime
    expect(await chimes(page)).toBe(4)

    await page.getByLabel('Chime on weft change').uncheck()
    await page.getByRole('button', { name: 'Next pick' }).click()
    await expect(page.getByTestId('weft-change')).toBeVisible() // the notice still shows
    expect(await chimes(page)).toBe(4)
  })
})

test('threading guide steps end by end, from either side', async ({ page }) => {
  await page.getByLabel('Warp 3', { exact: true }).fill('#000000')
  await openWeaving(page)
  await page.getByRole('button', { name: 'Thread', exact: true }).click()
  await expect(page.getByRole('dialog', { name: /Threading:/ })).toBeVisible()
  await expect(page.getByTestId('end-number')).toContainText('End 1')
  await expect(page.getByTestId('thread-instruction')).toHaveText('Shaft 1, heddle 1 of 8')
  await expect(page.getByRole('listitem', { name: 'shaft 1, use' })).toBeVisible()
  await expect(page.getByTestId('heddles')).toHaveText('Heddles needed: shaft 1: 8, shaft 2: 8, shaft 3: 8, shaft 4: 8')
  await expect(page.getByTestId('upcoming-ends')).toContainText('2')

  await page.getByRole('button', { name: 'Next end' }).click()
  await page.keyboard.press('ArrowRight')
  await expect(page.getByTestId('end-number')).toContainText('End 3')
  await expect(page.getByTestId('warp-change')).toBeVisible()
  await expect(page.getByTestId('warp-colour')).toHaveText('Warp #000000')
  // Arrow keys move the threading, not the weaving, while threading.
  await page.getByRole('button', { name: 'Weave', exact: true }).click()
  await expect(page.getByTestId('pick-number')).toContainText('Pick 1')
  await page.getByRole('button', { name: 'Thread', exact: true }).click()
  await expect(page.getByTestId('end-number')).toContainText('End 3') // remembered

  await page.getByRole('button', { name: 'From end 32' }).click()
  await expect(page.getByTestId('end-number')).toContainText('End 32')
  await expect(page.getByTestId('thread-instruction')).toHaveText('Shaft 4, heddle 8 of 8')
  await page.getByLabel('Go to end').fill('30')
  await page.getByLabel('Go to end').press('Enter')
  await expect(page.getByTestId('end-number')).toContainText('End 30')
  await page.getByLabel('Go to end').fill('1')
  await page.getByLabel('Go to end').press('Enter')
  await expect(page.getByRole('button', { name: 'All threaded' })).toBeDisabled()
})

test('unthreaded ends say to leave the heddle out', async ({ page }) => {
  await page.getByRole('checkbox', { name: 'End 1, shaft 1', exact: true }).click()
  await openWeaving(page)
  await page.getByRole('button', { name: 'Thread', exact: true }).click()
  await expect(page.getByTestId('thread-instruction')).toHaveText('Leave empty: no heddle for this end')
})
