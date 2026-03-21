'use client'

import { useState } from 'react'
import { ScanTable } from '@/components/admin/ScanTable'
import { InviteForm } from '@/components/admin/InviteForm'

interface Scan {
  id: string
  created_at: string
  first_name: string
  email: string
  phone: string | null
  current_shoe_size: string | null
  left_length_mm: number | null
  left_width_mm: number | null
  right_length_mm: number | null
  right_width_mm: number | null
  stl_path: string | null
  status: 'new' | 'in-progress' | 'completed' | 'shipped'
}

interface Props {
  initialScans: Scan[]
}

export function AdminDashboard({ initialScans }: Props) {
  const [scans, setScans] = useState<Scan[]>(initialScans)

  async function handleStatusChange(id: string, status: string) {
    // Optimistic update
    setScans(prev =>
      prev.map(s => s.id === id ? { ...s, status: status as Scan['status'] } : s)
    )

    const res = await fetch(`/api/admin/scans/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })

    if (!res.ok) {
      // Revert on failure
      setScans(prev =>
        prev.map(s => s.id === id ? { ...s, status: initialScans.find(is => is.id === id)?.status ?? 'new' } : s)
      )
    }
  }

  async function handleDownloadSTL(id: string) {
    const res = await fetch(`/api/admin/scans/${id}/stl`)
    if (!res.ok) return
    const { url } = await res.json()
    window.open(url, '_blank')
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="font-heading text-2xl font-bold text-dark">Customer Scans</h2>
        <p className="font-body text-sm text-dark/60 mt-1">{scans.length} total scan{scans.length !== 1 ? 's' : ''}</p>
      </div>
      <ScanTable
        scans={scans}
        onStatusChange={handleStatusChange}
        onDownloadSTL={handleDownloadSTL}
      />

      {/* Team management */}
      <div className="mt-8">
        <InviteForm />
      </div>
    </div>
  )
}
