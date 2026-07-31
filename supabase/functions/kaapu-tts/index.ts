// kaapu-tts — Convert text to speech using Google Cloud Text-to-Speech
// POST { text: string }
// Returns { audioContent: base64 }

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const GOOGLE_TTS_API = 'https://texttospeech.googleapis.com/v1/text:synthesize'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { text } = await req.json()

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'invalid_text' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const apiKey = Deno.env.get('GOOGLE_CLOUD_TTS_KEY')
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'not_configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const response = await fetch(`${GOOGLE_TTS_API}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input: { text: text.substring(0, 5000) }, // Google limit is 5000 chars per request
        voice: {
          languageCode: 'en-GB',
          name: 'en-GB-Neural2-C', // British voice (female, natural, premium)
          // Alternative: 'en-GB-Neural2-D' (female, warm, premium)
          // Cheaper: 'en-GB-Standard-C', 'en-GB-Standard-D'
        },
        audioConfig: {
          audioEncoding: 'MP3',
          pitch: 0, // -20 to 20, 0 is neutral
          speakingRate: 1.0, // 0.25 to 4.0
        },
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      console.error('Google TTS error:', error)
      return new Response(
        JSON.stringify({ error: 'tts_failed', details: error }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const data = await response.json()
    const audioContent = data.audioContent

    if (!audioContent) {
      return new Response(
        JSON.stringify({ error: 'no_audio' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ audioContent }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('kaapu-tts error:', err)
    return new Response(
      JSON.stringify({ error: 'server_error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
