// Runs client-side before React hydration (Next.js 16+ native hook)
// Registers the Golem service worker (static-asset cache + PWA install support)

if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  if (process.env.NODE_ENV === 'production') {
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
  } else {
    // Dev chunk URLs are not content-hashed, so a cache-first worker would serve stale code
    navigator.serviceWorker.getRegistrations()
      .then((regs) => regs.forEach((r) => r.unregister()))
      .catch(() => {})
  }
}
