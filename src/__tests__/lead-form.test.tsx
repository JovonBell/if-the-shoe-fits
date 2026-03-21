/**
 * LeadForm tests — covers LEAD-01
 */
import { describe, test } from 'vitest'

describe('LeadForm', () => {
  // LEAD-01: User submits contact form after seeing results
  test.todo('renders first_name and email as required fields')
  test.todo('renders phone and current_shoe_size as optional fields')
  test.todo('shows validation error when first_name is empty')
  test.todo('shows validation error when email is invalid')
  test.todo('calls onSubmitSuccess after successful submission')
  test.todo('disables submit button while submitting')
})

describe('LeadFormSchema', () => {
  // LEAD-01: Zod schema validation
  test.todo('accepts valid form data with all fields')
  test.todo('accepts valid form data with only required fields')
  test.todo('rejects empty first_name')
  test.todo('rejects invalid email')
})
