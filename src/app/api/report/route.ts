import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  BUILDING_TYPE_LABELS,
  COMPLIANCE_CATEGORY_LABELS,
} from '@/types/database'
import type {
  BuildingType,
  ComplianceCategory,
  ChecklistStatus,
} from '@/types/database'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')

    if (!projectId) {
      return NextResponse.json(
        { error: 'Missing projectId parameter' },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch project with municipality
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select(
        '*, municipality:municipalities(name, municipality_type, climate_zone, risk_flags)'
      )
      .eq('id', projectId)
      .eq('user_id', user.id)
      .single()

    if (projectError || !project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    // Fetch checklist items, drawing checklist items, and risk flags in parallel
    const [checklistRes, drawingsRes, riskFlagsRes] = await Promise.all([
      supabase
        .from('checklist_items')
        .select('label, status, category, notes, is_conditional, trigger_label')
        .eq('project_id', projectId)
        .order('sort_order'),
      supabase
        .from('drawing_checklist_items')
        .select('drawing_name, is_complete, is_required')
        .eq('project_id', projectId)
        .order('sort_order'),
      supabase
        .from('project_risk_flags')
        .select('*, risk_flag:risk_flag_definitions(*)')
        .eq('project_id', projectId),
    ])

    const checklist = checklistRes.data || []
    const drawings = drawingsRes.data || []
    const riskFlags = riskFlagsRes.data || []

    const municipality = project.municipality as unknown as {
      name: string
      municipality_type: string
      climate_zone: number | null
      risk_flags: Record<string, boolean>
    } | null

    // Compute stats
    const totalItems = checklist.length
    const completedItems = checklist.filter(
      (i: { status: string }) =>
        i.status === 'complete' || i.status === 'not_applicable'
    ).length
    const flaggedItems = checklist.filter(
      (i: { status: string }) => i.status === 'flagged'
    ).length
    const pendingItems = checklist.filter(
      (i: { status: string }) => i.status === 'pending'
    ).length
    const progressPct =
      totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0

    const drawingsTotal = drawings.length
    const drawingsReady = drawings.filter(
      (d: { is_complete: boolean }) => d.is_complete
    ).length
    const drawingsRequired = drawings.filter(
      (d: { is_required: boolean }) => d.is_required
    ).length
    const drawingsRequiredComplete = drawings.filter(
      (d: { is_required: boolean; is_complete: boolean }) =>
        d.is_required && d.is_complete
    ).length

    const isReady =
      pendingItems === 0 &&
      flaggedItems === 0 &&
      drawingsRequiredComplete === drawingsRequired

    // Group checklist by category
    const grouped: Record<
      string,
      { label: string; status: string; notes: string | null }[]
    > = {}
    for (const item of checklist) {
      const cat = (item as { category: string }).category
      if (!grouped[cat]) grouped[cat] = []
      grouped[cat].push(
        item as { label: string; status: string; notes: string | null }
      )
    }

    // Build risk flags list
    const activeRiskFlags: { name: string; description: string | null }[] = []

    // From project boolean fields
    if (project.is_coastal)
      activeRiskFlags.push({
        name: 'Coastal Zone',
        description: 'Property falls within a coastal management zone (NEMICMA)',
      })
    if (project.is_heritage)
      activeRiskFlags.push({
        name: 'Heritage Site',
        description: 'Property is in a heritage area (SAHRA/Amafa approval required)',
      })
    if (project.is_dolomite_zone)
      activeRiskFlags.push({
        name: 'Dolomite Risk Area',
        description: 'Geotechnical investigation required for dolomite conditions',
      })
    if (project.is_sectional_title)
      activeRiskFlags.push({
        name: 'Sectional Title',
        description: 'Body corporate approval and sectional title plan amendments required',
      })
    if (project.is_communal_land)
      activeRiskFlags.push({
        name: 'Communal Land',
        description: 'Traditional authority consent may be required',
      })

    // From project_risk_flags table
    for (const rf of riskFlags) {
      const flag = rf.risk_flag as unknown as {
        name: string
        description: string | null
      } | null
      if (flag) {
        activeRiskFlags.push({
          name: flag.name,
          description: flag.description,
        })
      }
    }

    const generatedDate = new Date().toLocaleDateString('en-ZA', {
      dateStyle: 'long',
    })

    const buildingTypeLabel = project.building_type
      ? BUILDING_TYPE_LABELS[project.building_type as BuildingType] ||
        `Class ${project.building_type}`
      : null

    const html = generateReportHtml({
      project: {
        name: project.name,
        streetAddress: project.street_address,
        erfNumber: project.erf_number,
        zoning: project.zoning,
        buildingType: buildingTypeLabel,
        buildingUse: project.building_use_description,
        gfaSqm: project.gfa_sqm,
        storeys: project.storeys,
        ownerName: project.owner_name,
        ownerContact: project.owner_contact,
        status: project.status,
        isAddition: project.is_addition,
      },
      municipality: municipality
        ? {
            name: municipality.name,
            type: municipality.municipality_type,
            climateZone: municipality.climate_zone,
          }
        : null,
      stats: {
        totalItems,
        completedItems,
        flaggedItems,
        pendingItems,
        progressPct,
        isReady,
      },
      drawings: {
        total: drawingsTotal,
        ready: drawingsReady,
        required: drawingsRequired,
        requiredComplete: drawingsRequiredComplete,
        items: drawings as {
          drawing_name: string
          is_complete: boolean
          is_required: boolean
        }[],
      },
      grouped,
      riskFlags: activeRiskFlags,
      generatedDate,
    })

    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `inline; filename="compliance-report-${project.name.replace(/[^a-zA-Z0-9]/g, '-')}.html"`,
      },
    })
  } catch (error) {
    console.error('Report generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate report' },
      { status: 500 }
    )
  }
}

