// kaapu-weekly-insight — Generates a personalised weekly health insight via Claude Haiku
// POST { healthData: { memberName, conditions, medications, symptoms7d, checkIns7d, activeCount } }

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
    const { healthData } = await req.json()
    if (!healthData) {
      return new Response(
        JSON.stringify({ error: 'invalid_input' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    const { memberName, conditions = [], medications = [], symptoms7d = [], checkIns7d = [], activeCount = 0 } = healthData

    // Build a rich health summary for Claude
    const lines: string[] = []

    if (conditions.length) {
      lines.push(`Ongoing conditions: ${conditions.map((c: any) => c.name).join(', ')}.`)
    }
    if (medications.length) {
      lines.push(`Current medications: ${medications.map((m: any) => m.dosage ? `${m.name} (${m.dosage})` : m.name).join(', ')}.`)
    }

    if (symptoms7d.length) {
      const resolved   = symptoms7d.filter((s: any) => s.resolved)
      const stillActive = symptoms7d.filter((s: any) => !s.resolved)
      if (stillActive.length) {
        const list = stillActive.map((s: any) => `${s.categoryLabel || s.category} at ${s.bodyLabel || s.bodyArea} (severity ${s.severity}/10)`).join(', ')
        lines.push(`Still active this week: ${list}.`)
      }
      if (resolved.length) {
        const list = resolved.map((s: any) => `${s.categoryLabel || s.category} at ${s.bodyLabel || s.bodyArea}`).join(', ')
        lines.push(`Resolved this week: ${list}.`)
      }
    } else {
      lines.push('No symptoms were logged in the past 7 days.')
    }

    if (checkIns7d.length) {
      const avgMood  = checkIns7d.filter((c: any) => c.mood).reduce((a: number, c: any) => a + c.mood, 0) / (checkIns7d.filter((c: any) => c.mood).length || 1)
      const avgEnergy = checkIns7d.filter((c: any) => c.energy).reduce((a: number, c: any) => a + c.energy, 0) / (checkIns7d.filter((c: any) => c.energy).length || 1)
      if (avgMood > 0) lines.push(`Average mood this week: ${avgMood.toFixed(1)}/5.`)
      if (avgEnergy > 0) lines.push(`Average energy this week: ${avgEnergy.toFixed(1)}/5.`)
    }

    const healthSummary = lines.join(' ')

    const systemPrompt = `You are Kaapu, a warm and knowledgeable health companion. You analyse a user's weekly health data and deliver a friendly, personalised insight — like a caring friend who happens to know a lot about health.

Guidelines:
- Keep it to 3–4 short paragraphs maximum
- Start with a genuine observation about the week (not "Hello" or "Hi")
- Highlight any patterns, improvements, or areas needing attention
- If symptoms resolved, acknowledge the recovery positively
- If symptoms are ongoing, offer gentle encouragement and a practical tip
- If it was a quiet, symptom-free week, celebrate that!
- Mention check-in mood/energy trends if available
- End with one clear, actionable suggestion for the coming week
- Tone: warm, caring, concise — never clinical or alarming
- Never diagnose or prescribe; always suggest consulting a doctor for serious concerns`

    const userMessage = `${memberName ? `This is ${memberName}'s` : "This is the user's"} weekly health summary for the past 7 days:\n\n${healthSummary}\n\nPlease give them their personalised weekly Kaapu insight.`

    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: 400,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      }),
    })

    if (!resp.ok) {
      const err = await resp.text()
      return new Response(
        JSON.stringify({ error: 'anthropic_error', detail: err }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 502 }
      )
    }

    const data = await resp.json()
    const insight = data.content?.[0]?.text || ''

    return new Response(
      JSON.stringify({ insight }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: 'server_error', detail: err.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
