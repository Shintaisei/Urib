export async function DELETE(req: Request) {
  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

  const userId = req.headers.get('x-user-id') || undefined
  const devEmail = req.headers.get('x-dev-email') || undefined

  const res = await fetch(`${apiBase}/users/me`, {
    method: 'DELETE',
    headers: {
      ...(userId ? { 'X-User-Id': userId } : {}),
      ...(devEmail ? { 'X-Dev-Email': devEmail } : {}),
    },
    // no body
  })

  const text = await res.text()
  return new Response(text, { status: res.status, headers: { 'Content-Type': res.headers.get('Content-Type') || 'application/json' } })
}

export async function OPTIONS() {
  return new Response(null, { status: 204 })
}


