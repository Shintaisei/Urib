"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { Heart, MessageCircle } from "lucide-react"
import { AvatarWithPopover } from "@/components/ui/avatar-with-popover"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

type Post = {
  id: number
  board_id: string
  content: string
  author_name: string
  author_year?: string | null
  author_department?: string | null
  like_count: number
  reply_count: number
  created_at: string
  is_liked: boolean
}

function timeAgo(iso: string): string {
  const now = new Date().getTime()
  const t = new Date(iso).getTime()
  const diffMs = now - t
  const m = Math.floor(diffMs / 60000)
  if (m < 1) return "たった今"
  if (m < 60) return `${m}分前`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}時間前`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}日前`
  return new Date(iso).toLocaleDateString("ja-JP")
}

export default function UserTimelinePage({ params }: { params: { userId: string } }) {
  const router = useRouter()
  const search = useSearchParams()
  const initialTab = (search.get("tab") as "posts" | "liked" | "replied") || "posts"
  const [tab, setTab] = useState<"posts" | "liked" | "replied">(initialTab)
  const [items, setItems] = useState<Post[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    setTab(initialTab)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialTab])

  const headers = useMemo(() => {
    const h: Record<string, string> = {}
    const uid = typeof window !== "undefined" ? localStorage.getItem("user_id") : null
    const email = typeof window !== "undefined" ? localStorage.getItem("user_email") : null
    if (uid) h["X-User-Id"] = uid
    if (email) h["X-Dev-Email"] = email
    return h
  }, [])

  const fetchList = async () => {
    try {
      setLoading(true)
      setError("")
      const base = `${API_BASE_URL}/board/user/${encodeURIComponent(params.userId)}`
      const path = tab === "posts" ? "posts" : tab === "liked" ? "liked" : "replied"
      const res = await fetch(`${base}/${path}`, { headers })
      if (!res.ok) throw new Error("取得に失敗しました")
      const j = await res.json()
      setItems(Array.isArray(j) ? j : [])
    } catch (e: any) {
      setError(e?.message || "読み込みに失敗しました")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchList()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, params.userId])

  const toggleLike = async (post: Post) => {
    try {
      const uid = typeof window !== "undefined" ? localStorage.getItem("user_id") : null
      if (!uid) return
      const res = await fetch(`${API_BASE_URL}/board/posts/${post.id}/like`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-User-Id": uid },
      })
      if (!res.ok) return
      const data = await res.json()
      setItems(prev => prev.map(p => p.id === post.id ? { ...p, is_liked: data.is_liked, like_count: data.like_count } : p))
    } catch {}
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-6 max-w-3xl">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-2xl font-bold text-foreground">ユーザー</h1>
          <Button variant="outline" size="sm" onClick={() => router.back()}>戻る</Button>
        </div>
        <div className="inline-flex items-center rounded border border-border overflow-hidden mb-4">
          <button type="button" className={`px-3 py-1.5 text-sm ${tab === "posts" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`} onClick={() => setTab("posts")}>投稿</button>
          <button type="button" className={`px-3 py-1.5 text-sm border-l ${tab === "liked" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`} onClick={() => setTab("liked")}>いいね</button>
          <button type="button" className={`px-3 py-1.5 text-sm border-l ${tab === "replied" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`} onClick={() => setTab("replied")}>返信</button>
        </div>

        {loading ? (
          <div className="py-12 text-center text-muted-foreground">読み込み中…</div>
        ) : error ? (
          <div className="py-12 text-center text-destructive">{error}</div>
        ) : items.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">対象の投稿がありません</div>
        ) : (
          <div className="divide-y divide-border border border-border rounded">
            {items.map(p => (
              <div key={`u-post-${p.id}`} className="px-3 py-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <AvatarWithPopover anonymousName={p.author_name} size={20} />
                    <span className="text-[12px] font-medium truncate">{p.author_name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground">{timeAgo(p.created_at)}</span>
                    <Button variant="outline" size="sm" className="h-6 px-2 text-[11px]" onClick={() => router.push(`/board/${p.board_id}#post-${p.id}`)}>スレへ</Button>
                  </div>
                </div>
                <div className="mt-1 text-[13px] whitespace-pre-wrap">{p.content}</div>
                <div className="mt-1 flex items-center gap-4 text-[12px] text-muted-foreground">
                  <button type="button" className={`inline-flex items-center gap-1 ${p.is_liked ? "text-red-500" : ""}`} onClick={() => toggleLike(p)}>
                    <Heart className={`w-3 h-3 ${p.is_liked ? "fill-current" : ""}`} />
                    {p.like_count}
                  </button>
                  <span className="inline-flex items-center gap-1">
                    <MessageCircle className="w-3 h-3" />
                    {p.reply_count}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}


