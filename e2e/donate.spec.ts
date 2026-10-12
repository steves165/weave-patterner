import { expect, test } from '@playwright/test'
import { openApp } from './helpers'

test('the footer links to PayPal to donate, in a new tab', async ({ page }) => {
  await openApp(page)
  const link = page.getByRole('link', { name: 'Donate' }).first()
  await expect(link).toHaveAttribute('href', /^https:\/\/www\.paypal\.com\/donate\/\?business=XSHCPFVA9AVU2/)
  await expect(link).toHaveAttribute('target', '_blank')
  await expect(link).toHaveAttribute('rel', /noopener/)
})
