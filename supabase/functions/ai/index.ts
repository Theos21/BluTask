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

async function callClaude(apiKey: string, system: string, userContent: string, maxTokens = 2048) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: userContent }],
    }),
  })

  const body = await res.text()
  if (!res.ok) throw new Error(`Anthropic API returned ${res.status}: ${body.slice(0, 200)}`)

  const parsed = JSON.parse(body)
  let text: string = parsed.content?.[0]?.text ?? ''

  // Strip markdown code fences if present
  text = text.trim()
  if (text.startsWith('```')) {
    text = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim()
  }
  return text
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
    if (!apiKey) return json({ error: 'ANTHROPIC_API_KEY secret is not set' }, 500)

    const { action, payload } = await req.json()

    switch (action) {
      case 'parse_tasks': {
        const raw = await callClaude(
          apiKey,
          `You are a task list parser. Today is ${payload.today}. Extract all individual tasks from the text. Return a JSON array where each element has: title (string), due_date (ISO 8601 string if detectable, otherwise null), priority (one of: normal/important/urgent, default normal). Return ONLY valid JSON array, no markdown fences, no explanation.`,
          payload.text,
          2048,
        )
        let tasks: unknown[]
        try {
          tasks = JSON.parse(raw)
        } catch {
          console.error('parse_tasks: JSON.parse failed, raw output:', raw.slice(0, 300))
          return json({ error: 'AI returned non-JSON output for parse_tasks', detail: raw.slice(0, 300) }, 502)
        }
        return json({ tasks })
      }

      case 'parse_task': {
        const text = await callClaude(
          apiKey,
          `You are a task parser. Today is ${payload.today}. Parse the user input into a task. Use the provided date to resolve relative references like "next Tuesday" or "in 3 days" into absolute ISO 8601 dates. Return ONLY a JSON object with exactly these fields: title (string, the cleaned task name without date/priority words), due_date (ISO 8601 datetime string if a date or time is mentioned, otherwise null), priority (one of: normal/important/urgent, default normal — use urgent for words like urgent/ASAP/critical, important for words like important/high priority), list_name (string if a list or category is mentioned, otherwise null). No markdown, no explanation.`,
          payload.input,
          512,
        )
        return json({ task: JSON.parse(text) })
      }

      case 'parse_assignments': {
        const text = await callClaude(
          apiKey,
          'You are a school assignment parser. Extract all assignments from the following text. Return a JSON array where each element has: title (string), type (one of: homework/assignment/essay/lab_report/project/reading/quiz/test/presentation/worksheet/problem_set/classwork/research), due_date (ISO 8601 string if detectable, otherwise null), notes (string or null). Return ONLY valid JSON array, no markdown fences, no explanation.',
          payload.text,
          2048,
        )
        return json({ assignments: JSON.parse(text) })
      }

      case 'breakdown_assignment': {
        const text = await callClaude(
          apiKey,
          'You are a student productivity assistant. Suggest 3-6 concrete, actionable sub-steps for completing the given assignment. Each step should be specific and achievable in one sitting. Return ONLY a JSON array of strings. No markdown fences, no explanation.',
          `"${payload.title}" (type: ${payload.type})`,
          512,
        )
        return json({ steps: JSON.parse(text) })
      }

      default:
        return json({ error: `Unknown action: ${action}` }, 400)
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('ai edge function error:', msg)
    return json({ error: msg }, 500)
  }
})
