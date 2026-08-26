import { expect, test } from '@playwright/test'

// Station/line data here comes from a static import (lib/metroNetworkData.ts),
// not the database, so this renders the same regardless of DB availability.
test('metro network page renders with its title', async ({ page }) => {
  await page.goto('/metro-network')
  await expect(page).toHaveTitle(/Lucknow rail network/)
})
