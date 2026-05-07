import Anthropic from 'npm:@anthropic-ai/sdk'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { action, payload } = await req.json()
    const client = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY') })
    let result

    switch (action) {
      case 'parse_assignments': {
        const msg = await client.messages.create({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 2048,
          system: 'You are a school assignment parser. Extract all assignments from the following text. Return a JSON array where each element has: title (string), type (one of: homework/assignment/essay/lab_report/project/reading/quiz/test/presentation/worksheet/problem_set/classwork/research), due_date (ISO 8601 string if detectable, otherwise null), notes (string or null). Return ONLY valid JSON array, no markdown fences, no explanation.',
          messages: [{ role: 'user', content: payload.text }],
        })
        result = { assignments: JSON.parse(msg.content[0].text) }
        break
      }

      case 'parse_task': {
        const msg = await client.messages.create({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 512,
          system: `You are a task parser. Today is ${payload.today}. Parse the user input into a task. Use the provided date to resolve relative references like "next Tuesday" or "in 3 days" into absolute ISO 8601 dates. Return ONLY a JSON object with exactly these fields: title (string, the cleaned task name without date/priority words), due_date (ISO 8601 datetime string if a date or time is mentioned, otherwise null), priority (one of: normal/important/urgent, default normal — use urgent for words like urgent/ASAP/critical, important for words like important/high priority), list_name (string if a list or category is mentioned, otherwise null). No markdown, no explanation.`,
          messages: [{ role: 'user', content: payload.input }],
        })
        result = { task: JSON.parse(msg.content[0].text) }
        break
      }

      case 'breakdown_assignment': {
        const msg = await client.messages.create({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 512,
          system: 'You are a student productivity assistant. Suggest 3-6 concrete, actionable sub-steps for completing the given assignment. Each step should be specific and achievable in one sitting. Return ONLY a JSON array of strings. No markdown fences, no explanation.',
          messages: [{ role: 'user', content: `"${payload.title}" (type: ${payload.type})` }],
        })
        result = { steps: JSON.parse(msg.content[0].text) }
        break
      }

      case 'parse_tasks': {
        const msg = await client.messages.create({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 2048,
          system: `You are a task list parser. Today is ${payload.today}. Extract all individual tasks from the text. Return a JSON array where each element has: title (string), due_date (ISO 8601 string if detectable, otherwise null), priority (one of: normal/important/urgent, default normal). Return ONLY valid JSON array, no markdown fences, no explanation.`,
          messages: [{ role: 'user', content: payload.text }],
        })
        result = { tasks: JSON.parse(msg.content[0].text) }
        break
      }

      default:
        return new Response(JSON.stringify({ error: 'Unknown action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('AI edge function error:', err)
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
