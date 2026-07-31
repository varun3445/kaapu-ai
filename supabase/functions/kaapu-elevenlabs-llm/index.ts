// kaapu-elevenlabs-llm — Custom LLM backend for the ElevenLabs Conversational AI
// voice agent. ElevenLabs calls this as an OpenAI-compatible Chat Completions
// endpoint: POST { model, messages: [{role, content}], stream } and expects
// either an OpenAI-shaped JSON response or an SSE stream of
// `chat.completion.chunk` events terminated by `data: [DONE]`.
//
// This is deliberately a separate, faster path from kaapu-chat's Managed
// Agents flow (which polls for up to 45s) — a live voice call can't tolerate
// that latency, so this calls Claude's Messages API directly and streams the
// response straight through as it's generated.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const ANTHROPIC_MESSAGES_API = 'https://api.anthropic.com/v1/messages'
const MODEL = 'claude-opus-4-8'

// The agent's system prompt template embeds `[[USER_ID:{{user_id}}]]` (via an
// ElevenLabs dynamic variable) so this webhook can identify the caller. It's
// stripped out before the system text is forwarded to Claude.
const USER_ID_MARKER = /\[\[USER_ID:([^\]]*)\]\]/i

function extractUserId(systemText: string): string | null {
  const match = systemText.match(USER_ID_MARKER)
  return match?.[1]?.trim() || null
}

function stripMarkers(text: string): string {
  return text.replace(USER_ID_MARKER, '').trim()
}

// Mirrors src/utils/severity.js and kaapu-chat/index.ts — keep in sync if the tiers change.
function severityLabel(sev: number): string {
  if (sev >= 6) return 'Very Severe'
  if (sev >= 5) return 'Severe'
  if (sev >= 4) return 'Moderate-Severe'
  if (sev >= 3) return 'Moderate'
  if (sev >= 2) return 'Mild-Moderate'
  return 'Mild'
}

async function pgrest(path: string, url: string, serviceKey: string) {
  const res = await fetch(`${url}/rest/v1/${path}`, {
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
  })
  if (!res.ok) return []
  return res.json()
}

// Builds one person's context block (name/relationship + conditions,
// medications, active symptoms, recent history) from a given familyId +
// memberId. Used for both the caller and each connected account below.
async function fetchPersonContext(
  label: string,
  familyId: string,
  memberId: string,
  supabaseUrl: string,
  serviceKey: string,
): Promise<string> {
  const [conditions, medications, symptoms] = await Promise.all([
    pgrest(`conditions?familyId=eq.${familyId}&memberId=eq.${memberId}&select=name`, supabaseUrl, serviceKey),
    pgrest(`medications?familyId=eq.${familyId}&memberId=eq.${memberId}&select=name`, supabaseUrl, serviceKey),
    pgrest(`symptoms?familyId=eq.${familyId}&memberId=eq.${memberId}&select=*`, supabaseUrl, serviceKey),
  ])

  const parts: string[] = []
  if (conditions.length) parts.push(`Conditions: ${conditions.map((c: any) => c.name).join(', ')}`)
  if (medications.length) parts.push(`Medications: ${medications.map((m: any) => m.name).join(', ')}`)

  const active = symptoms.filter((s: any) => !s.resolved)
  if (active.length) {
    const list = active
      .slice(0, 10)
      .map((s: any) => `${s.category} at ${s.bodyRegion || s.bodyLabel} (severity: ${severityLabel(s.severity)}${s.duration ? ', ' + s.duration : ''})`)
      .join('; ')
    parts.push(`Active symptoms: ${list}`)
  }

  const ninetyDaysAgo = Date.now() - 90 * 24 * 3600000
  const history = symptoms
    .filter((s: any) => new Date(s.timestamp).getTime() > ninetyDaysAgo)
    .slice(0, 40)
    .map((s: any) => {
      const status = s.resolved ? `[resolved]` : '[active]'
      return `${s.timestamp?.slice(0, 10)}: ${s.category} — severity: ${severityLabel(s.severity)} ${status}`
    })
    .join('\n')
  if (history) parts.push(`Symptom history:\n${history}`)

  if (!parts.length) return `${label}: no health data logged.`
  return `${label}:\n${parts.join('\n')}`
}

// Looks up the caller's own health data PLUS every account they've actually
// connected to (family members, linked friends, etc.) — never any other
// account. The only source of "who am I connected to" is the caller's own
// `members` rows; a `linkedFamilyId` on one of those rows only exists because
// a connection request was already sent and accepted (see Family.jsx), so
// following it is safe — there's no way to reach anyone the caller hasn't
// connected with, since we never accept a family/user id as external input.
async function fetchHealthContext(userId: string): Promise<string> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceKey) return ''

  try {
    const users = await pgrest(`users?id=eq.${userId}&select=familyId`, supabaseUrl, serviceKey)
    const familyId = users[0]?.familyId
    if (!familyId) return ''

    // Every member row visible to this caller — their own record, any local
    // (non-linked) dependents, and one placeholder row per connected account.
    const members = await pgrest(`members?familyId=eq.${familyId}&select=id,name,relationship,userId,linkedFamilyId`, supabaseUrl, serviceKey)
    if (!members.length) return ''

    const self = members.find((m: any) => m.userId === userId) || members.find((m: any) => m.relationship === 'Self')
    if (!self) return ''

    const blocks: string[] = []
    blocks.push(await fetchPersonContext(`${self.name} (you, the caller)`, familyId, self.id, supabaseUrl, serviceKey))

    for (const m of members) {
      if (m.id === self.id) continue
      if (m.linkedFamilyId) {
        // Connected external account — their own data lives under their own
        // family, keyed by their deterministic self-member id (see AppContext:
        // every account's own member record is created as `mem-${userId}`).
        const theirMemberId = `mem-${m.userId}`
        blocks.push(await fetchPersonContext(`${m.name} (${m.relationship})`, m.linkedFamilyId, theirMemberId, supabaseUrl, serviceKey))
      } else {
        // Local dependent living directly in the caller's own family.
        blocks.push(await fetchPersonContext(`${m.name} (${m.relationship})`, familyId, m.id, supabaseUrl, serviceKey))
      }
    }

    return `[HEALTH CONTEXT — the caller and everyone they're connected to. Only discuss a connected person's info if the caller clearly asks about them by name or relationship (e.g. "how's dad").]\n${blocks.join('\n\n')}\n[/HEALTH CONTEXT]\n\n`
  } catch (err) {
    console.error('fetchHealthContext error:', err)
    return ''
  }
}

