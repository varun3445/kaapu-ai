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

    return `[HEALTH CONTEXT — the caller and everyone they're connected to.
The caller may refer to a connected person by name OR by a relationship term (e.g. "how's dad", "how's my friend"). Relationship labels are broad (e.g. "Parent" covers both mum and dad) and don't always match how the caller talks about someone, so before giving any details about a connected person, confirm who you mean by name in the same reply — e.g. "You mean Srivathsan, right? He's..." — rather than answering silently as if there's no ambiguity. If more than one connected person could match what the caller said, ask which one they mean instead of guessing.]
${blocks.join('\n\n')}
[/HEALTH CONTEXT]\n\n`
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

// Resolves the caller's own familyId + member record. Kept separate from
// fetchHealthContext's own lookup — this one is only used for tool execution
// (writing), not context building (reading).
async function resolveSelf(userId: string, supabaseUrl: string, serviceKey: string) {
  const users = await pgrest(`users?id=eq.${userId}&select=familyId`, supabaseUrl, serviceKey)
  const familyId = users[0]?.familyId
  if (!familyId) return null
  const members = await pgrest(`members?familyId=eq.${familyId}&userId=eq.${userId}&select=id,name`, supabaseUrl, serviceKey)
  const member = members[0]
  if (!member) return null
  return { familyId, memberId: member.id, name: member.name }
}

const TOOLS = [
  {
    name: 'add_medication',
    description: "Add a new medication (and optional day/time reminder schedule) to the caller's OWN medication list. Only call this after the caller has clearly, verbally confirmed every detail you're about to add — never call it speculatively, and never guess a dosage the caller didn't state.",
    input_schema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Medication name, e.g. Allegra' },
        dosage: { type: 'string', description: "e.g. '180mg'. Omit entirely if the caller didn't state one." },
        frequency: { type: 'string', description: "e.g. 'Once daily'. Omit if not stated." },
        days: { type: 'array', items: { type: 'string' }, description: 'Reminder days, e.g. ["Mon","Wed","Fri"]. Omit entirely if the caller doesn\'t want reminders.' },
        times: { type: 'array', items: { type: 'string' }, description: 'Reminder times in 24h HH:MM, e.g. ["09:00"]. Omit entirely if the caller doesn\'t want reminders.' },
      },
      required: ['name'],
    },
  },
]

async function addMedicationTool(
  userId: string | null,
  input: { name?: string; dosage?: string; frequency?: string; days?: string[]; times?: string[] },
  supabaseUrl: string,
  serviceKey: string,
): Promise<string> {
  if (!userId) return "I couldn't tell who's calling, so I can't add that — please try again."
  if (!input.name) return "I didn't catch a medication name — please try again."

  const self = await resolveSelf(userId, supabaseUrl, serviceKey)
  if (!self) return "I couldn't find your account to add that to — please try again in the app."

  const days = input.days || []
  const times = input.times || []
  const row = {
    id: `med-${Date.now()}`,
    memberId: self.memberId,
    familyId: self.familyId,
    name: input.name,
    dosage: input.dosage || '',
    frequency: input.frequency || '',
    days,
    times,
    startDate: new Date().toISOString().slice(0, 10),
    notes: '',
    conditionId: null,
  }

  const res = await fetch(`${supabaseUrl}/rest/v1/medications`, {
    method: 'POST',
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(row),
  })

  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    console.error('addMedicationTool insert error:', res.status, errText)
    return 'That failed to save — tell the caller to try again in the app.'
  }

  return `Added ${input.name} successfully${times.length ? ` with reminders on ${days.join(', ')} at ${times.join(', ')}` : ''}.`
}

