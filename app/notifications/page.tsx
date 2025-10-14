"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface NotificationItem {
  id: number
  type: string
  title?: string
  message?: string
  entity_type: string
  entity_id: number
  is_read: boolean
  created_at: string
}

export default function NotificationsPage() {
  const [items, setItems] = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(true)

  const fetchNotifs = async () => {
    try {
      const userId = typeof window !== 'undefined' ? localStorage.getItem('user_id') : null
      const email = typeof window !== 'undefined' ? localStorage.getItem('user_email') : null
      const res = await fetch(`${API_BASE_URL}/market/notifications`, {
        headers: {
          ...(userId ? { 'X-User-Id': userId } : {}),
          ...(email ? { 'X-Dev-Email': email } : {}),
        },
        cache: 'no-store'
      })
      if (!res.ok) throw new Error('failed')
      const data = await res.json()
      setItems(data)
    } catch (e) {
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchNotifs()
  }, [])

  const markRead = async (id: number) => {
    try {
      const userId = typeof window !== 'undefined' ? localStorage.getItem('user_id') : null
      const email = typeof window !== 'undefined' ? localStorage.getItem('user_email') : null
      await fetch(`${API_BASE_URL}/market/notifications/${id}/read`, {
        method: 'POST',
        headers: {
          ...(userId ? { 'X-User-Id': userId } : {}),
          ...(email ? { 'X-Dev-Email': email } : {}),
        }
      })
      setItems(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
    } catch {}
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-4">通知</h1>
      {loading ? (
        <div>読み込み中...</div>
      ) : items.length === 0 ? (
        <Card className="bg-muted/30">
          <CardContent className="p-6 text-center text-muted-foreground">通知はありません</CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map(n => (
            <Card key={n.id} className={n.is_read ? '' : 'border-primary'}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-medium">{n.title || n.type}</div>
                    {n.message && <div className="text-sm text-muted-foreground mt-1">{n.message}</div>}
                    <div className="text-xs text-muted-foreground mt-1">{new Date(n.created_at).toLocaleString('ja-JP')}</div>
                  </div>
                  {!n.is_read && (
                    <Button size="sm" variant="outline" onClick={() => markRead(n.id)}>既読にする</Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}


