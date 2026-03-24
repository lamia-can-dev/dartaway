export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' })
  }

  try {
    const { countryName } = req.body

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [
          {
            role: 'user',
            content: `You are a witty travel assistant. For ${countryName}, respond ONLY with a valid JSON object (no markdown) with exactly two keys:\n- funFact: a surprising, specific, one-sentence fun fact about the country\n- dayOffMessage: a short funny message (2-3 sentences) someone could send to their manager to request a day off because they just learned their dart landed on ${countryName}, referencing something specific about that country`,
          },
        ],
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      return res.status(response.status).json({ error: err })
    }

    const data = await response.json()
    const text = data.content[0].text
    const parsed = JSON.parse(text)

    return res.status(200).json(parsed)
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
