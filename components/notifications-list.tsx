"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"

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

export function NotificationsList({ inline = false }: { inline?: boolean }) {
  const [items, setItems] = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const navigate = (n: NotificationItem) => {
    if (n.entity_type === 'board_post') {
      // entity_id に board_id を入れる運用に変更
      router.push(`/board/${n.entity_id}`)
    } else if (n.entity_type === 'market_item') {
      // マーケット詳細未実装のため、ホームのマーケットタブへスクロール用ハッシュで遷移
      router.push(`/home#market-${n.entity_id}`)
    } else {
      router.push(`/home`)
    }
  }

  if (loading) return <div className="p-2 text-sm text-muted-foreground">読み込み中...</div>
  if (items.length === 0) return <div className="p-2 text-sm text-muted-foreground">通知はありません</div>

  return (
    <div className="py-1">
      {items.map(n => (
        <div key={n.id} className={`px-2 py-2 text-sm hover:bg-muted/50 cursor-pointer ${n.is_read ? '' : 'bg-primary/5'}`} onClick={() => navigate(n)}>
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="font-medium">{n.title || n.type}</div>
              {n.message && <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</div>}
              <div className="text-[10px] text-muted-foreground mt-0.5">{new Date(n.created_at).toLocaleString('ja-JP')}</div>
            </div>
            {!n.is_read && (
              <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={(e) => { e.stopPropagation(); markRead(n.id) }}>既読</Button>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}


