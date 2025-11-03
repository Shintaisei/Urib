"use client"

import { useEffect, useState } from "react"
import { Header } from "@/components/header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { isAdminEmail } from "@/lib/utils"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [data, setData] = useState<any>(null)
  const email = typeof window !== 'undefined' ? localStorage.getItem('user_email') : null
  const userId = typeof window !== 'undefined' ? localStorage.getItem('user_id') : null
  const isAdmin = isAdminEmail(email || '')

  const handleClear = async () => {
    if (!confirm('アナリティクスデータを全削除します。よろしいですか？')) return
    try {
      const res = await fetch(`${API_BASE_URL}/analytics/clear`, {
        method: 'POST',
        headers: {
          ...(userId ? { 'X-User-Id': userId } : {}),
          ...(email ? { 'X-Dev-Email': email } : {}),
        }
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.detail || '削除に失敗しました')
      }
      // 再取得
      setLoading(true)
      setError("")
      const r = await fetch(`${API_BASE_URL}/analytics/summary?days=7`, {
        headers: {
          ...(userId ? { 'X-User-Id': userId } : {}),
          ...(email ? { 'X-Dev-Email': email } : {}),
        }
      })
      const j = await r.json()
      setData(j)
    } catch (e: any) {
      setError(e.message || '削除に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const run = async () => {
      if (!isAdmin) {
        setError("管理者のみが閲覧できます")
        setLoading(false)
        return
      }
      try {
        const res = await fetch(`${API_BASE_URL}/analytics/summary?days=7`, {
          headers: {
            ...(userId ? { 'X-User-Id': userId } : {}),
            ...(email ? { 'X-Dev-Email': email } : {}),
          }
        })
        if (!res.ok) {
          const j = await res.json().catch(() => ({}))
          throw new Error(j.detail || '取得に失敗しました')
        }
        const j = await res.json()
        setData(j)
      } catch (e: any) {
        setError(e.message || '取得に失敗しました')
      } finally {
        setLoading(false)
      }
    }
    run()
  }, [isAdmin])

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-6 max-w-3xl">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-foreground">アナリティクス</h1>
          {isAdmin && (
            <Button size="sm" variant="destructive" onClick={handleClear}>
              全削除
            </Button>
          )}
        </div>
        {loading && <div className="text-muted-foreground">読み込み中...</div>}
        {error && <div className="text-red-500">{error}</div>}
        {!loading && !error && data && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>直近7日 PV（管理者以外）</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{data.pv_count}</div>
                <div className="text-xs text-muted-foreground">since {data.since}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>人気ページ Top10</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1 text-sm">
                  {data.top_paths.map((p: any, i: number) => (
                    <li key={i} className="flex justify-between">
                      <span className="truncate max-w-[70%]" title={p.path}>{p.path}</span>
                      <span className="text-muted-foreground">{p.count}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            
          </div>
        )}
      </main>
    </div>
  )
}
