import { expect, test } from '@playwright/test'

// /map has no getStaticProps/getServerSideProps — all data (ward boundaries,
// corporation stats) is fetched client-side, and lib/opencity.ts falls back
// to a bundled GeoJSON file when the live OpenCity source is unreachable. So
// unlike most other pages here, this one needs neither a database nor
// network access to render.
test.describe('map explorer', () => {
  test('loads the layered map with its search box and base layer controls', async ({ page }) => {
    await page.goto('/map')
    await expect(page).toHaveTitle('Lucknow Map Explorer')
    await expect(page.locator('.leaflet-container')).toBeVisible()
    await expect(page.getByLabel('Search the map')).toBeVisible()
    await expect(page.getByRole('group', { name: 'Base map' })).toBeVisible()
  })

  test('deep-links to a ward via the ?ward= query param', async ({ page }) => {
    await page.goto('/map?ward=Byrathi')
    await expect(page.locator('.leaflet-container')).toBeVisible()
  })
})
