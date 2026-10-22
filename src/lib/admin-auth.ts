import 'server-only'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function requireAdmin() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    redirect('/admin')
  }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin')
  const { data: role, error } = await supabase.from('admin_users').select('user_id').eq('user_id', user.id).maybeSingle()
  if (error || !role) redirect('/admin?error=unauthorized')
  return { supabase, user }
}
