export const runtime = 'edge'
export const dynamic = 'force-dynamic'

export async function DELETE(req: Request) {
  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'https://urib-backend.onrender.com'

  const userId = req.headers.get('x-user-id') || undefined
  const devEmail = req.headers.get('x-dev-email') || undefined
  try {
    const res = await fetch(`${apiBase}/users/me`, {
      method: 'DELETE',
      headers: {
        ...(userId ? { 'X-User-Id': userId } : {}),
        ...(devEmail ? { 'X-Dev-Email': devEmail } : {}),
      },
    })
    const text = await res.text()
    return new Response(text, { status: res.status, headers: { 'Content-Type': res.headers.get('Content-Type') || 'application/json' } })
  } catch (e: any) {
    return new Response(JSON.stringify({ detail: e?.message || 'proxy_failed' }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }
}

export async function OPTIONS() {
  return new Response(null, { status: 204 })
}


