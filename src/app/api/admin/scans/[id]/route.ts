import { createClient } from '@/lib/supabase/server'

const VALID_STATUSES = ['new', 'in-progress', 'completed', 'shipped'] as const

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // Auth check
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const body = await request.json()
  const { status } = body

  // Validate status value
  if (!VALID_STATUSES.includes(status)) {
    return Response.json(
      { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` },
      { status: 400 }
    )
  }

  const { error } = await supabase
    .from('scans')
    .update({ status })
    .eq('id', id)

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json({ success: true })
}
