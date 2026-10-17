import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  async redirects() {
    return [
      // The Work pillar was replaced by Palette Media; Work > Clients has no equivalent
      { source: '/work/clients/:path*', destination: '/palette', permanent: false },
      { source: '/work', destination: '/palette', permanent: false },
      { source: '/work/:path*', destination: '/palette/:path*', permanent: false },
    ]
  },
  async headers() {
    return [
      {
        // Ensure the service worker is always fresh and served as JS
        source: '/sw.js',
        headers: [
          { key: 'Content-Type',  value: 'application/javascript; charset=utf-8' },
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Content-Security-Policy', value: "default-src 'self'; script-src 'self'" },
        ],
      },
    ]
  },
};

export default nextConfig;
