// Service worker mínimo — habilita a instalação como app (PWA).
// Não faz cache (pass-through), então nunca serve conteúdo desatualizado.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {});
