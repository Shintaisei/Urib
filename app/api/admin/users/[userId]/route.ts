export const runtime = 'edge'
export const dynamic = 'force-dynamic'

export async function DELETE(_req: Request, { params }: { params: { userId: string } }) {
  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'https://urib-backend.onrender.com'
  try {
    const res = await fetch(`${apiBase}/admin/users/${encodeURIComponent(params.userId)}`, {
      method: 'DELETE',
      // 管理者認証はバックエンド側でX-User-Id/X-Dev-Email不要（メールで判定）だが、念のため転送
      headers: {},
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


