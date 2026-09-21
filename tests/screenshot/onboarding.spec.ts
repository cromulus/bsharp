import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => { (window as any).__bsharp_test_deterministic_color = 'red'; });
  await page.goto('/');
  await page.emulateMedia({ reducedMotion: 'reduce' });
});

test('picture guide and large listening button', async ({ page }) => {
  await expect(page).toHaveScreenshot('child-ready.png');
});

test('gentle correction highlights the sound to learn', async ({ page }) => {
  await page.locator('#play-button').click();
  await expect(page.locator('body')).toHaveAttribute('data-stage', 'choose');
  await page.locator('#yellow-flag').click();
  await expect(page.locator('body')).toHaveAttribute('data-stage', 'correction');
  await expect(page).toHaveScreenshot('child-correction.png');
});

test('unscored exploration has its own visual state', async ({ page }) => {
  await page.locator('#explore-button').click();
  await expect(page).toHaveScreenshot('child-explore.png');
});
