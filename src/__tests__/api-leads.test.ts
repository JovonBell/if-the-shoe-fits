/**
 * POST /api/leads tests — covers LEAD-02, LEAD-03
 */
import { describe, test } from 'vitest'

describe('POST /api/leads', () => {
  // LEAD-02: Measurements + contact info + STL reference persisted
  test.todo('inserts valid scan data into scans table')
  test.todo('returns 201 on successful insert')

  // LEAD-03: Complete customer record
  test.todo('includes all measurement fields in insert')
  test.todo('includes stl_path in insert')

  // Validation
  test.todo('returns 400 for invalid request body')
  test.todo('returns 400 when required fields missing')
})
