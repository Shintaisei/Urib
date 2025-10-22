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

export function NotificationsList({ inline = false, mentionsOnly = false }: { inline?: boolean; mentionsOnly?: boolean }) {
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
      let data = await res.json()
      if (!Array.isArray(data)) data = []
      const filtered = mentionsOnly ? data.filter((n:any) => n?.type === 'mention') : data.filter((n:any) => n?.type !== 'mention')
      setItems(filtered)
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

  const navigate = async (n: NotificationItem) => {
    if (n.entity_type === 'board_post') {
      // message末尾からpost_idを抽出し、board_idはサーバで再解決して正確に遷移
      const m = n.message || ''
      const match = m.match(/\|\|post_id=(\d+)/)
      const postId = match ? match[1] : undefined
      if (postId) {
        try {
          const res = await fetch(`${API_BASE_URL}/board/posts/${postId}/board`, { cache: 'no-store' })
          if (res.ok) {
            const data = await res.json()
            router.push(`/board/${data.board_id}?post_id=${postId}`)
            return
          }
        } catch {}
      }
      // フォールバック
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
        <div key={n.id} className={`px-2 py-2 text-sm hover:bg-muted/50 cursor-pointer ${n.is_read ? '' : (n.type === 'mention' ? 'bg-blue-50 dark:bg-blue-950/30' : 'bg-primary/5')}`} onClick={() => navigate(n)}>
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className={`font-medium ${n.type === 'mention' ? 'text-blue-600 dark:text-blue-400' : ''}`}>{n.title || n.type}</div>
              {n.message && <div className={`text-xs mt-0.5 line-clamp-2 ${n.type === 'mention' ? 'text-blue-700 dark:text-blue-300' : 'text-muted-foreground'}`}>{n.message}</div>}
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


