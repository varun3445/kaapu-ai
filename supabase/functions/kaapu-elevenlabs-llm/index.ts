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
    const systemText = systemMsg ? stripMarkers(systemMsg.content) : ''

    const conversationMessages = incomingMessages
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .map(m => ({ role: m.role, content: m.content }))

    if (conversationMessages.length === 0) {
      return new Response(JSON.stringify({ error: 'no_messages' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log('kaapu-elevenlabs-llm turn for userId:', userId)

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
