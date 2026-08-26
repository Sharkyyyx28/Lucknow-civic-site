// Wraps fetch + JSON parsing for calls to our own API routes. When a route
// throws an unhandled exception (DB down, bad migration, etc.) Next.js
// answers with its HTML error page instead of JSON — parsing that page must
// not leak into the UI as "Unexpected token '<' ... is not valid JSON".
export async function fetchJson<T = unknown>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const res = await fetch(input, init)

  let data: { error?: string } | null = null
  try {
    data = await res.json()
  } catch {
    // Non-JSON body — most likely an HTML error page from an unhandled server error.
  }

  if (!res.ok) throw new Error(data?.error ?? `Request failed (${res.status})`)
  if (data === null) throw new Error('Unexpected response from the server')
  return data as T
}
