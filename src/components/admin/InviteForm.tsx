'use client'

import { useState } from 'react'

export function InviteForm() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('sending')
    setErrorMsg('')

    const res = await fetch('/api/admin/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })

    if (!res.ok) {
      const { error } = await res.json()
      setErrorMsg(error || 'Failed to send invite')
      setStatus('error')
      return
    }

    setStatus('sent')
    setEmail('')

    // Reset to idle after 3 seconds
    setTimeout(() => setStatus('idle'), 3000)
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <h3 className="font-heading text-lg font-bold text-dark mb-1">Invite Team Member</h3>
      <p className="font-body text-sm text-dark/60 mb-4">
        Send a magic link invitation to grant portal access.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="cobbler@example.com"
          disabled={status === 'sending'}
          className="flex-1 px-4 py-2 rounded-lg border border-dark/20 font-body text-sm text-dark placeholder:text-dark/40 focus:outline-none focus:ring-2 focus:ring-maroon focus:border-transparent min-h-[44px]"
        />
        <button
          type="submit"
          disabled={status === 'sending'}
          className="inline-flex items-center justify-center font-heading font-semibold rounded-full border-2 border-maroon text-maroon bg-transparent hover:bg-maroon/5 px-6 py-2 text-sm min-h-[44px] transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap"
        >
          {status === 'sending' ? 'Sending...' : 'Send Invite'}
        </button>
      </form>

      {status === 'sent' && (
        <p className="mt-2 font-body text-sm text-green-600">Invitation sent successfully!</p>
      )}
      {status === 'error' && (
        <p className="mt-2 font-body text-sm text-red-600">{errorMsg}</p>
      )}
    </div>
  )
}
