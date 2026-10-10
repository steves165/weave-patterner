import { expect, type Page, test } from '@playwright/test'
import { openApp, openKnit, openSew } from './helpers'

/** The gap between the bottom of the settings bar and the top of the phone navigation (negative: they overlap). */
async function gap(page: Page) {
  const nav = await page.getByRole('navigation', { name: 'Main' }).boundingBox()
  const bar = await page.locator('[data-tour="settings"]').last().boundingBox()
  if (!nav || !bar) throw new Error('missing the navigation or the settings bar')
  return nav.y - (bar.y + bar.height)
}

for (const [app, open] of [
  ['Weave Patterner', openApp],
  ['Knit Patterner', openKnit],
  ['Sew Patterner', openSew],
] as const)
  test(`${app}: the settings bar sits right on the bottom navigation, however tall it is`, async ({ page }, info) => {
    test.skip(info.project.name !== 'phone', 'the bottom navigation is on phones')
    await open(page)
    expect(await gap(page)).toBeLessThanOrEqual(0)
    // A taller navigation, as with a bigger font or a phone's home-bar area.
    await page.addStyleTag({ content: 'nav[aria-label="Main"] { padding-bottom: 37px !important; }' })
    await expect.poll(() => gap(page)).toBeLessThanOrEqual(0)
    expect(await gap(page)).toBeGreaterThan(-2)
  })
