export async function fetchCountryInfo(countryName) {
  const response = await fetch('/api/claude', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ countryName }),
  })

  if (!response.ok) {
    throw new Error('Failed to fetch country info')
  }

  return response.json()
}
