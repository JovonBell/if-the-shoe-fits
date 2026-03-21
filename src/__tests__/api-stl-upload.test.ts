/**
 * POST /api/stl-upload tests — covers 3DM-05
 */
import { describe, test } from 'vitest'

describe('POST /api/stl-upload', () => {
  // 3DM-05: STL file uploaded and stored in Supabase Storage
  test.todo('uploads buffer to stl-files bucket via admin client')
  test.todo('returns stl_path on successful upload')
  test.todo('returns 400 for empty body')
  test.todo('returns 500 when storage upload fails')
})
