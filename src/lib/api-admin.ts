import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function getAuthorizedAdmin() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { error: Response.json({ error: 'Supabase is not configured. Follow the setup instructions in README.md.' }, { status: 503 }) }
  }
  const sessionClient = await createClient()
  const { data: { user }, error: userError } = await sessionClient.auth.getUser()
  if (userError || !user) return { error: Response.json({ error: 'Sign in required.' }, { status: 401 }) }
  const { data: role, error } = await createAdminClient().from('admin_users').select('user_id').eq('user_id', user.id).maybeSingle()
  if (error || !role) return { error: Response.json({ error: 'Administrator access required.' }, { status: 403 }) }
  return { user }
}
