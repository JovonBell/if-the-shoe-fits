import { z } from 'zod'

export const LeadFormSchema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  email: z.email('Please enter a valid email address'),
  phone: z.string().optional(),
  current_shoe_size: z.string().optional(),
})

export type LeadFormData = z.infer<typeof LeadFormSchema>

// Schema for the full scan insert (lead data + measurements + STL path)
export const ScanInsertSchema = z.object({
  first_name: z.string().min(1),
  email: z.email(),
  phone: z.string().optional(),
  current_shoe_size: z.string().optional(),

  left_length_mm: z.number().nullable().optional(),
  left_width_mm: z.number().nullable().optional(),
  left_arch_mm: z.number().nullable().optional(),
  left_toe_box_mm: z.number().nullable().optional(),
  left_heel_mm: z.number().nullable().optional(),

  right_length_mm: z.number().nullable().optional(),
  right_width_mm: z.number().nullable().optional(),
  right_arch_mm: z.number().nullable().optional(),
  right_toe_box_mm: z.number().nullable().optional(),
  right_heel_mm: z.number().nullable().optional(),

  stl_path: z.string().nullable().optional(),
})

export type ScanInsert = z.infer<typeof ScanInsertSchema>
