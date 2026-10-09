import { expect, test } from '@playwright/test'
import { a11yProblems, openApp, openKnit } from './helpers'

test.describe('phones and tablets: axe finds no accessibility problems', () => {
  test('Weave Patterner', async ({ page }) => {
    await openApp(page)
    expect(await a11yProblems(page)).toEqual([])
  })

  test('Knit Patterner', async ({ page }) => {
    await openKnit(page)
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
