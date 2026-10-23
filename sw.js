/* 베스트맘 제공기록 - 최신 버전 우선 Service Worker
 * 오프라인 캐시를 만들지 않으며, 개인정보/서명을 저장하지 않습니다.
 * 기존 링크(루트/index.html) 및 인증 세션은 그대로 유지합니다.
 */
'use strict';
const WORKER_VERSION = '20261023-app107';

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    // 이전 버전에서 만들어졌을 수 있는 베스트맘 전용 앱 캐시만 정리.
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k.startsWith('bestmom-app-')).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const scope = new URL(self.registration.scope);
  if (url.origin !== scope.origin || !url.pathname.startsWith(scope.pathname)) return;

  // 페이지와 앱 JS/CSS는 브라우저의 이전 HTTP 캐시를 이용하지 않고 가져옵니다.
  // Supabase API, 사용자 데이터, CDN 자산에는 관여하지 않습니다.
  const isAppAsset = req.mode === 'navigate' ||
    req.destination === 'document' ||
    req.destination === 'script' ||
    req.destination === 'style' ||
    /\.(?:html?|js|css)$/.test(url.pathname);
  if (!isAppAsset) return;

  event.respondWith(fetch(req, {cache: 'no-store'}));
});
