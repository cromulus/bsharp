import { test, expect } from '@playwright/test';
import { openProfilePanel, closeMenu } from './helpers';

test('visual steps guide listening and choosing without covering the pads', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('[data-game-step=listen]')).toHaveAttribute('aria-current', 'step');
  await expect(page.locator('#onboarding-overlay')).toHaveCount(0);
  await page.locator('#play-button').click();
  await expect(page.locator('[data-game-step=choose]')).toHaveAttribute('aria-current', 'step');
  await expect(page.locator('#red-flag')).toBeVisible();
});

test('motion hints can be disabled without removing the picture guide', async ({ page }) => {
  await page.goto('/');
  await openProfilePanel(page);
  await page.locator('#enable_onboarding_hints_setting').uncheck();
  await page.locator('#submit-changes-button').click();
  await closeMenu(page);
  await expect(page.locator('body')).not.toHaveClass(/gentle-hints/);
  await expect(page.locator('.step-pictures')).toBeVisible();
});
