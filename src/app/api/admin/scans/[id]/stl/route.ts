import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // Auth check
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const admin = createAdminClient()

  // Fetch scan to get stl_path
  const { data: scan, error: fetchError } = await admin
    .from('scans')
    .select('stl_path')
    .eq('id', id)
    .single()

  if (fetchError || !scan) {
    return Response.json({ error: 'Scan not found' }, { status: 404 })
  }

  if (!scan.stl_path) {
    return Response.json({ error: 'No STL file for this scan' }, { status: 404 })
  }

  // Generate signed URL (5-minute expiry)
  const { data, error: urlError } = await admin.storage
    .from('stl-files')
    .createSignedUrl(scan.stl_path, 300)

  if (urlError || !data) {
    return Response.json({ error: urlError?.message ?? 'Failed to generate download URL' }, { status: 500 })
  }

  return Response.json({ url: data.signedUrl })
}
