"use client"

import { useState, useEffect } from "react"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { X, Plus } from "lucide-react"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

const BOARD_OPTIONS = [
  { value: "1", label: "全体" },
  { value: "2", label: "授業" },
  { value: "3", label: "部活" },
  { value: "4", label: "就活" },
  { value: "5", label: "雑談" },
  { value: "6", label: "相談" }
]

type PostType = 'board' | 'market' | 'course' | 'circle'

export function FloatingPostButton() {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const [postType, setPostType] = useState<PostType>('board')
  const [submitting, setSubmitting] = useState(false)

  // Board post fields
  const [content, setContent] = useState("")
  const [hashtags, setHashtags] = useState("")
  const [boardId, setBoardId] = useState("1")

  // Market item fields
  const [title, setTitle] = useState("")
  const [price, setPrice] = useState("")
  const [condition, setCondition] = useState("good")
  const [description, setDescription] = useState("")
  const [type, setType] = useState("sell")
  const [contactMethod, setContactMethod] = useState("dm")

  // Course summary fields
  const [courseName, setCourseName] = useState("")
  const [instructor, setInstructor] = useState("")
  const [department, setDepartment] = useState("")
  const [yearSemester, setYearSemester] = useState("")
  const [courseTags, setCourseTags] = useState("")
  const [courseContent, setCourseContent] = useState("")
  // 新しい評価フィールド
  const [gradeLevel, setGradeLevel] = useState("")
  const [gradeScore, setGradeScore] = useState("")
  const [difficultyLevel, setDifficultyLevel] = useState("")

  // Circle summary fields
  const [circleName, setCircleName] = useState("")
  const [category, setCategory] = useState("")
  const [activityDays, setActivityDays] = useState("")
  const [activityPlace, setActivityPlace] = useState("")
  const [cost, setCost] = useState("")
  const [links, setLinks] = useState("")
  const [circleTags, setCircleTags] = useState("")
  const [circleContent, setCircleContent] = useState("")

  // Determine post type based on current page
  useEffect(() => {
    if (pathname?.includes('/market')) {
      setPostType('market')
    } else {
      setPostType('board')
    }
  }, [pathname])

  // Check for active tab in home page
  useEffect(() => {
    if (pathname === '/home' || pathname === '/') {
      const checkActiveTab = () => {
        const activeTabElement = document.querySelector('[class*="border-primary text-primary"]')
        if (activeTabElement?.textContent?.includes('授業まとめ')) {
          setPostType('course')
        } else if (activeTabElement?.textContent?.includes('サークルまとめ')) {
          setPostType('circle')
        } else if (activeTabElement?.textContent?.includes('書籍売買')) {
          setPostType('market')
        } else {
          setPostType('board')
        }
      }
      
      checkActiveTab()
      // タブクリック時の変更を検出
      const observer = new MutationObserver(checkActiveTab)
      observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] })
      
      return () => observer.disconnect()
    }
  }, [pathname])

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      const userId = typeof window !== 'undefined' ? localStorage.getItem('user_id') : null
      if (!userId) throw new Error('ユーザーIDが見つかりません')
      
      const cacheBuster = `?_t=${Date.now()}`
      let endpoint = ''
      let body = {}

      if (postType === 'board') {
        if (!content.trim()) throw new Error('内容を入力してください')
        endpoint = `${API_BASE_URL}/board/posts${cacheBuster}`
        body = {
          board_id: boardId,
          content: content.trim(),
          hashtags: hashtags.trim() || null
        }
      } else if (postType === 'market') {
        if (!title.trim() || !description.trim()) {
          throw new Error('タイトルと説明は必須です')
        }
        if (type !== 'free' && (!price.trim() || parseInt(price) <= 0)) {
          throw new Error('価格を正しく入力してください')
        }
        endpoint = `${API_BASE_URL}/market/items${cacheBuster}`
        body = {
          title: title.trim(),
          description: description.trim(),
          type: type,
          price: type === 'free' ? null : parseInt(price) || null,
          condition: condition,
          contact_method: contactMethod,
          images: []
        }
      } else if (postType === 'course') {
        if (!courseContent.trim()) throw new Error('内容を入力してください')
        endpoint = `${API_BASE_URL}/courses/summaries${cacheBuster}`
        body = {
          title: null,
          course_name: courseName.trim() || null,
          instructor: instructor.trim() || null,
          department: department.trim() || null,
          year_semester: yearSemester.trim() || null,
          tags: courseTags.trim() || null,
          content: courseContent.trim(),
          grade_level: gradeLevel.trim() || null,
          grade_score: gradeScore.trim() || null,
          difficulty_level: difficultyLevel.trim() || null
        }
      } else if (postType === 'circle') {
        if (!circleContent.trim()) throw new Error('内容を入力してください')
        endpoint = `${API_BASE_URL}/circles/summaries${cacheBuster}`
        body = {
          title: null,
          circle_name: circleName.trim() || null,
          category: category.trim() || null,
          activity_days: activityDays.trim() || null,
          activity_place: activityPlace.trim() || null,
          cost: cost.trim() || null,
          links: links.trim() || null,
          tags: circleTags.trim() || null,
          content: circleContent.trim()
        }
      }
      
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'X-User-Id': userId,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
        body: JSON.stringify(body)
      })
      
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d?.detail || '投稿に失敗しました')
      }
      
      // 成功時はフォームをリセットして閉じる
      resetForm()
      setIsOpen(false)
      
      // 成功メッセージを表示（リロードなし）
      const postTypeText = {
        'board': '投稿',
        'market': '書籍出品',
        'course': '授業まとめ',
        'circle': 'サークルまとめ'
      }[postType] || '投稿'
      
      alert(`${postTypeText}が完了しました！新しい投稿を確認するには手動でページを更新してください。`)
    } catch (e: any) {
      alert(e?.message || '投稿に失敗しました')
    } finally {
      setSubmitting(false)
    }
  }

  const resetForm = () => {
    setContent("")
    setHashtags("")
    setBoardId("1")
    setTitle("")
    setPrice("")
    setCondition("good")
    setDescription("")
    setType("sell")
    setContactMethod("dm")
    setCourseName("")
    setInstructor("")
    setDepartment("")
    setYearSemester("")
    setCourseTags("")
    setCourseContent("")
    setGradeLevel("")
    setGradeScore("")
    setDifficultyLevel("")
    setCircleName("")
    setCategory("")
    setActivityDays("")
    setActivityPlace("")
    setCost("")
    setLinks("")
    setCircleTags("")
    setCircleContent("")
  }

  return (
    <>
      {/* フローティングボタン */}
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 h-16 px-6 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 bg-primary hover:bg-primary/90 flex items-center gap-2 text-white font-semibold"
      >
        <Plus className="h-6 w-6" />
        <span className="hidden sm:inline">投稿する</span>
      </Button>

      {/* モーダル */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="text-lg">
                {postType === 'board' && '新規投稿'}
                {postType === 'market' && '書籍を出品'}
                {postType === 'course' && '授業まとめを投稿'}
                {postType === 'circle' && 'サークルまとめを投稿'}
              </CardTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
                className="h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {postType === 'board' && (
                <>
                  <div>
                    <label className="text-sm font-medium mb-2 block">掲示板</label>
                    <Select value={boardId} onValueChange={setBoardId}>
                      <SelectTrigger className="text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {BOARD_OPTIONS.map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">内容</label>
                    <Textarea
                      placeholder="投稿内容を入力してください..."
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      className="min-h-[120px] text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">ハッシュタグ（スペース区切り）</label>
                    <Input
                      placeholder="例: 授業 質問 重要"
                      value={hashtags}
                      onChange={(e) => setHashtags(e.target.value)}
                      className="text-sm"
                    />
                  </div>
                </>
              )}

              {postType === 'market' && (
                <>
                  <div>
                    <label className="text-sm font-medium mb-2 block">タイトル</label>
                    <Input
                      placeholder="例: 線形代数の教科書"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="text-sm font-medium mb-2 block">種類</label>
                      <Select value={type} onValueChange={setType}>
                        <SelectTrigger className="text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="sell">売ります</SelectItem>
                          <SelectItem value="buy">買います</SelectItem>
                          <SelectItem value="free">譲ります</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">価格（円）</label>
                      <Input
                        type="number"
                        placeholder="1000"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        className="text-sm"
                        disabled={type === 'free'}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="text-sm font-medium mb-2 block">状態</label>
                      <Select value={condition} onValueChange={setCondition}>
                        <SelectTrigger className="text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="new">新品</SelectItem>
                          <SelectItem value="like_new">ほぼ新品</SelectItem>
                          <SelectItem value="good">良好</SelectItem>
                          <SelectItem value="fair">普通</SelectItem>
                          <SelectItem value="poor">傷あり</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">連絡方法</label>
                      <Select value={contactMethod} onValueChange={setContactMethod}>
                        <SelectTrigger className="text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="dm">DM</SelectItem>
                          <SelectItem value="email">メール</SelectItem>
                          <SelectItem value="phone">電話</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">説明</label>
                    <Textarea
                      placeholder="商品の詳細説明..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="min-h-[100px] text-sm"
                    />
                  </div>
                </>
              )}

              {postType === 'course' && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <Input
                      placeholder="授業名（例: 線形代数）"
                      value={courseName}
                      onChange={(e) => setCourseName(e.target.value)}
                      className="text-sm"
                    />
                    <Input
                      placeholder="教員名"
                      value={instructor}
                      onChange={(e) => setInstructor(e.target.value)}
                      className="text-sm"
                    />
                    <Input
                      placeholder="学部（例: 工学部）"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      className="text-sm"
                    />
                    <Input
                      placeholder="学期（例: 2025春）"
                      value={yearSemester}
                      onChange={(e) => setYearSemester(e.target.value)}
                      className="text-sm"
                    />
                    <Input
                      placeholder="タグ（スペース区切り）"
                      value={courseTags}
                      onChange={(e) => setCourseTags(e.target.value)}
                      className="text-sm sm:col-span-2"
                    />
                  </div>
                  
                  {/* 評価フィールド */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div>
                      <label className="text-sm font-medium mb-2 block">学年</label>
                      <Select value={gradeLevel} onValueChange={setGradeLevel}>
                        <SelectTrigger className="text-sm">
                          <SelectValue placeholder="選択" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1年">1年</SelectItem>
                          <SelectItem value="2年">2年</SelectItem>
                          <SelectItem value="3年">3年</SelectItem>
                          <SelectItem value="4年">4年</SelectItem>
                          <SelectItem value="修士">修士</SelectItem>
                          <SelectItem value="博士">博士</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">成績</label>
                      <Select value={gradeScore} onValueChange={setGradeScore}>
                        <SelectTrigger className="text-sm">
                          <SelectValue placeholder="選択" />
                        </SelectTrigger>
                        <SelectContent>
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
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">取りやすさ</label>
                      <Select value={difficultyLevel} onValueChange={setDifficultyLevel}>
                        <SelectTrigger className="text-sm">
                          <SelectValue placeholder="選択" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ど仏">ど仏</SelectItem>
                          <SelectItem value="仏">仏</SelectItem>
                          <SelectItem value="普通">普通</SelectItem>
                          <SelectItem value="鬼">鬼</SelectItem>
                          <SelectItem value="ど鬼">ど鬼</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium mb-2 block">内容</label>
                    <Textarea
                      placeholder="授業概要、評価方法、難易度、おすすめポイント、注意点…"
                      value={courseContent}
                      onChange={(e) => setCourseContent(e.target.value)}
                      className="min-h-[120px] text-sm"
                    />
                  </div>
                </>
              )}

              {postType === 'circle' && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <Input
                      placeholder="サークル名"
                      value={circleName}
                      onChange={(e) => setCircleName(e.target.value)}
                      className="text-sm"
                    />
                    <Input
                      placeholder="カテゴリ（例: 文化系）"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="text-sm"
                    />
                    <Input
                      placeholder="活動日（例: 火・木）"
                      value={activityDays}
                      onChange={(e) => setActivityDays(e.target.value)}
                      className="text-sm"
                    />
                    <Input
                      placeholder="活動場所"
                      value={activityPlace}
                      onChange={(e) => setActivityPlace(e.target.value)}
                      className="text-sm"
                    />
                    <Input
                      placeholder="会費"
                      value={cost}
                      onChange={(e) => setCost(e.target.value)}
                      className="text-sm"
                    />
                    <Input
                      placeholder="リンク（SNS/サイト）"
                      value={links}
                      onChange={(e) => setLinks(e.target.value)}
                      className="text-sm"
                    />
                    <Input
                      placeholder="タグ（スペース区切り）"
                      value={circleTags}
                      onChange={(e) => setCircleTags(e.target.value)}
                      className="text-sm sm:col-span-2"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">内容</label>
                    <Textarea
                      placeholder="活動内容、雰囲気、募集状況、初心者歓迎か、参加方法…"
                      value={circleContent}
                      onChange={(e) => setCircleContent(e.target.value)}
                      className="min-h-[120px] text-sm"
                    />
                  </div>
                </>
              )}
              
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setIsOpen(false)}
                  className="flex-1 text-sm"
                >
                  キャンセル
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={submitting || (
                    postType === 'board' && !content.trim() ||
                    postType === 'market' && (!title.trim() || !description.trim() || (type !== 'free' && (!price.trim() || parseInt(price) <= 0))) ||
                    postType === 'course' && !courseContent.trim() ||
                    postType === 'circle' && !circleContent.trim()
                  )}
                  className="flex-1 text-sm"
                >
                  {submitting ? '投稿中...' : '投稿する'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  )
}
