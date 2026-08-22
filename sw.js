"use strict";

/* Service worker: network-first for the app shell (updates land immediately),
* cache fallback when offline. Icons stay cache-first. */
const CACHE_NAME = 'corner-puzzles-v22';
const SHELL = [
    './', './index.html', './style.css', './manifest.json',
    './js/game.js', './js/puzzles.js', './js/solver.js',
    './js/view.js', './js/controller.js', './js/hint_worker.js'
];
const ICONS = ['./icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png'];

self.addEventListener('install', function (event) {
    event.waitUntil(
        caches.open(CACHE_NAME).then(function (cache) {
            return cache.addAll(SHELL.concat(ICONS).map(url => new Request(url, { cache: 'no-cache' })));
        }).then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', function (event) {
    event.waitUntil(
        caches.keys().then(function (names) {
            return Promise.all(names.map(n => n === CACHE_NAME ? null : caches.delete(n)));
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', function (event) {
    const url = new URL(event.request.url);
    if (url.origin !== location.origin) return;
    const isIcon = ICONS.some(i => url.pathname.endsWith(i));
    if (isIcon) {
        // cache-first for icons
        event.respondWith(caches.match(event.request).then(r => r || fetch(event.request)));
        return;
    }
    // network-first: fresh when online, cached copy when offline.
    // cache:'no-cache' bypasses the browser's heuristic HTTP cache, which can
    // otherwise serve stale files after a server update.
    event.respondWith(
        fetch(new Request(event.request, { cache: 'no-cache' })).then(function (response) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then(c => c.put(event.request, copy)).catch(() => {});
            return response;
        }).catch(function () {
            return caches.match(event.request).then(r => r ||
                caches.match('./index.html').then(idx => idx || Response.error()));
        })
    );
});
