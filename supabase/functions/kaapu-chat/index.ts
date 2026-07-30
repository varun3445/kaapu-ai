// kaapu-chat — Kaapu Health Specialist via Anthropic Managed Agents
// POST { messages: [{role, content}], context?, agentSessionId? }
// Returns { content, action, agentSessionId }

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const AGENT_ID = 'agent_01PjYC4mhrVUbaQ6SS8a97R9'
const ENV_ID   = 'env_01CAMjYFuh5uVY564nhKHjPh'
const BASE     = 'https://api.anthropic.com/v1'

function agentHeaders(key: string) {
  return {
    'x-api-key': key,
    'anthropic-version': '2023-06-01',
    'anthropic-beta': 'managed-agents-2026-04-01',
    'content-type': 'application/json',
  }
}

// Mirrors src/utils/severity.js — the app's severity scale is 1-6, not 1-10,
// and every user-facing surface shows a tier word, never a raw fraction.
// This edge function is a separate Deno runtime so it can't import that file
// directly; keep the two in sync if the tiers change.
function severityLabel(sev: number): string {
  if (sev >= 6) return 'Very Severe'
  if (sev >= 5) return 'Severe'
  if (sev >= 4) return 'Moderate-Severe'
  if (sev >= 3) return 'Moderate'
  if (sev >= 2) return 'Mild-Moderate'
  return 'Mild'
}

function buildHealthContext(context: any): string {
  if (!context) return ''
  const parts: string[] = []
  if (context.memberName) parts.push(`User: ${context.memberName}`)
  if (context.conditions?.length) {
    parts.push(`Conditions: ${context.conditions.map((c: any) => c.name).join(', ')}`)
  }
  if (context.medications?.length) {
    parts.push(`Medications: ${context.medications.map((m: any) => m.name).join(', ')}`)
  }
  if (context.activeSymptoms?.length) {
    // [id: ...] is included so the model can target a specific symptom with a
    // [[note:id:text]] marker (see NOTES rule below) — never used in the reply itself.
    const list = context.activeSymptoms
      .slice(0, 10)
      .map((s: any) => `[id: ${s.id}] ${s.categoryLabel || s.category} at ${s.bodyLabel || s.bodyArea} (severity: ${severityLabel(s.severity)}${s.duration ? ', ' + s.duration : ''})`)
      .join('; ')
    parts.push(`Active symptoms: ${list}`)
  }
  if (context.symptomHistory?.length) {
    const hist = context.symptomHistory
      .slice(0, 40)
      .map((s: any) => {
        const status = s.resolved
          ? `[resolved${s.resolvedDate ? ' ' + s.resolvedDate : ''}]`
          : '[active]'
        return `${s.date}: ${s.category} — ${s.type} at ${s.bodyArea}, severity: ${severityLabel(s.severity)}${s.duration ? ', ' + s.duration : ''} ${status}${s.notes ? ', note: "' + s.notes + '"' : ''}`
      })
      .join('\n')
    parts.push(`Symptom history:\n${hist}`)
  }
  if (!parts.length) return ''
  return `[HEALTH CONTEXT]\n${parts.join('\n')}\n[/HEALTH CONTEXT]\n\n`
}

async function createSession(key: string): Promise<string> {
  const res = await fetch(`${BASE}/sessions`, {
    method: 'POST',
    headers: agentHeaders(key),
    body: JSON.stringify({ agent: AGENT_ID, environment_id: ENV_ID, title: 'kaapu-chat' }),
  })
  const data = await res.json()
  if (!data.id) throw new Error(`Session creation failed: ${JSON.stringify(data).slice(0, 200)}`)
  return data.id
}

async function sendEvent(key: string, sessionId: string, text: string): Promise<void> {
  await fetch(`${BASE}/sessions/${sessionId}/events`, {
    method: 'POST',
    headers: agentHeaders(key),
    body: JSON.stringify({
      events: [{ type: 'user.message', content: [{ type: 'text', text }] }],
    }),
  })
}

