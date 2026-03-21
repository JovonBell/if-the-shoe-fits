/**
 * ScanTable tests — covers MFR-02
 */
import { describe, test } from 'vitest'

describe('ScanTable', () => {
  // MFR-02: Portal displays list of customer scans
  test.todo('renders scan rows with name, email, date, status columns')
  test.todo('displays "No scans yet" when scans array is empty')
  test.todo('sorts by created_at descending by default')
  test.todo('filters scans by text search on name/email')
  test.todo('filters scans by status dropdown')
  test.todo('calls onStatusChange when status dropdown changes')
  test.todo('shows download link only for scans with stl_path')
})
