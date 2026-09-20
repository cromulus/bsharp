import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { test, expect } from '@playwright/test';
import { openProfilePanel } from './helpers';

test('failed playback does not accept an unheard answer and can be retried', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    const play = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function () {
      HTMLMediaElement.prototype.play = play;
      return Promise.reject(new DOMException('Not allowed', 'NotAllowedError'));
    };
  });
  await page.locator('#play-button').click();
  await expect(page.locator('#audio-status')).toContainText('Tap Play');
  await page.locator('#red-flag .flag').click();
  await expect(page.locator('#next-chord')).toHaveClass(/deactivated/);
  await page.locator('#play-button').click();
  await expect(page.locator('#audio-status')).toBeEmpty();
});

test('installed cache supports a cold offline launch and audio byte ranges', async ({ page }) => {
  const server = createServer(async (request, response) => {
    try {
      const path = new URL(request.url!, 'http://localhost').pathname.replace(/^\/practice/, '');
      const file = resolve('dist', '.' + (path === '/' ? '/index.html' : path));
      const types: Record<string, string> = { js: 'text/javascript', html: 'text/html', css: 'text/css', mp3: 'audio/mpeg' };
      response.setHeader('Content-Type', types[file.split('.').pop()!] || 'application/octet-stream');
      response.end(await readFile(file));
    } catch { response.writeHead(404).end(); }
  });
  await new Promise<void>(done => server.listen(0, '127.0.0.1', done));
  const port = (server.address() as { port: number }).port;
  try {
    await page.goto(`http://127.0.0.1:${port}/practice/`);
    await expect(page.locator('#offline-status')).toHaveText('Ready for offline practice', { timeout: 60000 });
    await page.reload();
    // Stop the real origin: also tests WebKit, whose emulated offline reload
    // can fail inside Playwright before the service worker handles navigation.
    server.closeAllConnections();
    await new Promise<void>(done => server.close(() => done()));
    await page.reload();
    await expect(page.locator('#play-button')).toBeVisible();
    const result = await page.evaluate(async () => {
      const response = await fetch('static/chords/piano/ceg_red_short.mp3', { headers: { Range: 'bytes=0-99' } });
      return { status: response.status, size: (await response.arrayBuffer()).byteLength };
    });
    expect(result).toEqual({ status: 206, size: 100 });
    await page.evaluate(() => {
      const play = HTMLMediaElement.prototype.play;
      HTMLMediaElement.prototype.play = function () {
        return play.call(this).then(() => { (window as any).__offlineAudioStarted = true; });
      };
    });
    await page.locator('#play-button').click();
    await expect.poll(() => page.evaluate(() => (window as any).__offlineAudioStarted)).toBe(true);
    await expect(page.locator('#audio-status')).toBeEmpty();
  } finally { server.closeAllConnections(); server.close(); }
});

test('backup import previews profiles and keeps existing progress', async ({ page }) => {
  await page.goto('/');
  const backup = await page.evaluate(() => ({ state: JSON.parse(localStorage.getItem('bsharp_state')!), history: {} }));
  backup.state.profiles['100'].name = 'CIM Child';
  await openProfilePanel(page);
  await page.locator('.pwa-settings summary').click();
  await page.locator('#import-progress').setInputFiles({ name: 'cim.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(backup)) });
  await expect(page.locator('#import-status')).toContainText('CIM Child');
  expect(await page.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('bsharp_state')!).profiles))).toHaveLength(1);
  await page.locator('#apply-import').click();
  await expect.poll(() => page.evaluate(() => Object.values(JSON.parse(localStorage.getItem('bsharp_state')!).profiles).map((p: any) => p.name))).toEqual(['Guest', 'CIM Child']);
});

test('unavailable storage reports unsaved progress without breaking practice', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => { throw new DOMException('Full', 'QuotaExceededError'); };
  });
  await page.goto('/');
  await expect(page.locator('#storage-status')).toContainText('not being saved');
  await page.locator('#play-button').click();
  await expect(page.locator('#audio-status')).toBeEmpty();
  expect(errors).toEqual([]);
});

test('audio retries after a failed network request', async ({ page }) => {
  await page.route('**/static/chords/**', route => route.abort());
  await page.goto('/');
  await page.locator('#play-button').click();
  await expect(page.locator('#audio-status')).toContainText('Tap Play');
  await page.unroute('**/static/chords/**');
  await page.evaluate(() => {
    const play = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function () {
      return play.call(this).then(() => { (window as any).__retryStarted = true; });
    };
  });
  await page.locator('#play-button').click();
  await expect.poll(() => page.evaluate(() => (window as any).__retryStarted)).toBe(true);
  await expect(page.locator('#audio-status')).toBeEmpty();
});
