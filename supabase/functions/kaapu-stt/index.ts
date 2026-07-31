// kaapu-stt — Convert speech to text using Google Cloud Speech-to-Text
// POST { audio: base64-encoded audio, mimeType: string }
// Returns { transcript: string, confidence: number }

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const GOOGLE_STT_API = 'https://speech.googleapis.com/v1/speech:recognize'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { audio, mimeType } = await req.json()

    if (!audio || typeof audio !== 'string') {
      return new Response(
        JSON.stringify({ error: 'invalid_audio' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const apiKey = Deno.env.get('GOOGLE_CLOUD_STT_KEY')
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'not_configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const response = await fetch(`${GOOGLE_STT_API}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        config: {
          encoding: 'LINEAR16',
          languageCode: 'en-GB',
          sampleRateHertz: 16000,
          model: 'default',
          useEnhanced: true,
          enableAutomaticPunctuation: true,
        },
        audio: {
          content: audio,
        },
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      console.error('Google STT error:', error)
      return new Response(
        JSON.stringify({ error: 'stt_failed', details: error }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const data = await response.json()
    const transcript = data.results?.[0]?.alternatives?.[0]?.transcript || ''
    const confidence = data.results?.[0]?.alternatives?.[0]?.confidence || 0

    if (!transcript) {
      return new Response(
        JSON.stringify({ error: 'no_transcript', transcript: '', confidence: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ transcript, confidence }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('kaapu-stt error:', err)
    return new Response(
      JSON.stringify({ error: 'server_error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
