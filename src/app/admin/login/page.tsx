'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function AdminLogin() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const supabase = createClient()
    const { error: authError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: false,  // CRITICAL: only pre-existing (invited) accounts can log in
        emailRedirectTo: `${window.location.origin}/api/auth/callback`,
      },
    })

    setLoading(false)

    if (authError) {
      setError(authError.message)
      return
    }

    setSent(true)
  }

  return (
    <main className="min-h-dvh bg-cream flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white rounded-xl shadow-sm p-8">
        <h1 className="font-heading text-2xl font-bold text-dark text-center mb-2">
          Manufacturer Portal
        </h1>
        <p className="font-body text-sm text-dark/60 text-center mb-6">
          If The Shoe Fits
        </p>

        {sent ? (
          <div className="text-center">
            <p className="font-heading text-lg font-semibold text-dark mb-2">Check your email</p>
            <p className="font-body text-sm text-dark/70">
              We sent a login link to <strong>{email}</strong>. Click the link to sign in.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label htmlFor="email" className="block font-heading text-sm font-semibold text-dark mb-1">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jolie@iftheshoefits.co"
                className="w-full px-4 py-3 rounded-lg border border-dark/20 bg-white font-body text-base text-dark placeholder:text-dark/40 focus:outline-none focus:ring-2 focus:ring-maroon focus:border-transparent min-h-[44px]"
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 font-body bg-red-50 px-4 py-2 rounded-lg">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center font-heading font-semibold rounded-full bg-maroon text-cream hover:bg-maroon/90 px-6 py-3 text-base min-h-[44px] transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? 'Sending...' : 'Send Login Link'}
            </button>
          </form>
        )}
      </div>
    </main>
  )
}
