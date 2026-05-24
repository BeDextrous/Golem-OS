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
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className="min-h-screen bg-stone-50 text-stone-900 dark:bg-stone-900 dark:text-stone-50 antialiased font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
