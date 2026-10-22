import { requireAdmin } from '@/lib/admin-auth'
import { AdminDashboard } from '@/components/admin-dashboard'

export const dynamic = 'force-dynamic'

export default async function AdminDashboardPage() {
  await requireAdmin()
  return <AdminDashboard />
}
