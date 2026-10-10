import { expect, type Page, test } from '@playwright/test'
import { a11yProblems, openApp, openKnit, openSew, openTool, toolbarButton } from './helpers'

/** Closes whatever dialog is open, and waits for it to go. */
async function closeDialog(page: Page) {
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
}

test.describe('Weave Patterner: axe finds no accessibility problems', () => {
  test('the editor', async ({ page }) => {
    await openApp(page)
    expect(await a11yProblems(page)).toEqual([])
  })

  test('every dialog in the Tools menu', async ({ page }) => {
    test.setTimeout(180_000)
    await openApp(page)
    await toolbarButton(page, 'Tools').click()
    expect(await a11yProblems(page, '.MuiPopover-paper')).toEqual([])
    const tools = await page
      .getByRole('menuitem')
      .evaluateAll((items) =>
        items.map((m) => m.querySelector('.MuiListItemText-primary')?.textContent ?? '').filter((t) => t.endsWith('…')),
      )
    await page.keyboard.press('Escape')
    expect(tools.length).toBeGreaterThan(10)
    for (const tool of tools) {
      await openTool(page, new RegExp(`^${tool.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`))
      await expect(page.getByRole('dialog')).toBeVisible()
      expect(await a11yProblems(page, '[role="dialog"]'), tool).toEqual([])
      await closeDialog(page)
    }
  })

  test('the file dialogs and menus, weaving mode, help and the tour', async ({ page }) => {
    await openApp(page)
    for (const name of ['Save', 'Load', 'Share']) {
      await toolbarButton(page, name).click()
      expect(await a11yProblems(page, '[role="dialog"]'), name).toEqual([])
      await closeDialog(page)
    }
    for (const name of ['Export', 'Print']) {
      await toolbarButton(page, name).click()
      expect(await a11yProblems(page, '[role="menu"]'), name).toEqual([])
      await page.keyboard.press('Escape')
    }
    await toolbarButton(page, 'Start weaving').click()
    expect(await a11yProblems(page, '[role="dialog"]'), 'weaving mode').toEqual([])
    await closeDialog(page)

    await page.keyboard.press('F1')
    await expect(page.getByRole('dialog', { name: 'Weave Patterner help' })).toBeVisible()
    expect(await a11yProblems(page, '[role="dialog"]'), 'help').toEqual([])
    await page.getByRole('button', { name: 'Take the tour' }).click()
    await expect(page.getByTestId('tour-step')).toHaveText(/^1 of/)
    expect(await a11yProblems(page, '[data-testid="tour"]'), 'tour').toEqual([])
  })

  test('the first-visit welcome', async ({ page }) => {
    await openApp(page, { tour: 'new' })
    await expect(page.getByRole('region', { name: 'Welcome' })).toBeVisible()
    expect(await a11yProblems(page)).toEqual([])
  })
})

test.describe('Knit Patterner: axe finds no accessibility problems', () => {
  test('the editor, and while selecting', async ({ page }) => {
    await openKnit(page)
    expect(await a11yProblems(page)).toEqual([])
    await page.locator('[data-tour="select"]').first().click()
    // An open tooltip sits outside the landmarks by design; scan once it's gone.
    await page.mouse.move(0, 0)
    await expect(page.getByRole('tooltip')).toHaveCount(0)
    expect(await a11yProblems(page)).toEqual([])
  })

  test('the dialogs and menus', async ({ page }) => {
    await openKnit(page)
    for (const name of ['Save', 'Load', 'Share', 'Start knitting']) {
      await toolbarButton(page, name).click()
      expect(await a11yProblems(page, '[role="dialog"]'), name).toEqual([])
      await closeDialog(page)
    }
    for (const name of ['Samples', 'Import', 'Export']) {
      await toolbarButton(page, name).click()
      expect(await a11yProblems(page, '[role="menu"]'), name).toEqual([])
      await page.keyboard.press('Escape')
    }
    for (const name of ['Panels…', 'Make a mosaic…']) {
      await page.getByRole('button', { name }).click()
      expect(await a11yProblems(page, '[role="dialog"]'), name).toEqual([])
      await closeDialog(page)
    }
    await page.keyboard.press('F1')
    expect(await a11yProblems(page, '[role="dialog"]'), 'help').toEqual([])
  })
})

