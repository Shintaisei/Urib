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
  course_name?: string
  instructor?: string
  department?: string
  year_semester?: string
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

export function CourseSummaries({ focusId }: { focusId?: number }): React.ReactElement {
  const [list, setList] = useState<Summary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  // filters
  const [q, setQ] = useState("")
  const [dept, setDept] = useState("")
  const [ys, setYs] = useState("")

  // new summary
  const [title, setTitle] = useState("")
  const [courseName, setCourseName] = useState("")
  const [instructor, setInstructor] = useState("")
  const [department, setDepartment] = useState("")
  const [yearSemester, setYearSemester] = useState("")
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
      if (dept) params.set('department', dept)
      if (ys) params.set('year_semester', ys)
      const res = await fetch(`${API_BASE_URL}/courses/summaries?${params.toString()}`, { cache: 'no-store' })
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

  // フォーカス対象があればスクロール
  useEffect(() => {
    if (!focusId || list.length === 0) return
    const el = document.getElementById(`course-${focusId}`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [focusId, list])

  const createSummary = async (): Promise<void> => {
    if (!content.trim()) return
    setSubmitting(true)
    try {
      const userId = typeof window !== 'undefined' ? localStorage.getItem('user_id') : null
      if (!userId) throw new Error('ユーザーIDが見つかりません')
      const res = await fetch(`${API_BASE_URL}/courses/summaries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-User-Id': userId },
        body: JSON.stringify({
          title: title.trim(),
          course_name: courseName.trim() || null,
          instructor: instructor.trim() || null,
          department: department.trim() || null,
          year_semester: yearSemester.trim() || null,
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
      setCourseName("")
      setInstructor("")
      setDepartment("")
      setYearSemester("")
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
        const res = await fetch(`${API_BASE_URL}/courses/summaries/${summaryId}/comments`, { cache: 'no-store' })
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
      const res = await fetch(`${API_BASE_URL}/courses/summaries/${summaryId}/comments`, {
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
    if (!confirm('この授業まとめを削除しますか？')) return
    try {
      const userId = typeof window !== 'undefined' ? localStorage.getItem('user_id') : null
      if (!userId) throw new Error('ユーザーIDが見つかりません')
      const res = await fetch(`${API_BASE_URL}/courses/admin/summaries/${summaryId}`, {
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
      const res = await fetch(`${API_BASE_URL}/courses/admin/comments/${commentId}`, {
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
          <CardTitle>授業まとめを投稿</CardTitle>
          <CardDescription>新しい授業・レビューのテンプレを埋めて共有しましょう</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input placeholder="授業名（例: 線形代数）" value={courseName} onChange={(e) => setCourseName(e.target.value)} />
            <Input placeholder="教員名" value={instructor} onChange={(e) => setInstructor(e.target.value)} />
            <Input placeholder="学部（例: 工学部）" value={department} onChange={(e) => setDepartment(e.target.value)} />
            <Input placeholder="学期（例: 2025春）" value={yearSemester} onChange={(e) => setYearSemester(e.target.value)} />
            <Input placeholder="タグ（スペース区切り）" value={tags} onChange={(e) => setTags(e.target.value)} />
          </div>
          <Textarea placeholder="授業概要、評価方法、難易度、おすすめポイント、注意点…" value={content} onChange={(e) => setContent(e.target.value)} className="min-h-[120px]" />
          <div className="flex justify-end">
            <Button onClick={createSummary} disabled={submitting || !content.trim()}>
              {submitting ? '投稿中…' : '投稿する'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>授業まとめ一覧</CardTitle>
          <CardDescription>検索や学部・学期で絞り込めます</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <Input placeholder="キーワード検索" value={q} onChange={(e) => setQ(e.target.value)} />
            <Input placeholder="学部（例: 工学部）" value={dept} onChange={(e) => setDept(e.target.value)} />
            <Input placeholder="学期（例: 2025春）" value={ys} onChange={(e) => setYs(e.target.value)} />
          </div>
          <div className="flex justify-end">
            <Button variant="outline" onClick={fetchList}>絞り込み</Button>
          </div>

          {loading && <div className="text-sm text-muted-foreground">読み込み中…</div>}
          {error && <div className="text-sm text-red-500">{error}</div>}
          {!loading && !error && list.length === 0 && <div className="text-sm text-muted-foreground">まだまとめがありません</div>}

          <div className="space-y-3">
            {list.map((s) => (
              <div key={s.id} id={`course-${s.id}`} className="border rounded p-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-base font-semibold text-foreground">{s.title}</div>
                    <div className="text-xs text-muted-foreground">{s.course_name} {s.instructor}</div>
                    <div className="text-xs text-muted-foreground">{s.department} {s.year_semester} {s.tags && `#${s.tags}`}</div>
                  </div>
                  <div className="text-right space-y-1">
                    <div className="text-xs text-muted-foreground">{new Date(s.created_at).toLocaleString('ja-JP')}</div>
                    {isAdmin && (
                      <div className="text-right">
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-destructive" onClick={() => adminDeleteSummary(s.id)}>
                          削除（管理者）
                        </Button>
                      </div>
                    )}
                  </div>
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
                            <div className="flex items-center gap-2">
                              <div className="text-[10px] text-muted-foreground">{new Date(c.created_at).toLocaleString('ja-JP')}</div>
                              {isAdmin && (
                                <Button size="sm" variant="ghost" className="h-6 px-2 text-destructive" onClick={() => adminDeleteComment(s.id, c.id)}>削除</Button>
                              )}
                            </div>
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


