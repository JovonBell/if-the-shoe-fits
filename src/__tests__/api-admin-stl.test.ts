/**
 * GET /api/admin/scans/[id]/stl tests — covers MFR-03
 */
import { describe, test } from 'vitest'

describe('GET /api/admin/scans/[id]/stl', () => {
  // MFR-03: Portal allows viewing and downloading STL files
  test.todo('returns signed URL for scan with stl_path')
  test.todo('returns 404 when scan has no stl_path')
  test.todo('returns 404 when scan does not exist')
  test.todo('returns 401 for unauthenticated request')
  test.todo('signed URL has 300-second expiry')
})
