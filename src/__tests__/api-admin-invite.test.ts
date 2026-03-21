/**
 * POST /api/admin/invite tests — covers MFR-05
 */
import { describe, test } from 'vitest'

describe('POST /api/admin/invite', () => {
  // MFR-05: Invite-only portal access
  test.todo('calls inviteUserByEmail with provided email')
  test.todo('returns 401 for unauthenticated request')
  test.todo('returns 400 for missing or invalid email')
  test.todo('returns 500 when invite fails')
  test.todo('uses admin client (service_role) for invite')
})
