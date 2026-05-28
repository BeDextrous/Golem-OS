import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: 'Golem OS',
  description: 'Your personal life operating system',
  // PWA: appleWebApp enables "Add to Home Screen" on iOS
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Golem OS',
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head>
        {/* PWA theme colours — light/dark matched to app background */}
        <meta name="theme-color" media="(prefers-color-scheme: light)" content="#fafaf9" />
        <meta name="theme-color" media="(prefers-color-scheme: dark)"  content="#1c1917" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body className="min-h-screen bg-stone-50 text-stone-900 dark:bg-stone-900 dark:text-stone-50 antialiased font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
