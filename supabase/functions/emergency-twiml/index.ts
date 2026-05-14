// emergency-twiml — Supabase Edge Function
// Returns TwiML XML that Twilio reads aloud when an emergency call connects.
// Twilio fetches this URL when the outbound call is answered.
//
// Query params (passed by make-emergency-call):
//   name  — member name
//   note  — optional user note

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    })
  }

  const url  = new URL(req.url)
  const name = url.searchParams.get('name') || 'Someone'
  const note = url.searchParams.get('note') || ''

  const noteText = note ? ` They said: ${note}.` : ''

  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Amy" language="en-GB">
    This is an emergency alert from Kaapu Health.
    ${name} has triggered an emergency and needs immediate help.${noteText}
    Please check on them now or call the emergency services.
    This message will repeat once.
  </Say>
  <Pause length="1"/>
  <Say voice="Polly.Amy" language="en-GB">
    This is an emergency alert from Kaapu Health.
    ${name} needs help immediately.
    Please act now.
  </Say>
</Response>`

  return new Response(twiml, {
    headers: { 'Content-Type': 'text/xml' },
  })
})
