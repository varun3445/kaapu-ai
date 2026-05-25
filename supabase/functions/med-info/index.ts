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
    const { medication } = await req.json()
    if (!medication || medication.trim().length < 2) {
      return new Response(
        JSON.stringify({ error: 'invalid_input' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    const prompt = `You are a clinical pharmacist. Given a medication name (brand or generic, including international/Indian brands), return a JSON object with exactly these fields:
- name: the common generic name (or "Brand / Generic" if a well-known brand)
- drugClass: short drug class (e.g. "SSRI Antidepressant", "ACE Inhibitor", "Antihistamine")
- description: one sentence describing the drug (max 15 words)
- uses: one sentence on what it treats (max 20 words)
- suggestedDosage: the most common adult dosage strength as a string (e.g. "500mg", "10mg or 20mg", "5mg"). If the medication name itself contains a dosage (e.g. "Dolo 650"), use that exact dosage. Omit unit if unclear.

Medication: "${medication.trim()}"

Respond with ONLY valid JSON. No markdown, no explanation. If you don't recognise it as a real medication, return {"error":"unknown"}.`

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: 256,
        messages: [{ role: 'user', content: prompt }],
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
    const raw = data?.content?.[0]?.text?.trim() ?? ''

    // Strip accidental markdown fences
    const cleaned = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/, '').trim()

    let parsed: Record<string, string>
    try {
      parsed = JSON.parse(cleaned)
    } catch {
      console.error('JSON parse error. Raw:', raw)
      return new Response(
        JSON.stringify({ error: 'parse_error' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (parsed.error || !parsed.name) {
      return new Response(
        JSON.stringify({ error: 'unknown' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({
        name: parsed.name,
        drugClass: parsed.drugClass,
        description: parsed.description,
        uses: parsed.uses,
        suggestedDosage: parsed.suggestedDosage || null,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('med-info unhandled error:', err)
    return new Response(
      JSON.stringify({ error: 'server_error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
