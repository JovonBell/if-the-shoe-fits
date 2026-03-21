import { createAdminClient } from '@/lib/supabase/admin'
import { ScanInsertSchema } from '@/lib/schemas/lead'

export async function POST(request: Request) {
  const body = await request.json()
  const parsed = ScanInsertSchema.safeParse(body)

  if (!parsed.success) {
    return Response.json(
      { error: 'Validation failed', details: parsed.error.issues },
      { status: 400 }
    )
  }

  const supabase = createAdminClient()
  const { error } = await supabase.from('scans').insert(parsed.data)

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json({ success: true }, { status: 201 })
}
