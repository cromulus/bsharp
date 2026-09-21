import { test, expect } from '@playwright/test';
import { openMenu, closeMenu } from './helpers';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => { (window as any).__bsharp_test_deterministic_color = 'red'; });
  await page.goto('/');
});

test('child screen keeps parent controls away and shows unobscured colors', async ({ page }) => {
  await expect(page.locator('#chord-selector')).not.toBeVisible();
  await expect(page.locator('#reset-button')).not.toBeVisible();
  await expect(page.locator('#stats-correct')).not.toBeVisible();
  await expect(page.locator('#red-flag')).toBeVisible();
  await expect(page.locator('#yellow-flag')).toBeVisible();
  await page.locator('#hamburger-link').click();
  await expect(page.locator('body')).not.toHaveClass(/parent-mode/);
  await openMenu(page);
  await expect(page.locator('#chord-selector')).toBeVisible();
  await closeMenu(page);
  await expect(page.locator('#chord-selector')).not.toBeVisible();
});

test('a missed answer is taught again without counting the correction twice', async ({ page }) => {
  await page.locator('#play-button').click();
  await expect(page.locator('body')).toHaveAttribute('data-stage', 'choose');
  await page.locator('#yellow-flag').click();
  await expect(page.locator('body')).toHaveAttribute('data-stage', 'correction');
  await expect(page.locator('#next-chord')).toBeDisabled();
  await expect(page.locator('#red-flag .flag')).toHaveClass(/flag-correct/);
  await page.locator('#red-flag').click();
  await expect(page.locator('body')).toHaveAttribute('data-stage', 'feedback');
  expect(await page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem('bsharp_state')!);
    return [state.profiles[100].stats.identifications, state.profiles[100].stats.correct];
  })).toEqual([1, 0]);
  await page.locator('#next-chord').click();
  await expect(page.locator('body')).toHaveAttribute('data-stage', 'choose');
});

test('exploring colors is unscored and returning to practice needs a fresh listen', async ({ page }) => {
  await page.locator('#explore-button').click();
  await page.locator('#red-flag').click();
  await page.locator('#yellow-flag').click();
  await expect(page.locator('#stats-total')).toHaveText('0');
  await page.locator('#explore-button').click();
  await expect(page.locator('body')).toHaveAttribute('data-stage', 'ready');
  await page.locator('#red-flag').click({ force: true });
  await expect(page.locator('#stats-total')).toHaveText('0');
});

test('session ends at its target and remains finished after reload', async ({ page }) => {
  await page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem('bsharp_state')!);
    state.profiles[100].target_number = 1;
    localStorage.setItem('bsharp_state', JSON.stringify(state));
  });
  await page.reload();
  await page.locator('#play-button').click();
  await expect(page.locator('body')).toHaveAttribute('data-stage', 'choose');
  await page.locator('#red-flag').click();
  await expect(page.locator('#next-chord')).toHaveAttribute('aria-label', 'Finish practice');
  await page.locator('#next-chord').click();
  await expect(page.locator('#session-finish')).toBeVisible();
  await expect(page.locator('#play-button')).not.toBeVisible();
  await page.reload();
  await expect(page.locator('#session-finish')).toBeVisible();
  await openMenu(page);
  await page.locator('#reset-button').click();
  await closeMenu(page);
  await expect(page.locator('#play-button')).toBeVisible();
  await expect(page.locator('#practice-progress')).toHaveAttribute('aria-valuenow', '0');
});

test('color pads work from the keyboard', async ({ page }) => {
  await page.locator('#play-button').press('Enter');
  await expect(page.locator('body')).toHaveAttribute('data-stage', 'choose');
  await page.locator('#red-flag').focus();
  await page.keyboard.press('Space');
  await expect(page.locator('#stats-correct')).toHaveText('1');
});
