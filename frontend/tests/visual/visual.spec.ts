import { test, expect } from '@playwright/test';

test('visual snapshot of /visual-test', async ({ page }) => {
  await page.goto('/visual-test');
  await page.waitForLoadState('networkidle');
  await expect(page).toHaveScreenshot('visual-test.png', { animations: 'disabled', caret: 'hide', fullPage: true });
});