// ─── HTML Report Generator ──────────────────────────────────────────────────────

interface ReportParams {
  project: {
    name: string
    streetAddress: string | null
    erfNumber: string | null
    zoning: string | null
    buildingType: string | null
    buildingUse: string | null
    gfaSqm: number | null
    storeys: number | null
    ownerName: string | null
    ownerContact: string | null
    status: string
    isAddition: boolean
  }
  municipality: {
    name: string
    type: string
    climateZone: number | null
  } | null
  stats: {
    totalItems: number
    completedItems: number
    flaggedItems: number
    pendingItems: number
    progressPct: number
    isReady: boolean
  }
  drawings: {
    total: number
    ready: number
    required: number
    requiredComplete: number
    items: { drawing_name: string; is_complete: boolean; is_required: boolean }[]
  }
  grouped: Record<
    string,
    { label: string; status: string; notes: string | null }[]
  >
  riskFlags: { name: string; description: string | null }[]
  generatedDate: string
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function statusIcon(status: string): string {
  switch (status) {
    case 'complete':
      return '<span class="icon complete">&#10003;</span>'
    case 'flagged':
      return '<span class="icon flagged">&#9888;</span>'
    case 'not_applicable':
      return '<span class="icon na">&mdash;</span>'
    default:
      return '<span class="icon pending">&#9675;</span>'
  }
}

function statusLabel(status: string): string {
  switch (status) {
    case 'complete':
      return 'Complete'
    case 'flagged':
      return 'Flagged'
    case 'not_applicable':
      return 'N/A'
    default:
      return 'Pending'
  }
}

function generateReportHtml(params: ReportParams): string {
  const {
    project,
    municipality,
    stats,
    drawings,
    grouped,
    riskFlags,
    generatedDate,
  } = params

  const categoryRows = Object.entries(grouped)
    .map(([category, items]) => {
      const catLabel =
        COMPLIANCE_CATEGORY_LABELS[category as ComplianceCategory] || category
      const rows = items
        .map(
          (item) => `
          <tr>
            <td class="status-cell">${statusIcon(item.status)}</td>
            <td>
              <span class="${item.status === 'not_applicable' ? 'na-text' : ''}">${escapeHtml(item.label)}</span>
              ${item.notes ? `<div class="item-notes">${escapeHtml(item.notes)}</div>` : ''}
            </td>
            <td class="status-label status-${item.status}">${statusLabel(item.status)}</td>
          </tr>`
        )
        .join('')

      const catComplete = items.filter(
        (i) => i.status === 'complete' || i.status === 'not_applicable'
      ).length
      const catTotal = items.length
      const catPct =
        catTotal > 0 ? Math.round((catComplete / catTotal) * 100) : 0

      return `
        <div class="category-section">
          <div class="category-header">
            <h3>${escapeHtml(catLabel)}</h3>
            <span class="category-progress">${catComplete}/${catTotal} (${catPct}%)</span>
          </div>
          <table class="checklist-table">
            <tbody>${rows}</tbody>
          </table>
        </div>`
    })
    .join('')

  const drawingRows =
    drawings.items.length > 0
      ? drawings.items
          .map(
            (d) => `
          <tr>
            <td class="status-cell">
              ${d.is_complete ? '<span class="icon complete">&#10003;</span>' : '<span class="icon pending">&#9675;</span>'}
            </td>
            <td>
              ${escapeHtml(d.drawing_name)}
              ${d.is_required && !d.is_complete ? '<span class="required-badge">Required</span>' : ''}
              ${d.is_required && d.is_complete ? '<span class="required-done-badge">Required</span>' : ''}
            </td>
            <td class="status-label ${d.is_complete ? 'status-complete' : 'status-pending'}">
              ${d.is_complete ? 'Ready' : 'Outstanding'}
            </td>
          </tr>`
          )
          .join('')
      : ''

  const riskFlagRows =
    riskFlags.length > 0
      ? riskFlags
          .map(
            (rf) => `
          <tr>
            <td class="status-cell"><span class="icon flagged">&#9888;</span></td>
            <td>
              <strong>${escapeHtml(rf.name)}</strong>
              ${rf.description ? `<div class="item-notes">${escapeHtml(rf.description)}</div>` : ''}
            </td>
          </tr>`
          )
          .join('')
      : '<tr><td colspan="2" class="empty-message">No risk flags identified</td></tr>'

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Compliance Report - ${escapeHtml(project.name)}</title>
  <style>
    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      color: #1a1a1a;
      background: #f5f5f5;
      line-height: 1.5;
      font-size: 14px;
    }

