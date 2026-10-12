import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { expect, type Page, test } from '@playwright/test'
import { defaultDraft } from '../src/weave'
import { openApp, toolbarButton } from './helpers'

const OLD = 'https://steves165.github.io'
const MOVER = readFileSync(fileURLToPath(new URL('../move/index.html', import.meta.url)), 'utf8')

/** Pretends to be the old address: the mover page, and a page there to save things on first. */
async function oldAddress(page: Page) {
  await page.context().route(`${OLD}/**`, (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: route.request().url().includes('/patterner-move/') ? MOVER : '<!doctype html><title>Old</title>',
    }),
  )
  // Saved at the old address: a pattern and a favourite colour.
  await page.goto(`${OLD}/weave-patterner/`)
  await page.evaluate(
    (draft) =>
      new Promise<void>((resolve, reject) => {
        localStorage.setItem('wp-colours', JSON.stringify({ favourites: ['#123456'], palettes: [] }))
        localStorage.setItem('weave-analytics-consent', 'granted')
        localStorage.setItem('other-app', 'not ours')
        const req = indexedDB.open('weave-patterner', 1)
        req.onupgradeneeded = () => req.result.createObjectStore('patterns', { keyPath: 'name' })
        req.onerror = () => reject(req.error)
        req.onsuccess = () => {
          const tx = req.result.transaction('patterns', 'readwrite')
          tx.objectStore('patterns').put({
            name: 'Old towel',
            updatedAt: 1,
            draft,
          })
          tx.oncomplete = () => resolve()
        }
      }),
    defaultDraft(),
  )
}

test('patterns saved at the old address can be brought over', async ({ page }) => {
  await oldAddress(page)
  // At the new address, where the offer is made (shown here by a test switch).
  await page.addInitScript(() => localStorage.setItem('wp-move-offer', '1'))
  await openApp(page)
  const notice = page.getByRole('region', { name: 'Moved to a new address' })
  await expect(notice).toContainText('Weave Patterner has a new home')

  const popup = page.waitForEvent('popup')
  await notice.getByRole('button', { name: 'Bring them over' }).click()
  await expect((await popup).getByText(/Sent 1 saved pattern/)).toBeVisible()

  // The page reloads with them in.
  await expect(page.getByText('Brought over 1 pattern and your settings.')).toBeVisible()
  await expect(notice).toHaveCount(0)
  const local = await page.evaluate(() => ({
    colours: localStorage.getItem('wp-colours'),
    consent: localStorage.getItem('weave-analytics-consent'),
    other: localStorage.getItem('other-app'),
    moved: localStorage.getItem('wp-moved'),
  }))
  expect(JSON.parse(local.colours ?? '{}').favourites).toEqual(['#123456'])
  expect(local.consent).toBe('denied')
  expect(local.other).toBeNull()
  expect(local.moved).toBe('done')
  await toolbarButton(page, 'Load').click()
  await expect(page.getByRole('dialog')).toContainText('Old towel')
})

test('the offer can be turned down, and is still in the Load dialog', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('wp-move-offer', '1'))
  await openApp(page)
  const notice = page.getByRole('region', { name: 'Moved to a new address' })
  await notice.getByRole('button', { name: 'No thanks' }).click()
  await expect(notice).toHaveCount(0)
  await page.reload()
  await expect(page.getByRole('group', { name: 'Threading' })).toBeVisible()
  await expect(notice).toHaveCount(0)
  await toolbarButton(page, 'Load').click()
  await expect(page.getByRole('button', { name: 'From the old address…' })).toBeVisible()
})

test('the offer is only made at the new address', async ({ page }) => {
  await openApp(page)
  await expect(page.getByRole('region', { name: 'Moved to a new address' })).toHaveCount(0)
})
