"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { isAdminEmail } from "@/lib/utils"
import { LoadingProgress } from "@/components/loading-progress"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

const DEPARTMENT_OPTIONS = [
  { value: "総合理系", label: "総合理系（1年生向け）" },
  { value: "工学部", label: "工学部" },
  { value: "工学部 機械工学科", label: "工学部 機械工学科" },
  { value: "工学部 電気電子工学科", label: "工学部 電気電子工学科" },
  { value: "工学部 情報工学科", label: "工学部 情報工学科" },
  { value: "工学部 建築学科", label: "工学部 建築学科" },
  { value: "工学部 応用理工系学科", label: "工学部 応用理工系学科" },
  { value: "工学部 環境社会工学科", label: "工学部 環境社会工学科" },
  { value: "理学部", label: "理学部" },
  { value: "理学部 数学科", label: "理学部 数学科" },
  { value: "理学部 物理学科", label: "理学部 物理学科" },
  { value: "理学部 化学科", label: "理学部 化学科" },
  { value: "理学部 生物科学科", label: "理学部 生物科学科" },
  { value: "理学部 地球惑星科学科", label: "理学部 地球惑星科学科" },
  { value: "農学部", label: "農学部" },
  { value: "農学部 生物資源科学科", label: "農学部 生物資源科学科" },
  { value: "農学部 応用生命科学科", label: "農学部 応用生命科学科" },
  { value: "農学部 生物機能化学科", label: "農学部 生物機能化学科" },
  { value: "農学部 森林科学科", label: "農学部 森林科学科" },
  { value: "農学部 畜産科学科", label: "農学部 畜産科学科" },
  { value: "農学部 生物環境工学科", label: "農学部 生物環境工学科" },
  { value: "農学部 農業経済学科", label: "農学部 農業経済学科" },
  { value: "獣医学部", label: "獣医学部" },
  { value: "獣医学部 獣医学科", label: "獣医学部 獣医学科" },
  { value: "獣医学部 共同獣医学課程", label: "獣医学部 共同獣医学課程" },
  { value: "医学部", label: "医学部" },
  { value: "医学部 医学科", label: "医学部 医学科" },
  { value: "医学部 保健学科", label: "医学部 保健学科" },
  { value: "歯学部", label: "歯学部" },
  { value: "歯学部 歯学科", label: "歯学部 歯学科" },
  { value: "薬学部", label: "薬学部" },
  { value: "薬学部 薬学科", label: "薬学部 薬学科" },
  { value: "薬学部 薬科学科", label: "薬学部 薬科学科" },
  { value: "文学部", label: "文学部" },
  { value: "文学部 人文学科", label: "文学部 人文学科" },
  { value: "教育学部", label: "教育学部" },
  { value: "教育学部 教育学科", label: "教育学部 教育学科" },
  { value: "法学部", label: "法学部" },
  { value: "法学部 法学課程", label: "法学部 法学課程" },
  { value: "経済学部", label: "経済学部" },
  { value: "経済学部 経済学科", label: "経済学部 経済学科" },
  { value: "経済学部 経営学科", label: "経済学部 経営学科" },
  { value: "その他", label: "その他" },
]

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
  grade_level?: string
  grade_score?: string
  difficulty_level?: string
  created_at: string
  is_liked?: boolean
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
  const [gradeLevel, setGradeLevel] = useState("")
  const [gradeScore, setGradeScore] = useState("")
  const [difficultyLevel, setDifficultyLevel] = useState("")

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
  const [loadingComments, setLoadingComments] = useState<number | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)

  const fetchList = async (retryCount = 0) => {
    setLoading(true)
    setError("")
    try {
      const params = new URLSearchParams()
      if (q) params.set('q', q)
      if (dept && dept !== 'all') params.set('department', dept)
      if (ys) params.set('year_semester', ys)
      if (gradeLevel && gradeLevel !== 'all') params.set('grade_level', gradeLevel)
      if (gradeScore && gradeScore !== 'all') params.set('grade_score', gradeScore)
      if (difficultyLevel && difficultyLevel !== 'all') params.set('difficulty_level', difficultyLevel)
      
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000) // 10秒タイムアウト
      
      const res = await fetch(`${API_BASE_URL}/courses/summaries?${params.toString()}`, { 
        cache: 'no-store',
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)
      
      if (!res.ok) {
        if (res.status === 500 && retryCount < 2) {
          // 500エラーの場合は最大2回まで再試行
          console.log(`500エラー、${retryCount + 1}回目の再試行...`)
          setTimeout(() => fetchList(retryCount + 1), 2000 * (retryCount + 1))
          return
        }
        throw new Error(`取得に失敗しました (${res.status})`)
      }
      
      const data = await res.json()
      setList(data || [])
    } catch (e: any) {
      if (e.name === 'AbortError') {
        setError('タイムアウトしました。しばらく待ってから再試行してください。')
      } else if (retryCount < 2) {
        console.log(`エラー発生、${retryCount + 1}回目の再試行...`, e.message)
        setTimeout(() => fetchList(retryCount + 1), 2000 * (retryCount + 1))
        return
      } else {
        setError(e?.message || '取得に失敗しました')
        setList([])
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchList()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // フィルタ変更時の再取得（デバウンス付き）
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (q || (dept && dept !== 'all') || ys || gradeLevel || gradeScore || difficultyLevel) {
        fetchList()
      }
    }, 500) // 500msデバウンス

    return () => clearTimeout(timeoutId)
  }, [q, dept, ys, gradeLevel, gradeScore, difficultyLevel])

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
        setLoadingComments(summaryId)
        const res = await fetch(`${API_BASE_URL}/courses/summaries/${summaryId}/comments`, { cache: 'no-store' })
        const data = await res.json()
        setComments(prev => ({ ...prev, [summaryId]: data || [] }))
      } catch {
        setComments(prev => ({ ...prev, [summaryId]: [] }))
      } finally {
        setLoadingComments(null)
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

  const handleLike = async (summaryId: number) => {
    try {
      const userId = typeof window !== 'undefined' ? localStorage.getItem('user_id') : null
      if (!userId) throw new Error('ユーザーIDが見つかりません')
      
      const res = await fetch(`${API_BASE_URL}/courses/summaries/${summaryId}/like`, {
        method: 'POST',
        headers: { 'X-User-Id': userId }
      })
      
      if (!res.ok) throw new Error('いいねの更新に失敗しました')
      
      const data = await res.json()
      
      // リストを更新
      setList(prev => prev.map(s => 
        s.id === summaryId 
          ? { ...s, like_count: data.like_count, is_liked: data.is_liked }
          : s
      ))
    } catch (e: any) {
      alert(e?.message || 'いいねの更新に失敗しました')
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>授業まとめ一覧</CardTitle>
          <CardDescription>検索や学部・学期で絞り込めます</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            <Input placeholder="キーワード検索" value={q} onChange={(e) => setQ(e.target.value)} className="text-sm" />
            <Select value={dept} onValueChange={setDept}>
              <SelectTrigger className="text-sm">
                <SelectValue placeholder="学部・学科・コースで絞り込み" />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                <SelectItem value="all">すべて</SelectItem>
                {DEPARTMENT_OPTIONS.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input placeholder="学期（例: 2025春）" value={ys} onChange={(e) => setYs(e.target.value)} className="text-sm" />
          </div>
          
          {/* 評価フィルタ */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <Select value={gradeLevel} onValueChange={setGradeLevel}>
              <SelectTrigger className="text-sm">
                <SelectValue placeholder="学年で絞り込み" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべて</SelectItem>
                <SelectItem value="1年">1年</SelectItem>
                <SelectItem value="2年">2年</SelectItem>
                <SelectItem value="3年">3年</SelectItem>
                <SelectItem value="4年">4年</SelectItem>
                <SelectItem value="修士">修士</SelectItem>
                <SelectItem value="博士">博士</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={gradeScore} onValueChange={setGradeScore}>
              <SelectTrigger className="text-sm">
                <SelectValue placeholder="成績で絞り込み" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべて</SelectItem>
                <SelectItem value="A+">A+</SelectItem>
                <SelectItem value="A">A</SelectItem>
                <SelectItem value="A-">A-</SelectItem>
                <SelectItem value="B+">B+</SelectItem>
                <SelectItem value="B">B</SelectItem>
                <SelectItem value="B-">B-</SelectItem>
                <SelectItem value="C+">C+</SelectItem>
                <SelectItem value="C">C</SelectItem>
                <SelectItem value="D">D</SelectItem>
                <SelectItem value="D-">D-</SelectItem>
                <SelectItem value="F">F</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={difficultyLevel} onValueChange={setDifficultyLevel}>
              <SelectTrigger className="text-sm">
                <SelectValue placeholder="取りやすさで絞り込み" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべて</SelectItem>
                <SelectItem value="ど仏">ど仏</SelectItem>
                <SelectItem value="仏">仏</SelectItem>
                <SelectItem value="普通">普通</SelectItem>
                <SelectItem value="鬼">鬼</SelectItem>
                <SelectItem value="ど鬼">ど鬼</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end">
            <Button variant="outline" onClick={fetchList}>絞り込み</Button>
          </div>

          <LoadingProgress isLoading={loading} text="授業まとめを読み込み中..." />
          {error && <div className="text-sm text-red-500">{error}</div>}
          {!loading && !error && list.length === 0 && <div className="text-sm text-muted-foreground">まだまとめがありません</div>}

          <div className="space-y-3">
            {list.map((s) => (
              <div key={`course-summary-${s.id}`} id={`course-${s.id}`} className="border rounded p-2 sm:p-3">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm sm:text-base font-semibold text-foreground break-words">{s.title}</div>
                    <div className="text-xs text-muted-foreground mt-1 space-y-1">
                      <div className="break-words">{s.course_name} {s.instructor}</div>
                      <div className="break-words">{s.department} {s.year_semester} {s.tags && `#${s.tags}`}</div>
                      {/* 評価情報 */}
                      {(s.grade_level || s.grade_score || s.difficulty_level) && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {s.grade_level && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-700">
                              学年: {s.grade_level}
                            </span>
                          )}
                          {s.grade_score && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-green-100 text-green-700">
                              成績: {s.grade_score}
                            </span>
                          )}
                          {s.difficulty_level && (
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs ${
                              s.difficulty_level === 'ど仏' ? 'bg-green-100 text-green-700' :
                              s.difficulty_level === '仏' ? 'bg-green-100 text-green-700' :
                              s.difficulty_level === '普通' ? 'bg-yellow-100 text-yellow-700' :
                              s.difficulty_level === '鬼' ? 'bg-red-100 text-red-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                              取りやすさ: {s.difficulty_level}
                            </span>
                          )}
                        </div>
                      )}
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
                  <div className="flex items-center gap-3">
                    <div>投稿者: {s.author_name}</div>
                    <button 
                      className={`flex items-center gap-1 hover:underline ${
                        s.is_liked ? 'text-red-500' : 'text-muted-foreground hover:text-red-500'
                      }`}
                      onClick={() => handleLike(s.id)}
                    >
                      <span className={s.is_liked ? 'text-red-500' : ''}>❤️</span>
                      {s.like_count}
                    </button>
                  </div>
                  <button className="text-primary hover:underline" onClick={() => toggleComments(s.id)}>
                    コメントを{openComments[s.id] ? '閉じる' : '見る'} ({s.comment_count})
                  </button>
                </div>
                {openComments[s.id] && (
                  <div className="mt-2 border-t pt-2 space-y-2">
                    {loadingComments === s.id ? (
                      <div className="py-2">
                        <LoadingProgress isLoading={true} text="コメントを読み込み中..." />
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {(comments[s.id] || []).map(c => (
                        <div key={`course-comment-${c.id}`} className="text-sm">
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
                    )}
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


