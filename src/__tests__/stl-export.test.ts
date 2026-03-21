/**
 * STL export tests — covers 3DM-04
 */
import { describe, test } from 'vitest'

describe('exportFootSTL', () => {
  // 3DM-04: App exports 3D foot model as downloadable STL file
  test.todo('returns a non-empty ArrayBuffer')
  test.todo('produces valid binary STL header (80 bytes + triangle count)')
  test.todo('applies measurement deformation before export')
})
