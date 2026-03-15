import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface LinkCheckResult {
  id: string
  name: string
  portal_url: string
  status: 'ok' | 'broken' | 'error'
  statusCode?: number
  error?: string
}

export async function GET(request: NextRequest) {
  try {
    // Verify authorization
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (!cronSecret) {
      return NextResponse.json(
        { error: 'CRON_SECRET not configured' },
        { status: 500 }
      )
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const supabase = await createClient()

    // Fetch all municipalities that have a portal_url set
    const { data: municipalities, error: fetchError } = await supabase
      .from('municipalities')
      .select('id, name, portal_url')
      .not('portal_url', 'is', null)
      .neq('portal_url', '')

    if (fetchError) {
      return NextResponse.json(
        { error: 'Failed to fetch municipalities', details: fetchError.message },
        { status: 500 }
      )
    }

    if (!municipalities || municipalities.length === 0) {
      return NextResponse.json({
        checked: 0,
        broken: 0,
        results: [],
        message: 'No municipalities with portal URLs found',
      })
    }

    const results: LinkCheckResult[] = []

    // Check each URL with a HEAD request
    for (const municipality of municipalities) {
      const result: LinkCheckResult = {
        id: municipality.id,
        name: municipality.name,
        portal_url: municipality.portal_url,
        status: 'ok',
      }

      try {
        const response = await fetch(municipality.portal_url, {
          method: 'HEAD',
          signal: AbortSignal.timeout(10000),
          redirect: 'follow',
        })

        result.statusCode = response.status

        if (!response.ok) {
          result.status = 'broken'
        }
      } catch (err) {
        result.status = 'error'
        result.error = err instanceof Error ? err.message : 'Unknown error'
      }

      results.push(result)
    }

    // Update municipalities with broken links
    const brokenResults = results.filter((r) => r.status !== 'ok')
    const okResults = results.filter((r) => r.status === 'ok')

    for (const broken of brokenResults) {
      const note = broken.statusCode
        ? `Link check failed: HTTP ${broken.statusCode}`
        : `Link check failed: ${broken.error || 'Unknown error'}`

      await supabase
        .from('municipalities')
        .update({
          link_check_status: 'broken',
          link_check_note: note,
          link_checked_at: new Date().toISOString(),
        })
        .eq('id', broken.id)
    }

    // Clear broken flag for URLs that are now OK
    for (const ok of okResults) {
      await supabase
        .from('municipalities')
        .update({
          link_check_status: 'ok',
          link_check_note: null,
          link_checked_at: new Date().toISOString(),
        })
        .eq('id', ok.id)
    }

    return NextResponse.json({
      checked: results.length,
      broken: brokenResults.length,
      ok: okResults.length,
      results: results.map((r) => ({
        name: r.name,
        portal_url: r.portal_url,
        status: r.status,
        statusCode: r.statusCode,
        error: r.error,
      })),
    })
  } catch (error) {
    console.error('Link check cron error:', error)
    return NextResponse.json(
      { error: 'Link check failed' },
      { status: 500 }
    )
  }
}
