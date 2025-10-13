import { NextRequest, NextResponse } from 'next/server'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export async function GET(_req: NextRequest, { params }: { params: { itemId: string } }) {
  const backendUrl = `${API_BASE_URL}/market/items/${params.itemId}/comments`
  const res = await fetch(backendUrl, { method: 'GET', cache: 'no-store' })
  const text = await res.text()
  return new NextResponse(text, {
    status: res.status,
    headers: { 'content-type': res.headers.get('content-type') || 'application/json' }
  })
}

export async function POST(req: NextRequest, { params }: { params: { itemId: string } }) {
  const body = await req.json().catch(() => ({}))
  const backendUrl = `${API_BASE_URL}/market/items/${params.itemId}/comments`

  // フロントから来たヘッダーを必要分だけ転送
  const headers: HeadersInit = { 'Content-Type': 'application/json' }
  const xUserId = req.headers.get('x-user-id')
  const xDevEmail = req.headers.get('x-dev-email')
  const authorization = req.headers.get('authorization')
  if (xUserId) headers['X-User-Id'] = xUserId
  if (xDevEmail) headers['X-Dev-Email'] = xDevEmail
  if (authorization) headers['Authorization'] = authorization

  const res = await fetch(backendUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    cache: 'no-store'
  })

  const text = await res.text()
  return new NextResponse(text, {
    status: res.status,
    headers: { 'content-type': res.headers.get('content-type') || 'application/json' }
  })
}


