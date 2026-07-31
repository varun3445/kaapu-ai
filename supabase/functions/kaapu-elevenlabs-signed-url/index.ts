// kaapu-elevenlabs-signed-url — Mints a short-lived signed WebSocket URL for
// the ElevenLabs Conversational AI agent. Requires a valid Supabase user
// session (verify_jwt on this function), so the ElevenLabs API key never
// reaches the browser.
// GET/POST -> { signed_url }

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const AGENT_ID = 'agent_7901kyw0t8yqfn5txj2jwjy5mrpf'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const apiKey = Deno.env.get('ELEVENLABS_API_KEY')
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'not_configured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    const url = `https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${AGENT_ID}`
    const res = await fetch(url, { headers: { 'xi-api-key': apiKey } })
    if (!res.ok) {
      const errText = await res.text().catch(() => '')
      console.error('ElevenLabs signed-url error:', res.status, errText)
      return new Response(JSON.stringify({ error: 'upstream_error' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    const data = await res.json()
    return new Response(JSON.stringify({ signed_url: data.signed_url }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('kaapu-elevenlabs-signed-url error:', err)
    return new Response(JSON.stringify({ error: 'server_error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
