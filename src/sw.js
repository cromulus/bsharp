// Cache a complete release, including every instrument, before offering offline use.
const PREFIX = `bsharp-${self.registration.scope}-`;
const CACHE = PREFIX + '__VERSION__';
const ASSETS = __ASSETS__;
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)));
  // Updates wait until all old windows close, avoiding mixed app releases.
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) {
      if (key.startsWith(PREFIX) && key !== CACHE) await caches.delete(key);
    }
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (!url.href.startsWith(self.registration.scope)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const response = event.request.mode === 'navigate'
      ? await cache.match('index.html')
      : await cache.match(event.request, { ignoreSearch: true });
    if (!response) return fetch(event.request);
    const range = event.request.headers.get('range');
    if (!range) return response;
    // Safari requests partial MP3 content, including while offline.
    const data = await response.arrayBuffer();
    const match = /^bytes=(\d*)-(\d*)$/.exec(range);
    if (!match || (!match[1] && !match[2])) return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${data.byteLength}` } });
    const start = match[1] ? Number(match[1]) : Math.max(0, data.byteLength - Number(match[2]));
    const end = match[1] && match[2] ? Math.min(Number(match[2]), data.byteLength - 1) : data.byteLength - 1;
    if (start > end || start >= data.byteLength) return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${data.byteLength}` } });
    const headers = new Headers(response.headers);
    headers.set('Content-Range', `bytes ${start}-${end}/${data.byteLength}`);
    headers.set('Content-Length', String(end - start + 1));
    headers.set('Accept-Ranges', 'bytes');
    return new Response(data.slice(start, end + 1), { status: 206, headers });
  })());
});
