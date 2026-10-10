import { expect, test } from '@playwright/test'
import { a11yProblems, openApp, openKnit, openSew } from './helpers'

test.describe('phones and tablets: axe finds no accessibility problems', () => {
  test('Weave Patterner', async ({ page }) => {
    await openApp(page)
    expect(await a11yProblems(page)).toEqual([])
  })

  test('Knit Patterner', async ({ page }) => {
    await openKnit(page)
    expect(await a11yProblems(page)).toEqual([])
  })

  test('Sew Patterner', async ({ page }) => {
    await openSew(page)
    expect(await a11yProblems(page)).toEqual([])
  })

  test('the bottom bar menus', async ({ page }, info) => {
    test.skip(info.project.name !== 'phone', 'the bottom bar is on phones')
    await openApp(page)
    const nav = page.getByRole('navigation', { name: 'Main' })
    await nav.getByRole('button', { name: 'Tools' }).click()
    expect(await a11yProblems(page, '.MuiPopover-paper'), 'Tools').toEqual([])
    await page.keyboard.press('Escape')
    await nav.getByRole('button', { name: 'File' }).click()
    expect(await a11yProblems(page, '[role="menu"]'), 'File').toEqual([])

    await openKnit(page)
    await page.getByRole('navigation', { name: 'Main' }).getByRole('button', { name: 'File' }).click()
    expect(await a11yProblems(page, '[role="menu"]'), 'Knit File').toEqual([])
  })
})

test('Theme is in the settings sheet, beside Help, and its dialog fits', async ({ page }, info) => {
  test.skip(info.project.name !== 'phone', 'phones keep the links in the settings sheet')
  await openApp(page)
  await page.getByText('Pattern settings').click()
  const theme = page.getByRole('button', { name: 'Theme' })
  await theme.scrollIntoViewIfNeeded()
  await theme.click()
  const dialog = page.getByRole('dialog', { name: 'Colour theme' })
  await expect(dialog).toBeVisible()
  expect(await a11yProblems(page, '[role="dialog"]')).toEqual([])
  await dialog.locator('input[value="winter"]').check()
  await expect(page.locator('html')).toHaveClass(/season-winter/)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
})
