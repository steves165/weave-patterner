import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { expect, type Locator, type Page } from '@playwright/test'

export const SAMPLE = fileURLToPath(new URL('../samples/Green blocks.weave.json', import.meta.url))
export const sampleText = () => readFileSync(SAMPLE, 'utf8')

export async function openApp(page: Page) {
  await page.goto('/')
  await expect(page.getByRole('group', { name: 'Threading' })).toBeVisible()
}

/** A toolbar button by its visible text (wide screens) or accessible name (icon-only). */
export const toolbarButton = (page: Page, label: string) =>
  page.getByRole('banner').getByRole('button', { name: label })

export const cell = (page: Page, name: string) => page.getByRole('checkbox', { name, exact: true })

/** The shaft (1-based, 0 for none) each end is threaded on, as a string like "1234". */
export function threading(page: Page): Promise<string> {
  return page.getByRole('group', { name: 'Threading' }).evaluate((grid) => {
    const cells = [...grid.querySelectorAll<HTMLElement>('[data-cell]')]
    const rows = new Set(cells.map((c) => c.dataset.cell?.split('-')[0])).size
    const cols = cells.length / rows
    const out = Array(cols).fill(0)
    for (const c of cells) {
      if (c.getAttribute('aria-checked') !== 'true') continue
      const [r, col] = (c.dataset.cell ?? '').split('-').map(Number)
      out[col] = rows - r
    }
    return out.join('')
  })
}

/** The first treadle (1-based, 0 for none) pressed on each pick. */
export function treadling(page: Page): Promise<string> {
  return page.getByRole('group', { name: 'Treadling' }).evaluate((grid) => {
    const cells = [...grid.querySelectorAll<HTMLElement>('[data-cell]')]
    const picks = new Map<number, number>()
    for (const c of cells) {
      const [p, t] = (c.dataset.cell ?? '').split('-').map(Number)
      if (!picks.has(p)) picks.set(p, 0)
      if (c.getAttribute('aria-checked') === 'true' && picks.get(p) === 0) picks.set(p, t + 1)
    }
    return [...picks.values()].join('')
  })
}

export const ends = (page: Page) => page.getByLabel('Ends', { exact: true }).inputValue()
export const picks = (page: Page) => page.getByLabel('Picks', { exact: true }).inputValue()

/** Commits a settings number field (they apply on Enter or blur). */
export async function setField(field: Locator, value: string) {
  await field.fill(value)
  await field.press('Enter')
}

export async function importFile(page: Page, path = SAMPLE) {
  await toolbarButton(page, 'Import').click()
  await page.locator('input[type=file]').setInputFiles(path)
  await expect(page.getByRole('dialog')).toBeHidden()
}

export async function openTool(page: Page, item: RegExp) {
  await toolbarButton(page, 'Tools').click()
  await page.getByRole('menuitem', { name: item }).click()
}

export const toast = (page: Page) => page.locator('.MuiSnackbarContent-message')
