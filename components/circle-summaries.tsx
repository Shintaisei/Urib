"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

type Summary = {
  id: number
  title: string
  circle_name?: string
  category?: string
  activity_days?: string
  activity_place?: string
  cost?: string
  links?: string
  tags?: string
  content: string
  author_name: string
  like_count: number
  comment_count: number
  created_at: string
}

type Comment = {
  id: number
  summary_id: number
  author_name: string
  content: string
  created_at: string
}

export function CircleSummaries({ focusId }: { focusId?: number }): React.ReactElement {
  const [list, setList] = useState<Summary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  // filters
  const [q, setQ] = useState("")
  const [category, setCategory] = useState("")

  // new summary
  const [title, setTitle] = useState("")
  const [circleName, setCircleName] = useState("")
  const [cat, setCat] = useState("")
  const [days, setDays] = useState("")
  const [place, setPlace] = useState("")
  const [cost, setCost] = useState("")
  const [links, setLinks] = useState("")
  const [tags, setTags] = useState("")
  const [content, setContent] = useState("")
  const [submitting, setSubmitting] = useState(false)

  // comments
  const [openComments, setOpenComments] = useState<Record<number, boolean>>({})
  const [comments, setComments] = useState<Record<number, Comment[]>>({})
  const [commentInputs, setCommentInputs] = useState<Record<number, string>>({})
  const [commentSubmitting, setCommentSubmitting] = useState<number | null>(null)

  const fetchList = async () => {
    setLoading(true)
    setError("")
    try {
      const params = new URLSearchParams()
      if (q) params.set('q', q)
      if (category) params.set('category', category)
      const res = await fetch(`${API_BASE_URL}/circles/summaries?${params.toString()}`, { cache: 'no-store' })
      if (!res.ok) throw new Error('取得に失敗しました')
      const data = await res.json()
      setList(data || [])
    } catch (e:any) {
      setError(e?.message || '取得に失敗しました')
      setList([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchList()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!focusId || list.length === 0) return
    const el = document.getElementById(`circle-${focusId}`)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [focusId, list])

  const createSummary = async (): Promise<void> => {
    if (!title.trim() || !content.trim()) return
    setSubmitting(true)
    try {
      const userId = typeof window !== 'undefined' ? localStorage.getItem('user_id') : null
      if (!userId) throw new Error('ユーザーIDが見つかりません')
      const res = await fetch(`${API_BASE_URL}/circles/summaries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-User-Id': userId },
        body: JSON.stringify({
          title: title.trim(),
          circle_name: circleName.trim() || null,
          category: cat.trim() || null,
          activity_days: days.trim() || null,
          activity_place: place.trim() || null,
          cost: cost.trim() || null,
          links: links.trim() || null,
          tags: tags.trim() || null,
          content: content.trim(),
        })
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d?.detail || '投稿に失敗しました')
      }
      // clear and refresh
      setTitle("")
      setCircleName("")
      setCat("")
      setDays("")
      setPlace("")
      setCost("")
      setLinks("")
      setTags("")
      setContent("")
      await fetchList()
    } catch (e:any) {
      alert(e?.message || '投稿に失敗しました')
    } finally {
      setSubmitting(false)
    }
  }

  const toggleComments = async (summaryId: number) => {
    const next = !openComments[summaryId]
    setOpenComments(prev => ({ ...prev, [summaryId]: next }))
    if (next && !comments[summaryId]) {
      try {
        const res = await fetch(`${API_BASE_URL}/circles/summaries/${summaryId}/comments`, { cache: 'no-store' })
        const data = await res.json()
        setComments(prev => ({ ...prev, [summaryId]: data || [] }))
      } catch {
        setComments(prev => ({ ...prev, [summaryId]: [] }))
      }
    }
  }

  const addComment = async (summaryId: number) => {
    const text = (commentInputs[summaryId] || '').trim()
    if (!text) return
    try {
      setCommentSubmitting(summaryId)
      const userId = typeof window !== 'undefined' ? localStorage.getItem('user_id') : null
      if (!userId) throw new Error('ユーザーIDが見つかりません')
      const res = await fetch(`${API_BASE_URL}/circles/summaries/${summaryId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-User-Id': userId },
        body: JSON.stringify({ content: text })
      })
      if (!res.ok) throw new Error('コメントに失敗しました')
      const c = await res.json()
      setComments(prev => ({ ...prev, [summaryId]: [ ...(prev[summaryId] || []), c ] }))
      setCommentInputs(prev => ({ ...prev, [summaryId]: '' }))
    } catch (e:any) {
      alert(e?.message || 'コメントに失敗しました')
    } finally {
      setCommentSubmitting(null)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>サークルまとめを投稿</CardTitle>
          <CardDescription>新しいサークル情報のテンプレを埋めて共有しましょう</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input placeholder="タイトル" value={title} onChange={(e) => setTitle(e.target.value)} />
            <Input placeholder="サークル名" value={circleName} onChange={(e) => setCircleName(e.target.value)} />
            <Input placeholder="カテゴリ（例: 文化系）" value={cat} onChange={(e) => setCat(e.target.value)} />
            <Input placeholder="活動日（例: 火・木）" value={days} onChange={(e) => setDays(e.target.value)} />
            <Input placeholder="活動場所" value={place} onChange={(e) => setPlace(e.target.value)} />
            <Input placeholder="会費" value={cost} onChange={(e) => setCost(e.target.value)} />
            <Input placeholder="リンク（SNS/サイト）" value={links} onChange={(e) => setLinks(e.target.value)} />
            <Input placeholder="タグ（スペース区切り）" value={tags} onChange={(e) => setTags(e.target.value)} />
          </div>
          <Textarea placeholder="活動内容、雰囲気、募集状況、初心者歓迎か、参加方法…" value={content} onChange={(e) => setContent(e.target.value)} className="min-h-[120px]" />
          <div className="flex justify-end">
            <Button onClick={createSummary} disabled={submitting || !title.trim() || !content.trim()}>
              {submitting ? '投稿中…' : '投稿する'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>サークルまとめ一覧</CardTitle>
          <CardDescription>検索やカテゴリで絞り込めます</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <Input placeholder="キーワード検索" value={q} onChange={(e) => setQ(e.target.value)} />
            <Input placeholder="カテゴリ（例: 文化系）" value={category} onChange={(e) => setCategory(e.target.value)} />
          </div>
          <div className="flex justify-end">
            <Button variant="outline" onClick={fetchList}>絞り込み</Button>
          </div>

          {loading && <div className="text-sm text-muted-foreground">読み込み中…</div>}
          {error && <div className="text-sm text-red-500">{error}</div>}
          {!loading && !error && list.length === 0 && <div className="text-sm text-muted-foreground">まだまとめがありません</div>}

          <div className="space-y-3">
            {list.map((s) => (
              <div key={s.id} id={`circle-${s.id}`} className="border rounded p-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-base font-semibold text-foreground">{s.title}</div>
                    <div className="text-xs text-muted-foreground">{s.circle_name} {s.category}</div>
                    <div className="text-xs text-muted-foreground">{s.activity_days} {s.activity_place} {s.cost}</div>
                    <div className="text-xs text-muted-foreground">{s.links} {s.tags && `#${s.tags}`}</div>
                  </div>
                  <div className="text-xs text-muted-foreground">{new Date(s.created_at).toLocaleString('ja-JP')}</div>
                </div>
                <div className="mt-2 text-sm text-foreground whitespace-pre-wrap">{s.content}</div>
                <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                  <div>投稿者: {s.author_name}</div>
                  <button className="text-primary hover:underline" onClick={() => toggleComments(s.id)}>
                    コメントを{openComments[s.id] ? '閉じる' : '見る'} ({s.comment_count})
                  </button>
                </div>
                {openComments[s.id] && (
                  <div className="mt-2 border-t pt-2 space-y-2">
                    <div className="space-y-2">
                      {(comments[s.id] || []).map(c => (
                        <div key={c.id} className="text-sm">
                          <div className="flex items-center justify-between">
                            <div className="font-medium">{c.author_name}</div>
                            <div className="text-[10px] text-muted-foreground">{new Date(c.created_at).toLocaleString('ja-JP')}</div>
                          </div>
                          <div className="whitespace-pre-wrap text-foreground">{c.content}</div>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Input placeholder="コメントを入力" value={commentInputs[s.id] || ''} onChange={(e) => setCommentInputs(prev => ({ ...prev, [s.id]: e.target.value }))} />
                      <Button size="sm" onClick={() => addComment(s.id)} disabled={commentSubmitting === s.id}>送信</Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}


