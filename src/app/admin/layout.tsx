import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export const metadata = {
  title: 'Admin Portal — If The Shoe Fits',
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Double-check auth (middleware handles redirect, but layout guards as defense-in-depth)
  if (!user) {
    redirect('/admin/login')
  }

  return (
    <div className="min-h-dvh bg-cream">
      <header className="bg-white border-b border-dark/10 px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="font-heading text-lg font-bold text-dark">If The Shoe Fits</h1>
          <p className="font-body text-xs text-dark/50">Manufacturer Portal</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-body text-sm text-dark/60 hidden sm:inline">{user.email}</span>
          <form action="/api/auth/signout" method="post">
            <button
              type="submit"
              className="font-heading text-sm font-semibold text-maroon hover:text-maroon/70 transition-colors cursor-pointer"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>
      <main className="p-4 md:p-6 max-w-7xl mx-auto">
        {children}
      </main>
    </div>
  )
}
