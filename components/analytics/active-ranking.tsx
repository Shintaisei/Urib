"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Crown } from "lucide-react"
import { LoadingProgress } from "@/components/loading-progress"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface RankItem {
  rank: number
  anonymous_name: string
  posts: number
  replies: number
  total: number
}

export function ActiveRanking({ days = 30 }: { days?: number }) {
  const [items, setItems] = useState<RankItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/analytics/active-users?days=${days}`, { cache: 'no-store' })
        const data = await res.json()
        setItems(data.items || [])
      } catch {
        setItems([])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [days])

  if (loading) return <LoadingProgress isLoading={true} text="ランキングを読み込み中..." />
  if (!items.length) return <div className="text-sm text-muted-foreground">ランキングデータがありません</div>

  const top3 = items.slice(0, 3)
  const rest = items.slice(3, 10)

  return (
    <div className="space-y-6">
      {/* Top 1-3 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {top3.map((u) => (
          <Card key={`rank-top-${u.rank}`} className="relative overflow-hidden">
            <CardContent className="p-6 text-center">
              <div className="flex items-center justify-center mb-2">
                <Crown className={`w-6 h-6 ${u.rank === 1 ? 'text-yellow-500' : u.rank === 2 ? 'text-gray-400' : 'text-amber-700'}`} />
                <span className="ml-2 text-lg font-bold">{u.rank}位</span>
              </div>
              <div className="w-14 h-14 mx-auto mb-2 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-primary font-semibold">{u.anonymous_name.charAt(0)}</span>
              </div>
              <div className="text-base font-semibold text-foreground mb-2">{u.anonymous_name}</div>
              <div className="text-sm text-muted-foreground">投稿 {u.posts}・返信 {u.replies}・合計 {u.total}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 4-10 */}
      <div className="space-y-2">
        {rest.map((u) => (
          <div key={`rank-${u.rank}`} className="flex items-center justify-between p-3 rounded border border-border bg-card">
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-sm font-bold w-6 text-center">{u.rank}</span>
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-primary text-sm font-semibold">{u.anonymous_name.charAt(0)}</span>
              </div>
              <div className="text-sm text-foreground truncate">{u.anonymous_name}</div>
            </div>
            <div className="text-xs text-muted-foreground shrink-0">投稿 {u.posts}・返信 {u.replies}・合計 {u.total}</div>
          </div>
        ))}
      </div>
    </div>
  )
}


