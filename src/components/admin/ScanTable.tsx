'use client'

import { useState, useMemo } from 'react'

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

type SortField = 'created_at' | 'first_name' | 'email' | 'status'
type SortDir = 'asc' | 'desc'

interface Props {
  scans: Scan[]
  onStatusChange: (id: string, status: string) => void
  onDownloadSTL: (id: string) => void
}

const STATUS_COLORS: Record<string, string> = {
  new: 'bg-blue-100 text-blue-800',
  'in-progress': 'bg-yellow-100 text-yellow-800',
  completed: 'bg-green-100 text-green-800',
  shipped: 'bg-purple-100 text-purple-800',
}

export function ScanTable({ scans, onStatusChange, onDownloadSTL }: Props) {
  const [sortField, setSortField] = useState<SortField>('created_at')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [filterText, setFilterText] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  const filteredAndSorted = useMemo(() => {
    let result = [...scans]

    // Text filter (name or email)
    if (filterText) {
      const lower = filterText.toLowerCase()
      result = result.filter(s =>
        s.first_name.toLowerCase().includes(lower) ||
        s.email.toLowerCase().includes(lower)
      )
    }

    // Status filter
    if (filterStatus !== 'all') {
      result = result.filter(s => s.status === filterStatus)
    }

    // Sort
    result.sort((a, b) => {
      let cmp = 0
      if (sortField === 'created_at') {
        cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      } else {
        const aVal = a[sortField] ?? ''
        const bVal = b[sortField] ?? ''
        cmp = String(aVal).localeCompare(String(bVal))
      }
      return sortDir === 'asc' ? cmp : -cmp
    })

    return result
  }, [scans, filterText, filterStatus, sortField, sortDir])

  const sortIndicator = (field: SortField) =>
    sortField === field ? (sortDir === 'asc' ? ' \u2191' : ' \u2193') : ''

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <input
          type="text"
          placeholder="Search name or email..."
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
          className="flex-1 px-4 py-2 rounded-lg border border-dark/20 font-body text-sm text-dark placeholder:text-dark/40 focus:outline-none focus:ring-2 focus:ring-maroon focus:border-transparent"
        />
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2 rounded-lg border border-dark/20 font-body text-sm text-dark bg-white focus:outline-none focus:ring-2 focus:ring-maroon cursor-pointer"
        >
          <option value="all">All statuses</option>
          <option value="new">New</option>
          <option value="in-progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="shipped">Shipped</option>
        </select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto bg-white rounded-xl shadow-sm">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-dark/10">
              <th className="px-4 py-3 font-heading text-xs font-semibold text-dark/60 uppercase tracking-wider cursor-pointer hover:text-dark" onClick={() => handleSort('created_at')}>
                Date{sortIndicator('created_at')}
              </th>
              <th className="px-4 py-3 font-heading text-xs font-semibold text-dark/60 uppercase tracking-wider cursor-pointer hover:text-dark" onClick={() => handleSort('first_name')}>
                Name{sortIndicator('first_name')}
              </th>
              <th className="px-4 py-3 font-heading text-xs font-semibold text-dark/60 uppercase tracking-wider cursor-pointer hover:text-dark" onClick={() => handleSort('email')}>
                Email{sortIndicator('email')}
              </th>
              <th className="px-4 py-3 font-heading text-xs font-semibold text-dark/60 uppercase tracking-wider">
                L (mm)
              </th>
              <th className="px-4 py-3 font-heading text-xs font-semibold text-dark/60 uppercase tracking-wider">
                R (mm)
              </th>
              <th className="px-4 py-3 font-heading text-xs font-semibold text-dark/60 uppercase tracking-wider cursor-pointer hover:text-dark" onClick={() => handleSort('status')}>
                Status{sortIndicator('status')}
              </th>
              <th className="px-4 py-3 font-heading text-xs font-semibold text-dark/60 uppercase tracking-wider">
                STL
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredAndSorted.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center font-body text-sm text-dark/50">
                  {scans.length === 0 ? 'No scans yet' : 'No matching scans'}
                </td>
              </tr>
            ) : (
              filteredAndSorted.map((scan) => (
                <tr key={scan.id} className="border-b border-dark/5 hover:bg-cream/50">
                  <td className="px-4 py-3 font-body text-sm text-dark whitespace-nowrap">
                    {new Date(scan.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 font-body text-sm text-dark font-medium">
                    {scan.first_name}
                  </td>
                  <td className="px-4 py-3 font-body text-sm text-dark">
                    {scan.email}
                  </td>
                  <td className="px-4 py-3 font-body text-xs text-dark/70 whitespace-nowrap">
                    {scan.left_length_mm != null
                      ? `${scan.left_length_mm} x ${scan.left_width_mm}`
                      : '\u2014'}
                  </td>
                  <td className="px-4 py-3 font-body text-xs text-dark/70 whitespace-nowrap">
                    {scan.right_length_mm != null
                      ? `${scan.right_length_mm} x ${scan.right_width_mm}`
                      : '\u2014'}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={scan.status}
                      onChange={(e) => onStatusChange(scan.id, e.target.value)}
                      className={`px-2 py-1 rounded-full text-xs font-heading font-semibold border-0 cursor-pointer ${STATUS_COLORS[scan.status]}`}
                    >
                      <option value="new">New</option>
                      <option value="in-progress">In Progress</option>
                      <option value="completed">Completed</option>
                      <option value="shipped">Shipped</option>
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    {scan.stl_path ? (
                      <button
                        onClick={() => onDownloadSTL(scan.id)}
                        className="font-heading text-xs font-semibold text-maroon hover:text-maroon/70 underline cursor-pointer"
                      >
                        Download
                      </button>
                    ) : (
                      <span className="font-body text-xs text-dark/30">\u2014</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Count */}
      <p className="mt-2 font-body text-xs text-dark/50">
        {filteredAndSorted.length} of {scans.length} scan{scans.length !== 1 ? 's' : ''}
      </p>
    </div>
  )
}
