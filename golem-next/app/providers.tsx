'use client'
import { ThemeProvider } from 'next-themes'
import { Toaster } from 'react-hot-toast'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      {children}
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#fff',
            color: '#1E1C1A',
            border: '1px solid #DDD9D0',
            borderRadius: '8px',
            fontSize: '14px',
          },
        }}
      />
    </ThemeProvider>
  )
}
