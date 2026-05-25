// kaapu-chat — AI health assistant powered by Claude
// POST { messages: [{role, content}], context?: { memberName, conditions, medications, symptoms } }

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: 'not_configured' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    const { messages, context } = await req.json()

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: 'invalid_input' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Build health context block for the system prompt
    let healthContext = ''
    if (context) {
      const parts: string[] = []
      if (context.memberName) parts.push(`You are speaking with ${context.memberName}.`)
      if (context.conditions?.length) {
        parts.push(`Their active health conditions: ${context.conditions.map((c: any) => c.name).join(', ')}.`)
      }
      if (context.medications?.length) {
        const medList = context.medications
          .map((m: any) => m.dosage ? `${m.name} (${m.dosage})` : m.name)
          .join(', ')
        parts.push(`Current medications: ${medList}.`)
      }
      // Active (unresolved) symptoms
      if (context.activeSymptoms?.length) {
        const symList = context.activeSymptoms
          .slice(0, 10)
          .map((s: any) => `${s.categoryLabel || s.category} at ${s.bodyLabel || s.bodyArea} (severity ${s.severity}/10${s.duration ? ', ' + s.duration : ''})`)
          .join(', ')
        parts.push(`Currently active symptoms: ${symList}.`)
      }
      // Full symptom history — lets AI answer "when did I last have X" questions
      if (context.symptomHistory?.length) {
        const histList = context.symptomHistory
          .slice(0, 40)
          .map((s: any) => {
            const status = s.resolved ? ` [resolved${s.resolvedDate ? ' ' + s.resolvedDate : ''}]` : ' [active]'
            return `${s.date}: ${s.category} — ${s.type} at ${s.bodyArea}, severity ${s.severity}/10${s.duration ? ', ' + s.duration : ''}${status}${s.notes ? ', note: ' + s.notes : ''}`
          })
          .join('\n')
        parts.push(`Symptom history (last 90 days):\n${histList}`)
      }
      // Legacy fallback for older clients
      if (!context.symptomHistory && context.recentSymptoms?.length) {
        const symList = context.recentSymptoms
          .slice(0, 5)
          .map((s: any) => `${s.categoryLabel} (severity ${s.severity}/10)`)
          .join(', ')
        parts.push(`Recent symptoms logged: ${symList}.`)
      }
      if (parts.length) {
        healthContext = `\n\nUser health context:\n${parts.join('\n')}`
      }
    }

    const systemPrompt = `You are Kaapu, a caring friend who happens to know a lot about health. You text like a real person — warm, direct, and brief.

How you write:
- Keep replies short. 2-4 sentences max unless the person is clearly asking for detail. If you need to say more, split it into a follow-up question instead.
- Never use bullet points, dashes, asterisks, bold, or any markdown. Plain conversational text only.
- Sound like a friend texting, not a doctor writing notes. No "I'd strongly recommend" or "it is important to note" — just talk normally.
- Ask one focused question at a time, not a list of questions.
- If something sounds serious, say so plainly and briefly — then ask one thing. Don't write a warning essay.
- Never diagnose. Never prescribe. If something needs a doctor, say it in one sentence and move on.
- No sign-offs, no "take care!", no "I hope that helps!" — just the message.

Action markers (append silently at the very end, no space before, never explain them):
- If the user says their symptom/pain is gone, resolved, better, or fixed → append [[suggest:resolve]]
- If the user mentions a new symptom or pain they haven't logged → append [[suggest:log]]
- Otherwise append nothing.${healthContext}`

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: 1024,
        system: systemPrompt,
        messages: messages.map((m: any) => ({
          role: m.role,
          content: m.content,
        })),
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      console.error('Anthropic API error:', response.status, errText)
      return new Response(
        JSON.stringify({ error: 'api_error' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const data = await response.json()
    let content = data?.content?.[0]?.text?.trim() ?? ''

    // Parse and strip action markers
    let action: string | null = null
    const resolveMatch = content.match(/\[\[suggest:resolve\]\]/i)
    const logMatch     = content.match(/\[\[suggest:log\]\]/i)
    if (resolveMatch) {
      action  = 'resolve'
      content = content.replace(/\[\[suggest:resolve\]\]/gi, '').trim()
    } else if (logMatch) {
      action  = 'log'
      content = content.replace(/\[\[suggest:log\]\]/gi, '').trim()
    }

    return new Response(
      JSON.stringify({ content, action }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('kaapu-chat unhandled error:', err)
    return new Response(
      JSON.stringify({ error: 'server_error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
