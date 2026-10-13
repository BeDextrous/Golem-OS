import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { Suspense } from 'react'
import { GlobalNav } from '@/components/layout/global-nav'
import { GoogleNotice } from '@/components/layout/google-notice'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen flex flex-col">
      <GlobalNav email={user.email ?? null} />
      <Suspense fallback={null}><GoogleNotice /></Suspense>
      <main className="flex-1 pb-[calc(3.5rem+env(safe-area-inset-bottom))] sm:pb-0">
        {children}
      </main>
    </div>
  )
}