// Runs one Claude turn over the streaming Messages API, forwarding plain text
// deltas to onTextDelta as they arrive (so the fast, non-tool-use path stays
// low-latency), while separately accumulating any tool_use block without
// streaming its raw JSON to the caller. Returns the stop reason and, if the
// model decided to call a tool, its name/id/parsed input.
async function runClaudeTurn(
  apiKey: string,
  systemText: string,
  messages: any[],
  onTextDelta: (text: string) => void,
): Promise<{ stopReason: string; toolUse: { id: string; name: string; input: any } | null }> {
  const res = await fetch(ANTHROPIC_MESSAGES_API, {
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
      messages,
      tools: TOOLS,
      stream: true,
    }),
  })

  if (!res.ok || !res.body) {
    const errText = await res.text().catch(() => '')
    console.error('Anthropic error:', res.status, errText)
    throw new Error('upstream_error')
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buf = ''
  let stopReason = 'end_turn'
  const blockTypes = new Map<number, string>()
  const blockJson = new Map<number, string>()
  const blockToolMeta = new Map<number, { id: string; name: string }>()
  let toolUse: { id: string; name: string; input: any } | null = null

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

      if (evt.type === 'content_block_start') {
        blockTypes.set(evt.index, evt.content_block?.type)
        if (evt.content_block?.type === 'tool_use') {
          blockToolMeta.set(evt.index, { id: evt.content_block.id, name: evt.content_block.name })
          blockJson.set(evt.index, '')
        }
      } else if (evt.type === 'content_block_delta') {
        if (evt.delta?.type === 'text_delta' && evt.delta.text) {
          onTextDelta(evt.delta.text)
        } else if (evt.delta?.type === 'input_json_delta') {
          blockJson.set(evt.index, (blockJson.get(evt.index) || '') + (evt.delta.partial_json || ''))
        }
      } else if (evt.type === 'content_block_stop') {
        if (blockTypes.get(evt.index) === 'tool_use') {
          const meta = blockToolMeta.get(evt.index)
          const jsonStr = blockJson.get(evt.index) || '{}'
          if (meta) {
            try {
              toolUse = { id: meta.id, name: meta.name, input: JSON.parse(jsonStr || '{}') }
            } catch (_) {
              toolUse = { id: meta.id, name: meta.name, input: {} }
            }
          }
        }
      } else if (evt.type === 'message_delta') {
        if (evt.delta?.stop_reason) stopReason = evt.delta.stop_reason
      }
    }
  }

  return { stopReason, toolUse }
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

    const completionId = `chatcmpl-${crypto.randomUUID()}`
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    // Streaming path (what ElevenLabs actually sends). Text deltas from the
    // first Claude call forward straight through as they arrive, so the
    // common non-tool turn stays exactly as fast as before. Only if Claude
    // decides to call add_medication do we pause to execute it and make a
    // second call whose text also streams straight through.
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder()
        let sentRole = false
        const emit = (text: string) => {
          if (!sentRole) {
            controller.enqueue(encoder.encode(sseChunk(completionId, MODEL, { role: 'assistant' }, null)))
            sentRole = true
          }
          controller.enqueue(encoder.encode(sseChunk(completionId, MODEL, { content: text }, null)))
        }

        try {
          let turnMessages = conversationMessages
          const first = await runClaudeTurn(apiKey, systemText, turnMessages, emit)

          if (first.stopReason === 'tool_use' && first.toolUse) {
            let toolResultText = 'Tool not available.'
            if (first.toolUse.name === 'add_medication' && supabaseUrl && serviceKey) {
              toolResultText = await addMedicationTool(userId, first.toolUse.input, supabaseUrl, serviceKey)
            }

            turnMessages = [
              ...turnMessages,
              { role: 'assistant', content: [{ type: 'tool_use', id: first.toolUse.id, name: first.toolUse.name, input: first.toolUse.input }] },
              { role: 'user', content: [{ type: 'tool_result', tool_use_id: first.toolUse.id, content: toolResultText }] },
            ]

            // Follow-up call — its natural-language reply streams through as normal.
            await runClaudeTurn(apiKey, systemText, turnMessages, emit)
          }

          controller.enqueue(encoder.encode(sseChunk(completionId, MODEL, {}, 'stop')))
          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        } catch (err) {
          console.error('stream bridge error:', err)
        } finally {
          controller.close()
        }
      },
    })

    if (wantsStream) {
      return new Response(stream, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      })
    }

    // Non-streaming fallback — buffer the same stream into one JSON response.
    let full = ''
    const reader = stream.getReader()
    const decoder = new TextDecoder()
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      const chunkText = decoder.decode(value, { stream: true })
      for (const line of chunkText.split('\n')) {
        if (!line.startsWith('data: ')) continue
        const payload = line.slice(6)
        if (payload === '[DONE]') continue
        try {
          const evt = JSON.parse(payload)
          const c = evt.choices?.[0]?.delta?.content
          if (c) full += c
        } catch (_) { /* ignore */ }
      }
    }
    return new Response(JSON.stringify({
      id: completionId,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: MODEL,
      choices: [{ index: 0, message: { role: 'assistant', content: full }, finish_reason: 'stop' }],
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (err) {
    console.error('kaapu-elevenlabs-llm error:', err)
    return new Response(JSON.stringify({ error: 'server_error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
