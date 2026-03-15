import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'

const SYSTEM_PROMPT = `You are PlanMate AI, a specialist compliance assistant for South African building plan submissions. You help architects, draughtspersons, and building professionals understand and navigate the building plan approval process.

Your expertise includes:
- SANS 10400 (National Building Regulations) and all its parts
- Municipal building plan submission requirements across South Africa's 265 municipalities
- SACAP (South African Council for the Architectural Profession) registration requirements
- NEMICMA (coastal management), SAHRA/Amafa (heritage), and environmental regulations
- Zoning schemes, building lines, coverage, FAR, height restrictions
- Energy compliance (SANS 10400-XA)
- Professional appointments and competent person requirements
- Plan submission checklists and common rejection reasons
- Fee structures and timelines for different municipalities

Guidelines:
- Always reference the specific SANS 10400 part when discussing building regulations
- When discussing municipality-specific requirements, note that requirements may have changed
- Be precise about which professional categories can sign off on different building types
- Flag any risk conditions (dolomite, coastal, heritage) that may require additional approvals
- Recommend consulting the relevant municipality directly for the most current requirements
- Keep responses concise and actionable
- Use South African terminology (e.g., "erf" not "lot", "storey" not "story")
- Amounts should be in ZAR (South African Rand)`

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { message, conversationId, projectContext } = await request.json()

    if (!message || typeof message !== 'string' || message.length > 4000) {
      return NextResponse.json({ error: 'Invalid message' }, { status: 400 })
    }

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'AI not configured' }, { status: 500 })
    }

    const client = new Anthropic({ apiKey })

    // Build context from project if provided
    let contextMessage = ''
    if (projectContext) {
      contextMessage = `\n\nCurrent project context:
- Project: ${projectContext.name || 'Unnamed'}
- Municipality: ${projectContext.municipality || 'Not selected'}
- Building Type: ${projectContext.building_type || 'Not specified'}
- GFA: ${projectContext.gfa_sqm ? `${projectContext.gfa_sqm} m²` : 'Not specified'}
- Conditions: ${projectContext.conditions?.join(', ') || 'None'}`
    }

    // Fetch conversation history if continuing
    let previousMessages: { role: 'user' | 'assistant'; content: string }[] = []
    if (conversationId) {
      const { data: history } = await supabase
        .from('ai_messages')
        .select('role, content')
        .eq('conversation_id', conversationId)
        .order('created_at')
        .limit(20)

      if (history) {
        previousMessages = history.map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        }))
      }
    }

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: SYSTEM_PROMPT + contextMessage,
      messages: [
        ...previousMessages,
        { role: 'user', content: message },
      ],
    })

    const assistantMessage =
      response.content[0].type === 'text' ? response.content[0].text : ''

    // Save to database
    let convId = conversationId
    if (!convId) {
      const { data: conv } = await supabase
        .from('ai_conversations')
        .insert({
          user_id: user.id,
          title: message.slice(0, 100),
          project_id: projectContext?.id || null,
        })
        .select()
        .single()
      convId = conv?.id
    }

    if (convId) {
      await supabase.from('ai_messages').insert([
        { conversation_id: convId, role: 'user', content: message },
        { conversation_id: convId, role: 'assistant', content: assistantMessage },
      ])
    }

    return NextResponse.json({
      message: assistantMessage,
      conversationId: convId,
    })
  } catch (error) {
    console.error('AI chat error:', error)
    return NextResponse.json({ error: 'Failed to get AI response' }, { status: 500 })
  }
}
