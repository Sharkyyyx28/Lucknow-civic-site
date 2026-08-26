import { expect, test } from '@playwright/test'

// index.tsx sources its data from local markdown (lib/api.ts) rather than
// the database, so this page — unlike most of the site — renders the same
// with or without a DB behind the dev server.
test.describe('homepage', () => {
  test('loads with the expected title and hero', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle('Lucknow civic data')
    await expect(page.getByRole('link', { name: /lucknow/i }).first()).toBeVisible()
  })

  test('primary nav links to the map explorer', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: /map/i }).click()
    await expect(page).toHaveURL(/\/map/)
    await expect(page).toHaveTitle('Lucknow Map Explorer')
  })
})
