import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import AxeBuilder from '@axe-core/playwright'
import { expect, type Locator, type Page } from '@playwright/test'

export const SAMPLE = fileURLToPath(new URL('../samples/Green blocks.weave.json', import.meta.url))
export const sampleText = () => readFileSync(SAMPLE, 'utf8')

/** Google Analytics' servers: tests must never send hits to the real analytics. */
export const ANALYTICS_HOSTS = /googletagmanager\.com|google-analytics\.com|analytics\.google\.com/

/** A returning visitor: the tour has been offered already, so its welcome card doesn't get in the way. */
async function tourSeen(page: Page) {
  await page.addInitScript(() => {
    if (!localStorage.getItem('wp-tour-seen'))
      localStorage.setItem('wp-tour-seen', '{"weave":true,"knit":true,"sew":true}')
  })
}

/**
 * Opens the app. Requests to Google Analytics are always blocked. Unless `analytics` says otherwise, the visitor
 * has already said "No thanks", so the consent banner doesn't get in the way; and has seen the tour offer, unless
 * `tour` is "new".
 */
export async function openApp(
  page: Page,
  { analytics = 'denied', tour = 'seen' }: { analytics?: 'denied' | 'unset'; tour?: 'seen' | 'new' } = {},
) {
  await page.context().route(ANALYTICS_HOSTS, (route) => route.abort())
  if (tour === 'seen') await tourSeen(page)
  if (analytics === 'denied')
    await page.addInitScript(() => {
      if (!localStorage.getItem('weave-analytics-consent')) localStorage.setItem('weave-analytics-consent', 'denied')
    })
  await page.goto('./')
  await expect(page.getByRole('group', { name: 'Threading' })).toBeVisible()
}

/** A toolbar button by its visible text (wide screens) or accessible name (icon-only). */
export const toolbarButton = (page: Page, label: string) =>
  page.getByRole('banner').getByRole('button', { name: label })

export const cell = (page: Page, name: string) => page.getByRole('checkbox', { name, exact: true })

/** The shaft (1-based, 0 for none) of each threading column as drawn left to right, as a string like "1234". */
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

/** Opens Knit Patterner, with analytics blocked and already declined as for openApp. */
export async function openKnit(page: Page, { tour = 'seen' }: { tour?: 'seen' | 'new' } = {}) {
  await page.context().route(ANALYTICS_HOSTS, (route) => route.abort())
  if (tour === 'seen') await tourSeen(page)
  await page.addInitScript(() => {
    if (!localStorage.getItem('weave-analytics-consent')) localStorage.setItem('weave-analytics-consent', 'denied')
  })
  await page.goto('./knit/')
  await expect(page.getByRole('grid', { name: 'Knitting chart' })).toBeVisible()
}

/** Opens Sew Patterner, with analytics blocked and already declined as for openApp. */
export async function openSew(page: Page, { tour = 'seen', at = '' }: { tour?: 'seen' | 'new'; at?: string } = {}) {
  await page.context().route(ANALYTICS_HOSTS, (route) => route.abort())
  if (tour === 'seen') await tourSeen(page)
  await page.addInitScript(() => {
    if (!localStorage.getItem('weave-analytics-consent')) localStorage.setItem('weave-analytics-consent', 'denied')
  })
  await page.goto(`./sew/${at}`)
  await expect(page.getByRole('img', { name: /pattern, / })).toBeVisible()
}

/** A square of the knitting chart: row 1 is the bottom row, stitch 1 the rightmost. */
export function knitSquare(page: Page, row: number, stitch: number) {
  return page.getByRole('gridcell', { name: new RegExp(`^(Row|Round) ${row}, stitch ${stitch}:`) })
}

/** The written instruction for a row, without its label. */
export async function writtenRow(page: Page, row: number) {
  const text = await page.getByTestId('knit-written').locator(`li[data-row="${row}"]`).innerText()
  return text.replace(/^[^:]*:\s*/, '')
}

/** What the drawdown shows, square by square (warp or weft, and colour), ignoring passing highlights. */
export function drawdownPicture(page: Page): Promise<string> {
  return page
    .locator('.drawdown')
    .evaluate((el) =>
      [...el.querySelectorAll<HTMLElement>('.cell')]
        .map((c) => `${c.classList.contains('warp') ? 'w' : 'f'}${c.style.backgroundColor}`)
        .join('|'),
    )
}

/**
 * Accessibility problems axe-core finds on the page, or only in `within` (a dialog or menu), as readable lines.
 * Colour contrast isn't checked: the palette is the design's. Pop-ups (menus, tooltips) open outside the page's
 * landmarks by design, so landmark checks are left out when scanning one.
 */
export async function a11yProblems(page: Page, within?: string): Promise<string[]> {
  let scan = new AxeBuilder({ page }).disableRules(['color-contrast'])
  if (within) {
    await expect(page.locator(within).first()).toBeVisible()
    scan = scan.include(within).disableRules(['color-contrast', 'region'])
  }
  const { violations } = await scan.analyze()
  return violations.flatMap((v) => v.nodes.map((n) => `${v.id}: ${v.help} — ${n.html.slice(0, 160)}`))
}
