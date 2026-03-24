import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

function claudeApiPlugin() {
  return {
    name: 'claude-api-proxy',
    configureServer(server) {
      server.middlewares.use('/api/claude', async (req, res) => {
        if (req.method !== 'POST') {
          res.writeHead(405, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: 'Method not allowed' }))
          return
        }

        let body = ''
        req.on('data', (chunk) => { body += chunk })
        req.on('end', async () => {
          try {
            const { countryName } = JSON.parse(body)
            const apiKey = process.env.ANTHROPIC_API_KEY

            if (!apiKey) {
              res.writeHead(500, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ error: 'ANTHROPIC_API_KEY not set' }))
              return
            }

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

            const data = await response.json()
            const text = data.content[0].text
            const parsed = JSON.parse(text)

            res.writeHead(200, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify(parsed))
          } catch (err) {
            res.writeHead(500, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ error: err.message }))
          }
        })
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), claudeApiPlugin()],
})
