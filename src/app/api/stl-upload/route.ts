import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  const buffer = await request.arrayBuffer()
  if (buffer.byteLength === 0) {
    return Response.json({ error: 'Empty file' }, { status: 400 })
  }

  const filename = `${Date.now()}-${crypto.randomUUID()}.stl`
  const supabase = createAdminClient()

  const { error } = await supabase.storage
    .from('stl-files')
    .upload(filename, buffer, {
      contentType: 'application/octet-stream',
      upsert: false,
    })

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json({ stl_path: filename })
}
