import { expect, test } from '@playwright/test'
import { openApp, toast } from './helpers'

// The production build (local or live) asks about analytics; the dev server doesn't.
test.skip(Boolean(process.env.E2E_DEV), 'analytics is only in production builds')

test('a first visit: one thing at a time, and a starting pattern with nothing to warn about', async ({ page }) => {
  await openApp(page, { analytics: 'unset', tour: 'new', pattern: 'starter' })
  const banner = page.getByTestId('analytics-consent')
  const tour = page.getByText('New to Weave Patterner?')
  await expect(banner).toBeVisible()
  // Not the tour offer, nor a notice about the old address, while the banner asks.
  await expect(tour).toHaveCount(0)
  await expect(page.getByText(/has a new home/)).toHaveCount(0)
  // The starting pattern's edges are fine.
  await expect(page.getByTestId('selvedge')).toHaveCount(0)
  await expect(page.getByTestId('edges-ok')).toBeVisible()

  await banner.getByRole('button', { name: 'No thanks' }).click()
  await expect(banner).toBeHidden()
  await expect(tour).toBeVisible()
  await expect(toast(page)).toBeHidden()
})