function sseChunk(id: string, model: string, delta: Record<string, unknown>, finishReason: string | null) {
  return `data: ${JSON.stringify({
    id,
    object: 'chat.completion.chunk',
    created: Math.floor(Date.now() / 1000),
    model,
    choices: [{ index: 0, delta, finish_reason: finishReason }],
  })}\n\n`
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Validate the shared webhook secret. ElevenLabs' Custom LLM sends the
  // configured api_key as a standard bearer Authorization header.
  const expectedSecret = Deno.env.get('ELEVENLABS_WEBHOOK_SECRET')
  const authHeader = req.headers.get('authorization') || ''
  const providedSecret = authHeader.replace(/^Bearer\s+/i, '').trim()
  if (!expectedSecret || providedSecret !== expectedSecret) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'not_configured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    const body = await req.json()
    const incomingMessages: { role: string; content: string }[] = body.messages || []
    const wantsStream = body.stream !== false

    const systemMsg = incomingMessages.find(m => m.role === 'system')
    const userId = systemMsg ? extractUserId(systemMsg.content) : null
    const baseSystemText = systemMsg ? stripMarkers(systemMsg.content) : ''
    const healthContext = userId ? await fetchHealthContext(userId) : ''
    const systemText = `${healthContext}${baseSystemText}`

    const conversationMessages = incomingMessages
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .map(m => ({ role: m.role, content: m.content }))

    if (conversationMessages.length === 0) {
      return new Response(JSON.stringify({ error: 'no_messages' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log('kaapu-elevenlabs-llm turn for userId:', userId, 'hasHealthContext:', !!healthContext)

    const anthropicRes = await fetch(ANTHROPIC_MESSAGES_API, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 400,
        system: systemText,
        messages: conversationMessages,
        stream: true,
      }),
    })

    if (!anthropicRes.ok || !anthropicRes.body) {
      const errText = await anthropicRes.text().catch(() => '')
      console.error('Anthropic error:', anthropicRes.status, errText)
      return new Response(JSON.stringify({ error: 'upstream_error' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const completionId = `chatcmpl-${crypto.randomUUID()}`

    if (!wantsStream) {
      // Non-streaming fallback: buffer the whole Anthropic stream, return one JSON object.
      let full = ''
      const reader = anthropicRes.body.getReader()
      const decoder = new TextDecoder()
      let buf = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += decoder.decode(value, { stream: true })
        const lines = buf.split('\n')
        buf = lines.pop() || ''
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const payload = line.slice(6)
          if (payload === '[DONE]') continue
          try {
            const evt = JSON.parse(payload)
            if (evt.type === 'content_block_delta' && evt.delta?.text) full += evt.delta.text
          } catch (_) { /* ignore partial */ }
        }
      }
      return new Response(JSON.stringify({
        id: completionId,
        object: 'chat.completion',
        created: Math.floor(Date.now() / 1000),
        model: MODEL,
        choices: [{ index: 0, message: { role: 'assistant', content: full }, finish_reason: 'stop' }],
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Streaming: translate Anthropic's SSE events into OpenAI chat.completion.chunk events.
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder()
        const reader = anthropicRes.body!.getReader()
        const decoder = new TextDecoder()
        let buf = ''
        let sentRole = false
        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            buf += decoder.decode(value, { stream: true })
            const lines = buf.split('\n')
            buf = lines.pop() || ''
            for (const line of lines) {
              if (!line.startsWith('data: ')) continue
              const payload = line.slice(6)
              if (payload === '[DONE]') continue
              let evt: any
              try { evt = JSON.parse(payload) } catch { continue }

              if (evt.type === 'content_block_delta' && evt.delta?.text) {
                if (!sentRole) {
                  controller.enqueue(encoder.encode(sseChunk(completionId, MODEL, { role: 'assistant' }, null)))
                  sentRole = true
                }
                controller.enqueue(encoder.encode(sseChunk(completionId, MODEL, { content: evt.delta.text }, null)))
              } else if (evt.type === 'message_stop') {
                controller.enqueue(encoder.encode(sseChunk(completionId, MODEL, {}, 'stop')))
                controller.enqueue(encoder.encode('data: [DONE]\n\n'))
              }
            }
          }
        } catch (err) {
          console.error('stream bridge error:', err)
        } finally {
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (err) {
    console.error('kaapu-elevenlabs-llm error:', err)
    return new Response(JSON.stringify({ error: 'server_error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