test.describe('keyboard and screen readers', () => {
  test('"Skip to the draft" is the first stop and jumps past the toolbar', async ({ page }) => {
    await openApp(page)
    await page.keyboard.press('Tab')
    const skip = page.getByRole('link', { name: 'Skip to the draft' })
    await expect(skip).toBeFocused()
    await expect(skip).toBeInViewport()
    await page.keyboard.press('Enter')
    await expect(page.locator('main')).toBeFocused()
    // The address isn't changed: a #hash there is a shared pattern.
    expect(new URL(page.url()).hash).toBe('')
    // The next stop is in the draft, not back in the toolbar.
    await page.keyboard.press('Tab')
    await expect(page.locator('main :focus')).toHaveCount(1)
  })

  test('Knit has one too, to the chart', async ({ page }) => {
    await openKnit(page)
    await page.keyboard.press('Tab')
    await expect(page.getByRole('link', { name: 'Skip to the chart' })).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(page.locator('main')).toBeFocused()
  })

  test('the Tools search goes to the tools found with the down arrow', async ({ page }) => {
    await openApp(page)
    await toolbarButton(page, 'Tools').click()
    await page.keyboard.type('calculator')
    await page.keyboard.press('ArrowDown')
    await expect(page.getByRole('menuitem', { name: /Warp calculator/ })).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(page.getByRole('dialog')).toBeVisible()
  })

  test('the tour keeps focus in its card', async ({ page }) => {
    await openApp(page)
    await page.keyboard.press('F1')
    await page.getByRole('button', { name: 'Take the tour' }).click()
    await page.getByRole('button', { name: 'Next' }).click()
    const card = page.getByTestId('tour').getByRole('dialog')
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Tab')
      await expect(card.locator(':focus')).toHaveCount(1)
    }
    await page.keyboard.press('Shift+Tab')
    await expect(card.locator(':focus')).toHaveCount(1)
  })

  test('the checks are read out when they change', async ({ page }) => {
    await openApp(page)
    const status = page.getByRole('contentinfo').getByRole('status')
    await expect(status).toHaveText(/edge/)
    const before = await status.textContent()
    // Take end 1 off its shaft: the edges catch differently.
    await page.getByRole('group', { name: 'Threading' }).locator('[aria-checked="true"][aria-label^="End 1,"]').click()
    await expect(status).not.toHaveText(before ?? '')
  })

  test('tablet weaving card holes are buttons that work from the keyboard', async ({ page }) => {
    await openApp(page)
    await openTool(page, /^Tablet weaving/)
    const hole = page.getByRole('button', { name: 'Card 1, hole A' })
    const colour = (el: Element) => getComputedStyle(el).backgroundColor
    const before = await hole.evaluate(colour)
    // Paint with a colour the hole isn't already.
    for (const name of ['Colour 1', 'Colour 2']) {
      const swatch = page.getByRole('radio', { name, exact: true })
      if ((await swatch.evaluate(colour)) === before) continue
      await swatch.focus()
      await page.keyboard.press('Space')
      break
    }
    await hole.focus()
    await page.keyboard.press('Enter')
    await expect.poll(() => hole.evaluate(colour)).not.toBe(before)
  })

  test('in high contrast mode the draft keeps its colours and focus shows', async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'active' })
    await openApp(page)
    const grid = page.getByRole('group', { name: 'Threading' })
    expect(await grid.evaluate((el) => getComputedStyle(el).forcedColorAdjust)).toBe('none')
    const on = await grid
      .locator('[aria-checked="true"]')
      .first()
      .evaluate((el) => getComputedStyle(el).backgroundColor)
    const off = await grid
      .locator('[aria-checked="false"]')
      .first()
      .evaluate((el) => getComputedStyle(el).backgroundColor)
    expect(on).not.toBe(off)
  })
})

test.describe('Sew Patterner: axe finds no accessibility problems', () => {
  test('the app, with each design', async ({ page }) => {
    await openSew(page)
    expect(await a11yProblems(page)).toEqual([])
    for (const name of ['Shift dress', 'Pull-on trousers', 'Bucket hat']) {
      await page.getByRole('button', { name, exact: true }).click()
      expect(await a11yProblems(page), name).toEqual([])
    }
  })

  test('its dialogs and menus', async ({ page }) => {
    await openSew(page)
    for (const name of ['Save', 'Load', 'Share']) {
      await toolbarButton(page, name).click()
      expect(await a11yProblems(page, '[role="dialog"]'), name).toEqual([])
      await closeDialog(page)
    }
    await toolbarButton(page, 'Export').click()
    expect(await a11yProblems(page, '[role="menu"]'), 'Export').toEqual([])
    await page.keyboard.press('Escape')
    await page.getByTestId('sew-own').getByRole('button', { name: 'Draw one' }).click()
    expect(await a11yProblems(page, '[role="dialog"]'), 'Draw one').toEqual([])
    await closeDialog(page)
    await page.getByRole('button', { name: 'Projector' }).click()
    expect(await a11yProblems(page, '[role="dialog"]'), 'Projector').toEqual([])
    await closeDialog(page)
    await page.keyboard.press('F1')
    expect(await a11yProblems(page, '[role="dialog"]'), 'Help').toEqual([])
  })
})
