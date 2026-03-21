/**
 * StatusSelect / ScanTable status column tests — covers MFR-04 (UI)
 */
import { describe, test } from 'vitest'

describe('StatusSelect / ScanTable status column', () => {
  // MFR-04: Status dropdown renders all 4 options
  test.todo('renders select with new, in-progress, completed, shipped options')
  test.todo('displays current status as selected value')
  test.todo('calls onStatusChange with scan id and new status on change')
})
