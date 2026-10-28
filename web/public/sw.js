/* Minimal service worker so Android Chrome can offer "Install app". */
const CACHE = 'ymc-shell-v1';

self.addEventListener('install', event => {
	event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', event => {
	event.waitUntil(
		caches
			.keys()
			.then(keys =>
				Promise.all(
					keys.filter(key => key !== CACHE).map(key => caches.delete(key)),
				),
			)
			.then(() => self.clients.claim()),
	);
});

self.addEventListener('fetch', event => {
	const {request} = event;
	if (request.method !== 'GET') {
		return;
	}

	const url = new URL(request.url);
	if (url.pathname === '/ws' || url.pathname.startsWith('/audio')) {
		return;
	}

	event.respondWith(fetch(request));
});
