import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AdminLogin } from '@/components/admin-login'

export default async function AdminPage() {
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: role } = await supabase.from('admin_users').select('user_id').eq('user_id', user.id).maybeSingle()
      if (role) redirect('/admin/dashboard')
    }
  }
  return <AdminLogin />
}
