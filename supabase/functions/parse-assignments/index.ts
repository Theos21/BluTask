const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { text, today, dayName } = await req.json()

    const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
    console.log('ANTHROPIC_API_KEY present:', !!apiKey, '| length:', apiKey?.length ?? 0)

    if (!apiKey) {
      return json({ error: true, message: 'ANTHROPIC_API_KEY secret is not set in Edge Function environment' }, 500)
    }

    const requestBody = {
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      system: `You are a school assignment parser. Today is ${dayName}, ${today}. Extract all assignments from the following text. For each assignment return a JSON array with these fields: title (string — the assignment name only, do NOT include the class or subject name in the title; for example if the text says "Math homework chapter 5" the title should be "Chapter 5 Homework" not "Math Chapter 5 Homework" — the class is tracked separately), type (one of: homework/assignment/essay/lab_report/project/reading/quiz/test/presentation/worksheet/problem_set/classwork/research), due_date (ISO format date string YYYY-MM-DD if detectable — resolve relative dates like 'tonight', 'tomorrow', 'next Monday' using today's date, otherwise null), due_time (24hr format HH:MM if a specific time is mentioned, otherwise null for quiz/test types, otherwise '23:59' as default for homework), detected_class (string or null — the subject or class name detected from the text, e.g. 'Math', 'English', 'Chemistry'; null if not mentioned), notes (any additional context). Return only valid JSON array, nothing else.`,
      messages: [{ role: 'user', content: text }],
    }

    console.log('Calling Anthropic API with model:', requestBody.model)

    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(requestBody),
    })

    const anthropicBody = await anthropicRes.text()
    console.log('Anthropic status:', anthropicRes.status)
    console.log('Anthropic response:', anthropicBody.slice(0, 500))

    if (!anthropicRes.ok) {
      return json({
        error: true,
        message: `Anthropic API returned ${anthropicRes.status}`,
        detail: anthropicBody,
      }, 502)
    }

    let result: { content?: { text: string }[] }
    try {
      result = JSON.parse(anthropicBody)
    } catch {
      return json({ error: true, message: 'Failed to parse Anthropic response as JSON', detail: anthropicBody }, 502)
    }

    const content = result.content?.[0]?.text ?? '[]'
    console.log('Claude output:', content.slice(0, 300))

    // Strip markdown code blocks if present
    let cleanContent = content.trim()
    if (cleanContent.startsWith('```')) {
      cleanContent = cleanContent.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim()
    }

    let assignments: unknown[]
    try {
      assignments = JSON.parse(cleanContent)
    } catch (parseError) {
      console.error('JSON parse failed, content was:', cleanContent)
      return json({ error: true, message: 'Claude returned non-JSON output', detail: cleanContent }, 502)
    }

    return json({ assignments })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    const stack = err instanceof Error ? err.stack : undefined
    console.error('parse-assignments unhandled error:', msg)
    return json({ error: true, message: msg, stack }, 500)
  }
})
