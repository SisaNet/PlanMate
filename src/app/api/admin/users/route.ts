import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

async function checkSuperAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_super_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_super_admin) return null
  return user
}

export async function GET() {
  const user = await checkSuperAdmin()
  if (!user) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data: profiles, error } = await admin
    .from('profiles')
    .select('id, full_name, email, role, plan_tier, practice_id, is_super_admin, created_at')
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(profiles)
}

export async function PATCH(request: NextRequest) {
  const user = await checkSuperAdmin()
  if (!user) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const { userId, updates } = body

  if (!userId || !updates) {
    return NextResponse.json({ error: 'Missing userId or updates' }, { status: 400 })
  }

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // Only allow specific fields to be updated
  const allowed: Record<string, unknown> = {}
  if ('plan_tier' in updates) allowed.plan_tier = updates.plan_tier
  if ('is_super_admin' in updates) allowed.is_super_admin = updates.is_super_admin
  if ('role' in updates) allowed.role = updates.role

  const { error } = await admin
    .from('profiles')
    .update(allowed)
    .eq('id', userId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
