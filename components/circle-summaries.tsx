"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { isAdminEmail } from "@/lib/utils"

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
  const [isAdmin, setIsAdmin] = useState(false)

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
    const email = typeof window !== 'undefined' ? localStorage.getItem('user_email') : null
    setIsAdmin(isAdminEmail(email))
  }, [])

  useEffect(() => {
    if (!focusId || list.length === 0) return
    const el = document.getElementById(`circle-${focusId}`)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [focusId, list])

  const createSummary = async (): Promise<void> => {
    if (!content.trim()) return
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

  const adminDeleteSummary = async (summaryId: number) => {
    if (!isAdmin) return
    if (!confirm('このサークルまとめを削除しますか？')) return
    try {
      const userId = typeof window !== 'undefined' ? localStorage.getItem('user_id') : null
      if (!userId) throw new Error('ユーザーIDが見つかりません')
      const res = await fetch(`${API_BASE_URL}/circles/admin/summaries/${summaryId}`, {
        method: 'DELETE',
        headers: { 'X-User-Id': userId }
      })
      if (!res.ok) throw new Error('削除に失敗しました')
      setList(prev => prev.filter(s => s.id !== summaryId))
    } catch (e:any) {
      alert(e?.message || '削除に失敗しました')
    }
  }

  const adminDeleteComment = async (summaryId: number, commentId: number) => {
    if (!isAdmin) return
    if (!confirm('このコメントを削除しますか？')) return
    try {
      const userId = typeof window !== 'undefined' ? localStorage.getItem('user_id') : null
      if (!userId) throw new Error('ユーザーIDが見つかりません')
      const res = await fetch(`${API_BASE_URL}/circles/admin/comments/${commentId}`, {
        method: 'DELETE',
        headers: { 'X-User-Id': userId }
      })
      if (!res.ok) throw new Error('削除に失敗しました')
      setComments(prev => ({ ...prev, [summaryId]: (prev[summaryId] || []).filter(c => c.id !== commentId) }))
      setList(prev => prev.map(s => s.id === summaryId ? { ...s, comment_count: Math.max(0, s.comment_count - 1) } : s))
    } catch (e:any) {
      alert(e?.message || '削除に失敗しました')
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>サークルまとめ一覧</CardTitle>
          <CardDescription>検索やカテゴリで絞り込めます</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Input placeholder="キーワード検索" value={q} onChange={(e) => setQ(e.target.value)} className="text-sm" />
            <Input placeholder="カテゴリ（例: 文化系）" value={category} onChange={(e) => setCategory(e.target.value)} className="text-sm" />
          </div>
          <div className="flex justify-end">
            <Button variant="outline" onClick={fetchList}>絞り込み</Button>
          </div>

          {loading && <div className="text-sm text-muted-foreground">読み込み中…</div>}
          {error && <div className="text-sm text-red-500">{error}</div>}
          {!loading && !error && list.length === 0 && <div className="text-sm text-muted-foreground">まだまとめがありません</div>}

          <div className="space-y-3">
            {list.map((s) => (
              <div key={s.id} id={`circle-${s.id}`} className="border rounded p-2 sm:p-3">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm sm:text-base font-semibold text-foreground break-words">{s.title}</div>
                    <div className="text-xs text-muted-foreground mt-1 space-y-1">
                      <div className="break-words">{s.circle_name} {s.category}</div>
                      <div className="break-words">{s.activity_days} {s.activity_place} {s.cost}</div>
                      <div className="break-words">{s.links} {s.tags && `#${s.tags}`}</div>
                    </div>
                  </div>
                  <div className="text-right space-y-1 flex-shrink-0">
                    <div className="text-xs text-muted-foreground">{new Date(s.created_at).toLocaleString('ja-JP')}</div>
                    {isAdmin && (
                      <div className="text-right">
                        <Button size="sm" variant="ghost" className="h-6 px-2 text-destructive text-xs" onClick={() => adminDeleteSummary(s.id)}>
                          削除
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
                <div className="mt-2 text-sm text-foreground whitespace-pre-wrap break-words">{s.content}</div>
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
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                            <div className="font-medium">{c.author_name}</div>
                            <div className="flex items-center gap-2">
                              <div className="text-[10px] text-muted-foreground">{new Date(c.created_at).toLocaleString('ja-JP')}</div>
                              {isAdmin && (
                                <Button size="sm" variant="ghost" className="h-6 px-2 text-destructive text-xs" onClick={() => adminDeleteComment(s.id, c.id)}>削除</Button>
                              )}
                            </div>
                          </div>
                          <div className="whitespace-pre-wrap text-foreground break-words">{c.content}</div>
                        </div>
                      ))}
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Input placeholder="コメントを入力" value={commentInputs[s.id] || ''} onChange={(e) => setCommentInputs(prev => ({ ...prev, [s.id]: e.target.value }))} className="text-sm flex-1" />
                      <Button size="sm" onClick={() => addComment(s.id)} disabled={commentSubmitting === s.id} className="text-xs">送信</Button>
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