async function pollResponse(key: string, sessionId: string, maxMs = 45000): Promise<string> {
  const deadline = Date.now() + maxMs
  let lastText = ''
  while (Date.now() < deadline) {
    await new Promise(r => setTimeout(r, 1500))
    const res = await fetch(`${BASE}/sessions/${sessionId}/events`, { headers: agentHeaders(key) })
    if (!res.ok) continue
    const data = await res.json()
    const events: any[] = data.data || []
    const agentMsgs = events.filter((e: any) => e.type === 'agent.message')
    if (agentMsgs.length) {
      lastText = agentMsgs[agentMsgs.length - 1].content?.[0]?.text || ''
    }
    if (events.some((e: any) => e.type === 'session.status_idle') && lastText) break
  }
  return lastText
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
    const { messages, context, agentSessionId: incomingSessionId } = await req.json()

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: 'invalid_input' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const lastUserMsg = [...messages].reverse().find((m: any) => m.role === 'user')
    if (!lastUserMsg) {
      return new Response(
        JSON.stringify({ error: 'no_user_message' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let sessionId = incomingSessionId
    let messageText: string = lastUserMsg.content

    // New conversation — create session and inject health context + response rules
    if (!sessionId) {
      sessionId = await createSession(apiKey)
      const healthCtx = buildHealthContext(context)
      // Prepend health context and action marker instructions to the first message only
      messageText = `${healthCtx}${messageText}

[RESPONSE STYLE: Reply like a warm friend texting — short, plain sentences, no bullet points or markdown. 2-4 sentences max unless more is clearly needed. No sign-offs.]
[NOTES: Symptom "note" fields are raw speech-to-text and are sometimes garbled or mistranscribed. Treat them as a rough hint at most — never state as fact something a note merely implies (e.g. a posture, cause, or behavior). If a note is unclear, either ignore it or ask the user to clarify rather than asserting your own interpretation of it.]
[POSSIBLE CAUSES: If the user mentions something that could plausibly explain one of their ACTIVE symptoms (an activity, exposure, posture, stress, etc.), say in your reply that it could be a contributing factor — don't just deflect to "ask your GP" for this part. Then silently append one [[note:<id>:<short note>]] marker per symptom it plausibly explains, using the exact id shown in [id: ...] in the Active symptoms context above. The note text should be under 12 words, phrased as an observation, e.g. "Possible cause: heavy lifting." Only use ids that appear in the context; never invent one.
If instead the user is ASKING what might be causing a symptom (rather than volunteering a cause themselves) and nothing in the conversation or context suggests one, do NOT just refuse and defer to the GP. Ask 1-2 short, specific questions about recent changes that commonly explain new symptoms — new exercise/activity, diet changes, new products or medications, stress, sleep, posture/repetitive strain — so you have something concrete to note down before they see their GP. Once they answer, apply the rule above: acknowledge a plausible cause and note it, don't diagnose or name a medical condition.]
[ACTION MARKERS: Silently append [[suggest:resolve]] if the user says a symptom is gone/better/resolved. Append [[suggest:log]] if they mention a new symptom they haven't logged. Append [[suggest:gp-report]] if you recommend the user contact their GP, doctor, or healthcare provider for any reason — this lets the app offer to generate a GP visit report, so use it whenever that suggestion appears, even alongside a [[note:...]] marker. Only one of resolve/log/gp-report per reply. Append nothing otherwise. Never explain these.]`
    }

    await sendEvent(apiKey, sessionId, messageText)
    let content = await pollResponse(apiKey, sessionId)

    if (!content) {
      return new Response(
        JSON.stringify({ error: 'timeout', agentSessionId: sessionId }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse and strip note markers first — zero or more can appear alongside
    // a single suggest: action below.
    const noteUpdates: { symptomId: string; text: string }[] = []
    content = content.replace(/\[\[note:([^:\]]+):([^\]]+)\]\]/gi, (_match, id, text) => {
      noteUpdates.push({ symptomId: String(id).trim(), text: String(text).trim() })
      return ''
    }).trim()

    // Parse and strip the single suggest: action marker
    let action: string | null = null
    if (/\[\[suggest:resolve\]\]/i.test(content)) {
      action   = 'resolve'
      content  = content.replace(/\[\[suggest:resolve\]\]/gi, '').trim()
    } else if (/\[\[suggest:log\]\]/i.test(content)) {
      action   = 'log'
      content  = content.replace(/\[\[suggest:log\]\]/gi, '').trim()
    } else if (/\[\[suggest:gp-report\]\]/i.test(content)) {
      action   = 'gp-report'
      content  = content.replace(/\[\[suggest:gp-report\]\]/gi, '').trim()
    }

    return new Response(
      JSON.stringify({ content, action, noteUpdates, agentSessionId: sessionId }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('kaapu-chat error:', err)
    return new Response(
      JSON.stringify({ error: 'server_error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
