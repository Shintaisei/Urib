"use client"

import { useEffect, useMemo, useState } from "react"
import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { Heart, MessageCircle } from "lucide-react"
import { useRouter } from "next/navigation"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

type Post = {
  id: number
  board_id: string
  content: string
  hashtags?: string | null
  author_name: string
  author_year?: string | null
  author_department?: string | null
  like_count: number
  reply_count: number
  created_at: string
  is_liked: boolean
  has_replied?: boolean
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

function ExpandableText({ text, maxChars = 160 }: { text: string; maxChars?: number }) {
  const [expanded, setExpanded] = useState(false)
  const safe = text || ""
  const isLong = safe.length > maxChars
  const shown = expanded ? safe : safe.slice(0, maxChars)
  return (
    <div className="mb-1">
      <p className="text-[14px] leading-relaxed whitespace-pre-wrap">{shown}{!expanded && isLong ? "…" : ""}</p>
      {isLong && (
        <button type="button" className="text-xs text-primary hover:underline" onClick={() => setExpanded(v => !v)}>
          {expanded ? "閉じる" : "もっと見る"}
        </button>
      )}
    </div>
  )
}

export default function MePage() {
  const router = useRouter()
  const [tab, setTab] = useState<"mine" | "liked" | "replied">("mine")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>("")
  const [mine, setMine] = useState<Post[]>([])
  const [liked, setLiked] = useState<Post[]>([])
  const [replied, setReplied] = useState<Post[]>([])

  const headers = useMemo(() => {
    if (typeof window === "undefined") return {}
    const h: Record<string, string> = {}
    const uid = localStorage.getItem("user_id")
    const email = localStorage.getItem("user_email")
    if (uid) h["X-User-Id"] = uid
    if (email) h["X-Dev-Email"] = email
    return h
  }, [])

  const fetchAll = async () => {
    try {
      setLoading(true)
      setError("")
      const [r1, r2, r3] = await Promise.all([
        fetch(`${API_BASE_URL}/board/my/posts`, { headers }),
        fetch(`${API_BASE_URL}/board/my/liked`, { headers }),
        fetch(`${API_BASE_URL}/board/my/replied`, { headers }),
      ])
      if (!r1.ok || !r2.ok || !r3.ok) throw new Error("データ取得に失敗しました")
      const j1 = await r1.json()
      const j2 = await r2.json()
      const j3 = await r3.json()
      setMine(Array.isArray(j1) ? j1 : [])
      setLiked(Array.isArray(j2) ? j2 : [])
      setReplied(Array.isArray(j3) ? j3 : [])
    } catch (e: any) {
      setError(e?.message || "読み込みに失敗しました")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const cur = tab === "mine" ? mine : tab === "liked" ? liked : replied

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
      const updater = (arr: Post[]) => arr.map(p => p.id === post.id ? { ...p, is_liked: data.is_liked, like_count: data.like_count } : p)
      setMine(prev => updater(prev))
      setLiked(prev => updater(prev))
      setReplied(prev => updater(prev))
    } catch {}
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-6 max-w-3xl">
        <h1 className="text-2xl font-bold text-foreground mb-3">マイページ</h1>
        <div className="inline-flex items-center rounded border border-border overflow-hidden mb-4">
          <button
            type="button"
            className={`px-3 py-1.5 text-sm ${tab === "mine" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
            onClick={() => setTab("mine")}
          >自分の投稿</button>
          <button
            type="button"
            className={`px-3 py-1.5 text-sm border-l border-border ${tab === "liked" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
            onClick={() => setTab("liked")}
          >いいねした</button>
          <button
            type="button"
            className={`px-3 py-1.5 text-sm border-l border-border ${tab === "replied" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
            onClick={() => setTab("replied")}
          >返信した</button>
        </div>

        {loading ? (
          <div className="py-12 text-center text-muted-foreground">読み込み中…</div>
        ) : error ? (
          <div className="py-12 text-center text-destructive">{error}</div>
        ) : cur.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">対象の投稿がありません</div>
        ) : (
          <div className="divide-y divide-border border border-border rounded">
            {cur.map((p) => (
              <div key={`me-post-${p.id}`} className="px-3 py-2 hover:bg-muted/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[12px] font-medium truncate">{p.author_name}</span>
                    {p.author_department && p.author_year && (
                      <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                        {p.author_department} {p.author_year}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground">{timeAgo(p.created_at)}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-6 px-2 text-[11px]"
                      onClick={() => router.push(`/board/${p.board_id}#post-${p.id}`)}
                    >
                      スレへ
                    </Button>
                  </div>
                </div>
                <div className="mt-1 text-[13px]">
                  <ExpandableText text={p.content} maxChars={180} />
                </div>
                <div className="mt-1 flex items-center gap-4 text-[12px] text-muted-foreground">
                  <button
                    type="button"
                    className={`inline-flex items-center gap-1 hover:text-foreground ${p.is_liked ? "text-red-500" : ""}`}
                    onClick={() => toggleLike(p)}
                  >
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


