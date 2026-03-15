import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_super_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_super_admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const [usersRes, projectsRes, proRes] = await Promise.all([
    admin.from('profiles').select('id', { count: 'exact', head: true }),
    admin.from('projects').select('id', { count: 'exact', head: true }),
    admin.from('profiles').select('id', { count: 'exact', head: true }).eq('plan_tier', 'professional'),
  ])

  // Recent signups (last 10)
  const { data: recentUsers } = await admin
    .from('profiles')
    .select('id, full_name, email, plan_tier, created_at')
    .order('created_at', { ascending: false })
    .limit(10)

  return NextResponse.json({
    totalUsers: usersRes.count || 0,
    totalProjects: projectsRes.count || 0,
    proSubscribers: proRes.count || 0,
    recentUsers: recentUsers || [],
  })
}
