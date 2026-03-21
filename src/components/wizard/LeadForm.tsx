'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { LeadFormSchema, type LeadFormData } from '@/lib/schemas/lead'
import { exportFootSTL } from '@/lib/stl/export'
import type { MeasurementResult } from '@/lib/cv/types'
import type { ScanSession } from '@/lib/cv/session'

interface Props {
  session: ScanSession
  latestResult: MeasurementResult
  onSubmitSuccess: () => void
}

export function LeadForm({ session, latestResult, onSubmitSuccess }: Props) {
  const [formData, setFormData] = useState<LeadFormData>({
    first_name: '',
    email: '',
    phone: '',
    current_shoe_size: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    // Clear field error on change
    if (errors[name]) {
      setErrors(prev => {
        const next = { ...prev }
        delete next[name]
        return next
      })
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitError(null)

    // Validate with Zod
    const parsed = LeadFormSchema.safeParse(formData)
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {}
      for (const issue of parsed.error.issues) {
        const field = issue.path[0]
        if (typeof field === 'string' && !fieldErrors[field]) {
          fieldErrors[field] = issue.message
        }
      }
      setErrors(fieldErrors)
      return
    }

    setSubmitting(true)

    try {
      // Step 1: Export STL (uses latest result measurements)
      const stlBuffer = await exportFootSTL(latestResult)

      // Step 2: Upload STL to storage
      const stlRes = await fetch('/api/stl-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/octet-stream' },
        body: stlBuffer,
      })
      if (!stlRes.ok) {
        throw new Error('Failed to upload 3D model')
      }
      const { stl_path } = await stlRes.json()

      // Step 3: Build measurement data from session
      const left = session.getResult('left')
      const right = session.getResult('right')

      const scanData = {
        ...parsed.data,
        left_length_mm: left?.length_mm ?? null,
        left_width_mm: left?.width_mm ?? null,
        left_arch_mm: left?.arch_mm ?? null,
        left_toe_box_mm: left?.toe_box_mm ?? null,
        left_heel_mm: left?.heel_mm ?? null,
        right_length_mm: right?.length_mm ?? null,
        right_width_mm: right?.width_mm ?? null,
        right_arch_mm: right?.arch_mm ?? null,
        right_toe_box_mm: right?.toe_box_mm ?? null,
        right_heel_mm: right?.heel_mm ?? null,
        stl_path,
      }

      // Step 4: Insert lead record
      const leadRes = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(scanData),
      })
      if (!leadRes.ok) {
        throw new Error('Failed to save your information')
      }

      onSubmitSuccess()
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  const inputClasses =
    'w-full px-4 py-3 rounded-lg border border-dark/20 bg-white font-body text-base text-dark placeholder:text-dark/40 focus:outline-none focus:ring-2 focus:ring-maroon focus:border-transparent min-h-[44px]'
  const labelClasses = 'block font-heading text-sm font-semibold text-dark mb-1'
  const errorClasses = 'text-sm text-red-600 mt-1 font-body'

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <h2 className="font-heading text-xl font-bold text-dark">
        Get your custom fit started
      </h2>
      <p className="font-body text-sm text-dark/70">
        Share your details and download your 3D foot model.
      </p>

      {/* First name (required) */}
      <div>
        <label htmlFor="first_name" className={labelClasses}>
          First name *
        </label>
        <input
          id="first_name"
          name="first_name"
          type="text"
          required
          value={formData.first_name}
          onChange={handleChange}
          placeholder="Your first name"
          className={inputClasses}
        />
        {errors.first_name && <p className={errorClasses}>{errors.first_name}</p>}
      </div>

      {/* Email (required) */}
      <div>
        <label htmlFor="email" className={labelClasses}>
          Email *
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          value={formData.email}
          onChange={handleChange}
          placeholder="you@example.com"
          className={inputClasses}
        />
        {errors.email && <p className={errorClasses}>{errors.email}</p>}
      </div>

      {/* Phone (optional) */}
      <div>
        <label htmlFor="phone" className={labelClasses}>
          Phone{' '}
          <span className="font-normal text-dark/50">(optional)</span>
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          value={formData.phone}
          onChange={handleChange}
          placeholder="(555) 123-4567"
          className={inputClasses}
        />
      </div>

      {/* Current shoe size (optional) */}
      <div>
        <label htmlFor="current_shoe_size" className={labelClasses}>
          Current shoe size{' '}
          <span className="font-normal text-dark/50">(optional)</span>
        </label>
        <input
          id="current_shoe_size"
          name="current_shoe_size"
          type="text"
          value={formData.current_shoe_size}
          onChange={handleChange}
          placeholder="e.g. US 8, EU 39"
          className={inputClasses}
        />
      </div>

      {submitError && (
        <p className="text-sm text-red-600 font-body bg-red-50 px-4 py-2 rounded-lg">
          {submitError}
        </p>
      )}

      <Button type="submit" variant="primary" disabled={submitting}>
        {submitting ? 'Saving...' : 'Submit & Download 3D Model'}
      </Button>
    </form>
  )
}
