// Runs client-side before React hydration (Next.js 16+ native hook)
// Used to register the Golem service worker for offline + PWA desktop support

if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((reg) => {
        // Check for updates on each page load
        reg.update().catch(() => {})
      })
      .catch(() => {
        // SW registration is non-critical — swallow silently
      })
  })
}
