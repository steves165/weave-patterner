import { expect, type Page, test } from '@playwright/test'
import { importFile, loomChoice, openApp, setField } from './helpers'

// Random clicks and drags across the threading, tie-up, treadling and drawdown, with every drawing tool and the
// display options switched about, checking the app never throws (a throw in React's render leaves a blank page).
// Seeded, so a failure can be replayed: STRESS_SEED=<first seed> STRESS_RUNS=<how many seeds> STRESS_STEPS=<n>.

const FIRST_SEED = Number(process.env.STRESS_SEED ?? 1)
const RUNS = Number(process.env.STRESS_RUNS ?? 1)
const STEPS = Number(process.env.STRESS_STEPS ?? 150)

function random(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * The centre of a random cell in one of the grids, scrolled into view, or null if that grid isn't shown or something
 * (the status bar, a message) covers the cell.
 */
async function randomCell(page: Page, selector: string, rnd: () => number) {
  return page.evaluate(
    ({ selector, r }) => {
      const cells = [...document.querySelectorAll<HTMLElement>(selector)]
      if (!cells.length) return null
      const cell = cells[Math.floor(r * cells.length)]
      cell.scrollIntoView({ block: 'center', inline: 'center' })
      const box = cell.getBoundingClientRect()
      const x = box.left + box.width / 2
      const y = box.top + box.height / 2
      if (!cell.contains(document.elementFromPoint(x, y))) return null
      const name = cell.getAttribute('aria-label') ?? `square ${cell.dataset.end},${cell.dataset.pick}`
      return { x, y, name }
    },
    { selector, r: rnd() },
  )
}

const GRIDS = [
  '[aria-label="Threading"] [data-cell]',
  '[aria-label^="Tie-up"] [data-cell]',
  '[aria-label="Treadling"] [data-cell], [aria-label="Lift plan"] [data-cell]',
  '.drawdown [data-end]',
]
const TOOLS = ['Click', 'Straight draw', 'Point draw', 'Draw cloth', 'Select']

for (let run = 0; run < RUNS; run++) {
  const SEED = FIRST_SEED + run
  test(`random clicks and drags on the pattern never crash the app (seed ${SEED})`, async ({ page }) => {
    test.setTimeout(STEPS * 1000)
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(`${e.message}\n${e.stack ?? ''}`))
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
    await openApp(page)
    const rnd = random(SEED)
    const pick = <T>(xs: T[]) => xs[Math.floor(rnd() * xs.length)]
    const log: string[] = []

    for (let step = 0; step < STEPS && errors.length === 0; step++) {
      try {
        await act()
      } catch (e) {
        errors.push(String(e))
      }
      // A page stuck in a loop stops answering: Safari then gives up on it and reloads it blank.
      const answered = await Promise.race([
        page.evaluate(() => true),
        new Promise<false>((done) => setTimeout(() => done(false), 5000)),
      ])
      if (!answered) errors.push('The page stopped responding')
    }

    expect(errors, `seed ${SEED}, last steps:\n${log.slice(-15).join('\n')}`).toEqual([])
    await expect(page.getByRole('group', { name: 'Threading' })).toBeVisible()

    async function act() {
      // Clicking near the status bar can open one of its dialogs; close it to get back to the pattern.
      if (await page.getByRole('dialog').isVisible()) {
        log.push('close dialog')
        await page.keyboard.press('Escape')
        await expect(page.getByRole('dialog')).toBeHidden()
      }
      const roll = rnd()
      if (roll < 0.06) {
        const tool = pick(TOOLS)
        log.push(`tool ${tool}`)
        await page.getByRole('button', { name: tool, exact: true }).click({ timeout: 10_000 })
      } else if (roll < 0.1) {
        const side = pick(['Drawdown', 'Face', 'Back'])
        log.push(`side ${side}`)
        await page.getByRole('button', { name: side, exact: true }).click({ timeout: 10_000 })
      } else if (roll < 0.17) {
        const dim = pick(['Shafts', 'Treadles', 'Ends', 'Picks'])
        const field = page.getByRole('complementary', { name: 'Pattern settings' }).getByLabel(dim, { exact: true })
        if (!(await field.isVisible())) return
        const n = String(
          dim === 'Shafts' || dim === 'Treadles' ? 2 + Math.floor(rnd() * 8) : 4 + Math.floor(rnd() * 40),
        )
        log.push(`${dim} ${n}`)
        await setField(field, n)
      } else if (roll < 0.19) {
        const type = pick(['Treadles', 'Lift plan'])
        log.push(`loom ${type}`)
        await loomChoice(page, 'Loom type', type).click()
      } else if (roll < 0.26) {
        // The warp and weft colour strips: a swatch opens the colour picker; pick a colour or close it.
        const swatch = await randomCell(page, 'input.swatch', rnd)
        if (!swatch) return
        log.push(`colour ${swatch.name}`)
        await page.mouse.click(swatch.x, swatch.y)
        const picker = page.getByRole('dialog', { name: `Colours for ${swatch.name}` })
        if (rnd() < 0.7)
          await picker
            .getByRole('button', { name: /^Basic colour/ })
            .nth(Math.floor(rnd() * 8))
            .click()
        else await page.keyboard.press('Escape')
        await expect(picker).toBeHidden()
      } else if (roll < 0.27) {
        log.push('import sample')
        await importFile(page)
      } else if (roll < 0.3) {
        const key = pick(['Control+z', 'Control+y', 'Escape'])
        log.push(`key ${key}`)
        await page.keyboard.press(key)
      } else {
        const grid = pick(GRIDS)
        const from = await randomCell(page, grid, rnd)
        if (!from) return
        if (rnd() < 0.5) {
          log.push(`click ${from.name}`)
          await page.mouse.click(from.x, from.y)
        } else {
          const to = (await randomCell(page, pick(GRIDS), rnd)) ?? from
          log.push(`drag ${from.name} -> ${to.name}`)
          await page.mouse.move(from.x, from.y)
          await page.mouse.down()
          await page.mouse.move(to.x, to.y, { steps: 1 + Math.floor(rnd() * 8) })
          await page.mouse.up()
        }
      }
    }
  })
}