    .report-container {
      max-width: 800px;
      margin: 0 auto;
      padding: 24px;
    }

    .report-card {
      background: #fff;
      border-radius: 12px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
      margin-bottom: 20px;
      overflow: hidden;
    }

    .report-card-body {
      padding: 24px;
    }

    /* Header */
    .report-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 24px;
    }

    .report-title {
      font-size: 22px;
      font-weight: 700;
      color: #0f172a;
    }

    .report-subtitle {
      font-size: 13px;
      color: #64748b;
      margin-top: 2px;
    }

    .status-badge {
      display: inline-block;
      padding: 6px 16px;
      border-radius: 20px;
      font-size: 13px;
      font-weight: 600;
      white-space: nowrap;
    }

    .badge-ready {
      background: #dcfce7;
      color: #15803d;
    }

    .badge-not-ready {
      background: #fef3c7;
      color: #b45309;
    }

    /* Project details grid */
    .details-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px 32px;
    }

    .detail-row {
      font-size: 13px;
      padding: 4px 0;
    }

    .detail-label {
      color: #94a3b8;
      display: inline;
    }

    .detail-value {
      color: #1e293b;
    }

    /* Stats row */
    .stats-row {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
      margin-bottom: 20px;
    }

    .stat-card {
      background: #fff;
      border-radius: 12px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
      padding: 16px;
      text-align: center;
    }

    .stat-label {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #94a3b8;
      margin-bottom: 4px;
    }

    .stat-value {
      font-size: 28px;
      font-weight: 700;
    }

    .stat-total { color: #334155; }
    .stat-complete { color: #16a34a; }
    .stat-flagged { color: #d97706; }
    .stat-pending { color: #94a3b8; }

    /* Progress bar */
    .progress-bar-container {
      margin-bottom: 20px;
    }

    .progress-header {
      display: flex;
      justify-content: space-between;
      font-size: 13px;
      margin-bottom: 6px;
    }

    .progress-label { font-weight: 500; }
    .progress-value { font-weight: 700; color: #2563eb; }

    .progress-track {
      width: 100%;
      height: 10px;
      background: #e2e8f0;
      border-radius: 5px;
      overflow: hidden;
    }

    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #3b82f6, #2563eb);
      border-radius: 5px;
      transition: width 0.3s;
    }

    /* Category sections */
    .category-section {
      margin-bottom: 20px;
    }

    .category-section:last-child {
      margin-bottom: 0;
    }

    .category-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
      padding-bottom: 8px;
      border-bottom: 2px solid #f1f5f9;
    }

    .category-header h3 {
      font-size: 14px;
      font-weight: 600;
      color: #334155;
    }

    .category-progress {
      font-size: 12px;
      color: #64748b;
      font-weight: 500;
    }

    /* Checklist table */
    .checklist-table {
      width: 100%;
      border-collapse: collapse;
    }

    .checklist-table td {
      padding: 8px 6px;
      border-bottom: 1px solid #f8fafc;
      vertical-align: top;
      font-size: 13px;
    }

    .checklist-table tr:last-child td {
      border-bottom: none;
    }

    .status-cell {
      width: 28px;
      text-align: center;
    }

    .icon {
      display: inline-block;
      font-size: 14px;
      line-height: 1;
    }

    .icon.complete { color: #16a34a; }
    .icon.flagged { color: #d97706; }
    .icon.pending { color: #cbd5e1; }
    .icon.na { color: #cbd5e1; font-weight: bold; }

    .status-label {
      width: 80px;
      text-align: right;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    .status-complete { color: #16a34a; }
    .status-flagged { color: #d97706; }
    .status-pending { color: #94a3b8; }
    .status-not_applicable { color: #94a3b8; }

    .na-text {
      text-decoration: line-through;
      color: #94a3b8;
    }

    .item-notes {
      font-size: 11px;
      color: #94a3b8;
      font-style: italic;
      margin-top: 2px;
    }

    .required-badge {
      display: inline-block;
      font-size: 10px;
      font-weight: 600;
      padding: 1px 8px;
      border-radius: 10px;
      background: #fee2e2;
      color: #dc2626;
      margin-left: 6px;
      vertical-align: middle;
    }

    .required-done-badge {
      display: inline-block;
      font-size: 10px;
      font-weight: 600;
      padding: 1px 8px;
      border-radius: 10px;
      background: #dcfce7;
      color: #16a34a;
      margin-left: 6px;
      vertical-align: middle;
    }

    .section-title {
      font-size: 16px;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 16px;
    }

    .empty-message {
      color: #94a3b8;
      font-style: italic;
      text-align: center;
      padding: 16px !important;
    }

    /* Risk flags */
    .risk-flag-card {
      border-left: 4px solid #d97706;
    }

    .no-risk-card {
      border-left: 4px solid #16a34a;
    }

    /* Footer */
    .report-footer {
      text-align: center;
      font-size: 11px;
      color: #94a3b8;
      padding: 20px;
    }

    .print-button-container {
      text-align: center;
      margin-bottom: 24px;
    }

    .print-button {
      background: #2563eb;
      color: #fff;
      border: none;
      padding: 10px 28px;
      border-radius: 20px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }

    .print-button:hover {
      background: #1d4ed8;
    }

    /* Print styles */
    @media print {
      body {
        background: #fff;
        font-size: 12px;
      }

      .report-container {
        max-width: 100%;
        padding: 0;
      }

      .report-card {
        box-shadow: none;
        border: 1px solid #e2e8f0;
        break-inside: avoid;
      }

      .stat-card {
        box-shadow: none;
        border: 1px solid #e2e8f0;
      }

      .print-button-container {
        display: none;
      }

      .stats-row {
        grid-template-columns: repeat(4, 1fr);
      }

      .category-section {
        break-inside: avoid;
      }

      @page {
        margin: 1.5cm;
        size: A4;
      }
    }
  </style>
</head>
<body>
  <div class="report-container">
    <div class="print-button-container">
      <button class="print-button" onclick="window.print()">
        &#128438; Print / Save as PDF
      </button>
    </div>

    <!-- Header -->
    <div class="report-card">
      <div class="report-card-body">
        <div class="report-header">
          <div>
            <div class="report-title">PlanMate Compliance Report</div>
            <div class="report-subtitle">Generated ${escapeHtml(generatedDate)}</div>
          </div>
          <span class="status-badge ${stats.isReady ? 'badge-ready' : 'badge-not-ready'}">
            ${stats.isReady ? '&#10003; Ready to Submit' : '&#9888; Not Ready'}
          </span>
        </div>

        <div class="details-grid">
          <div class="detail-row">
            <span class="detail-label">Project: </span>
            <span class="detail-value">${escapeHtml(project.name)}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Building Type: </span>
            <span class="detail-value">${project.buildingType ? escapeHtml(project.buildingType) : '&mdash;'}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Address: </span>
            <span class="detail-value">${project.streetAddress ? escapeHtml(project.streetAddress) : '&mdash;'}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">GFA: </span>
            <span class="detail-value">${project.gfaSqm ? `${project.gfaSqm} m&sup2;` : '&mdash;'}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Municipality: </span>
            <span class="detail-value">${municipality ? escapeHtml(municipality.name) : '&mdash;'}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Storeys: </span>
            <span class="detail-value">${project.storeys ?? '&mdash;'}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Erf Number: </span>
            <span class="detail-value">${project.erfNumber ? escapeHtml(project.erfNumber) : '&mdash;'}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Zoning: </span>
            <span class="detail-value">${project.zoning ? escapeHtml(project.zoning) : '&mdash;'}</span>
          </div>
          ${project.ownerName ? `
          <div class="detail-row">
            <span class="detail-label">Owner: </span>
            <span class="detail-value">${escapeHtml(project.ownerName)}</span>
          </div>` : ''}
          ${project.buildingUse ? `
          <div class="detail-row">
            <span class="detail-label">Building Use: </span>
            <span class="detail-value">${escapeHtml(project.buildingUse)}</span>
          </div>` : ''}
          ${project.isAddition ? `
          <div class="detail-row">
            <span class="detail-label">Type: </span>
            <span class="detail-value">Addition to Existing Building</span>
          </div>` : ''}
          ${municipality?.climateZone ? `
          <div class="detail-row">
            <span class="detail-label">Climate Zone: </span>
            <span class="detail-value">Zone ${municipality.climateZone}</span>
          </div>` : ''}
        </div>
      </div>
    </div>

    <!-- Summary Stats -->
    <div class="stats-row">
      <div class="stat-card">
        <div class="stat-label">Total Items</div>
        <div class="stat-value stat-total">${stats.totalItems}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Completed</div>
        <div class="stat-value stat-complete">${stats.completedItems}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Flagged</div>
        <div class="stat-value stat-flagged">${stats.flaggedItems}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Pending</div>
        <div class="stat-value stat-pending">${stats.pendingItems}</div>
      </div>
    </div>

    <!-- Progress Bar -->
    <div class="report-card">
      <div class="report-card-body progress-bar-container" style="margin-bottom:0">
        <div class="progress-header">
          <span class="progress-label">Overall Compliance</span>
          <span class="progress-value">${stats.progressPct}%</span>
        </div>
        <div class="progress-track">
          <div class="progress-fill" style="width: ${stats.progressPct}%"></div>
        </div>
      </div>
    </div>

    <!-- Risk Flags -->
    <div class="report-card ${riskFlags.length > 0 ? 'risk-flag-card' : 'no-risk-card'}">
      <div class="report-card-body">
        <h2 class="section-title">${riskFlags.length > 0 ? '&#9888; Risk Flags' : '&#10003; Risk Flags'}</h2>
        <table class="checklist-table">
          <tbody>
            ${riskFlagRows}
          </tbody>
        </table>
      </div>
    </div>

    <!-- Compliance Checklist -->
    <div class="report-card">
      <div class="report-card-body">
        <h2 class="section-title">Compliance Checklist</h2>
        ${categoryRows || '<p class="empty-message">No checklist items found</p>'}
      </div>
    </div>

    <!-- Drawing Set -->
    ${drawingRows ? `
    <div class="report-card">
      <div class="report-card-body">
        <h2 class="section-title">Drawing Set</h2>
        <div style="font-size: 13px; color: #64748b; margin-bottom: 12px;">
          ${drawings.ready}/${drawings.total} drawings ready &middot;
          ${drawings.requiredComplete}/${drawings.required} required drawings complete
        </div>
        <table class="checklist-table">
          <tbody>
            ${drawingRows}
          </tbody>
        </table>
      </div>
    </div>
    ` : ''}

    <!-- Footer -->
    <div class="report-footer">
      <p>This report was generated by PlanMate on ${escapeHtml(generatedDate)}.</p>
      <p>This is a compliance tracking summary and does not constitute formal approval.</p>
      <p>Always verify requirements with the relevant municipality before submission.</p>
    </div>
  </div>
</body>
</html>`
}
