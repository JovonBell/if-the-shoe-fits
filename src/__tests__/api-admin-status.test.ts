/**
 * PATCH /api/admin/scans/[id] tests — covers MFR-04
 */
import { describe, test } from 'vitest'

describe('PATCH /api/admin/scans/[id]', () => {
  // MFR-04: Order status management
  test.todo('updates status to valid value')
  test.todo('returns 400 for invalid status value')
  test.todo('accepts all 4 valid statuses: new, in-progress, completed, shipped')
  test.todo('returns 401 for unauthenticated request')
})
