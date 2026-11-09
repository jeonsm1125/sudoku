// 오프라인 실행용 서비스 워커. 파일을 고치면 CACHE 버전을 올려야 새 파일이 반영된다.
const CACHE = 'sudoku-v5';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png'];

// 설치할 때는 브라우저 HTTP 캐시(GitHub Pages max-age=600)를 건너뛰고 서버에서 직접 받는다.
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(SHELL.map(u => new Request(u, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

const save = (req, res) => {
  if (res && (res.ok || res.type === 'opaque')) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
  return res;
};

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  // 버전 확인 요청은 저장하지 않고 항상 서버로 보낸다
  if (new URL(req.url).pathname.endsWith('/version.json')) return;
  // 화면(HTML): 네트워크 우선, 오프라인일 때만 저장본
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req, { cache: 'no-cache' })
        .then(res => save(req, res))
        .catch(() => caches.match(req).then(hit => hit || caches.match('./index.html')))
    );
    return;
  }
  // 아이콘·웹폰트 등: 저장본 우선, 없으면 네트워크에서 받아 저장
  e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => save(req, res))));
});
