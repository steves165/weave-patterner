import { expect, test } from '@playwright/test'
import { FEEDBACK_HOSTS, openApp, openKnit } from './helpers'

test('feedback is sent with the app and version, and links to the new issue', async ({ page }) => {
  await openApp(page)
  let sent: Record<string, unknown> | null = null
  await page.route(FEEDBACK_HOSTS, async (route) => {
    sent = route.request().postDataJSON()
    await route.fulfill({ json: { url: 'https://github.com/steves165/weave-patterner/issues/999' } })
  })
  await page.getByRole('button', { name: 'Feedback' }).click()
  const dialog = page.getByRole('dialog', { name: 'Feedback' })
  const send = dialog.getByRole('button', { name: 'Send' })
  await expect(send).toBeDisabled()
  await dialog.getByLabel('An idea').check()
  await dialog.getByLabel('Your message').fill('A way to print the threading on its own')
  await send.click()
  await expect(dialog.getByRole('link', { name: /issues\/999/ })).toBeVisible()
  expect(sent).toMatchObject({
    kind: 'idea',
    message: 'A way to print the threading on its own',
    app: 'weave',
    platform: 'web',
    website: '',
  })
  expect((sent as unknown as { version: string }).version).toMatch(/^\d+\.\d+\.\d+$/)
})

test('a problem sending is shown, and the message is kept to try again', async ({ page }) => {
  await openKnit(page)
  await page.route(FEEDBACK_HOSTS, (route) =>
    route.fulfill({ status: 429, json: { error: 'That’s a lot of feedback: please try again in an hour.' } }),
  )
  await page.getByRole('button', { name: 'Feedback' }).click()
  const dialog = page.getByRole('dialog', { name: 'Feedback' })
  await dialog.getByLabel('Your message').fill('The cable chart symbols are too small')
  await dialog.getByRole('button', { name: 'Send' }).click()
  await expect(dialog.getByRole('alert')).toContainText('try again in an hour')
  await dialog.getByRole('button', { name: 'Close dialog' }).click()
  await page.getByRole('button', { name: 'Feedback' }).click()
  await expect(dialog.getByLabel('Your message')).toHaveValue('The cable chart symbols are too small')
})
