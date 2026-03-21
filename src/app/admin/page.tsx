import { createClient } from '@/lib/supabase/server'
import { AdminDashboard } from './dashboard-client'

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: scans, error } = await supabase
    .from('scans')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="font-body text-red-600">Failed to load scans: {error.message}</p>
      </div>
    )
  }

  return <AdminDashboard initialScans={scans ?? []} />
}
