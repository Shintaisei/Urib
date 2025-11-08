"use client"

import { useState, useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { useCachedFetch } from "@/lib/api-cache"
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

const DEPARTMENT_OPTIONS = [
  { value: "1年生文系", label: "1年生文系" },
  { value: "1年生理系", label: "1年生理系" },
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

type PostType = 'board' | 'market' | 'course' | 'circle'

export function FloatingPostButton() {
  const pathname = usePathname()
  const router = useRouter()
  const { invalidateCache } = useCachedFetch()
  const [isOpen, setIsOpen] = useState(false)
  const [postType, setPostType] = useState<PostType>('board')
  const [submitting, setSubmitting] = useState(false)

  // Board post fields
  const [content, setContent] = useState("")
  const [hashtags, setHashtags] = useState("")
  const [boardId, setBoardId] = useState("1")
  const [boardTagSuggestions, setBoardTagSuggestions] = useState<string[]>([])

  // Market item fields
  const [title, setTitle] = useState("")
  const [price, setPrice] = useState("")
  const [condition, setCondition] = useState("good")
  const [description, setDescription] = useState("")
  const [type, setType] = useState("sell")
  const [contactMethod, setContactMethod] = useState("dm")
  const [marketImages, setMarketImages] = useState<string[]>([])

  // Course summary fields
  const [courseName, setCourseName] = useState("")
  const [instructor, setInstructor] = useState("")
  const [department, setDepartment] = useState("")
  const [yearSemester, setYearSemester] = useState("")
  const [courseTags, setCourseTags] = useState("")
  const [courseContent, setCourseContent] = useState("")
  const [courseTagSuggestions, setCourseTagSuggestions] = useState<string[]>([])
  // 新しい評価フィールド
  const [gradeLevel, setGradeLevel] = useState("")
  const [gradeScore, setGradeScore] = useState("")
  const [difficultyLevel, setDifficultyLevel] = useState("")
  // Template helpers
  const insertCourseTemplate = (text: string) => {
    const exists = (courseContent || '').trim().length > 0
    if (exists) {
      const ok = confirm('現在の内容をテンプレートで置き換えますか？')
      if (!ok) return
    }
    setCourseContent(text)
  }

  // Circle summary fields
  const [circleName, setCircleName] = useState("")
  const [category, setCategory] = useState("")
  const [activityDays, setActivityDays] = useState("")
  const [activityPlace, setActivityPlace] = useState("")
  const [cost, setCost] = useState("")
  const [links, setLinks] = useState("")
  const [circleTags, setCircleTags] = useState("")
  const [circleContent, setCircleContent] = useState("")
  const [circleTagSuggestions, setCircleTagSuggestions] = useState<string[]>([])

  // Helpers: market image handling
  const handleMarketFiles = async (files: FileList | null) => {
    if (!files) return
    const allowedExt = [".jpg", ".jpeg", ".png", ".webp", ".gif"]
    const allowedMime = ["image/jpeg", "image/png", "image/webp", "image/gif"]
    const maxSizeBytes = 8 * 1024 * 1024 // 8MB/枚（入力ファイル許容量）
    const limit = Math.min(3 - marketImages.length, files.length)
    const picked: string[] = []
    const errors: string[] = []
    for (let i = 0; i < limit; i++) {
      const f = files[i]
      const ext = `.${(f.name.split('.').pop() || '').toLowerCase()}`
      if (!allowedMime.includes(f.type) && !allowedExt.includes(ext)) {
        errors.push(`${f.name}: 未対応の形式です`)
        continue
      }
      if (f.size > maxSizeBytes) {
        errors.push(`${f.name}: 1.5MBを超えています`)
        continue
      }
      if (!f.type.startsWith('image/')) {
        errors.push(`${f.name}: 画像ではありません`)
        continue
      }
      const dataUrl = await compressToDataUrl(f)
      picked.push(dataUrl)
    }
    if (picked.length > 0) setMarketImages(prev => [...prev, ...picked].slice(0, 3))
    if (errors.length > 0) alert(`一部の画像を追加できませんでした:\n- ${errors.join('\n- ')}`)
  }

  const compressToDataUrl = async (file: File): Promise<string> => {
    const imageBitmap = await createImageBitmap(file)
    const maxDim = 1200
    let { width, height } = imageBitmap
    if (width > maxDim || height > maxDim) {
      const ratio = Math.min(maxDim / width, maxDim / height)
      width = Math.round(width * ratio)
      height = Math.round(height * ratio)
    }
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(imageBitmap, 0, 0, width, height)
    const mime = file.type === 'image/png' ? 'image/png' : 'image/jpeg'
    const quality = mime === 'image/png' ? undefined : 0.75
    return canvas.toDataURL(mime, quality as any)
  }

  const removeMarketImage = (idx: number) => {
    setMarketImages(prev => prev.filter((_, i) => i !== idx))
  }

  // Determine post type based on current page (pathname first)
  useEffect(() => {
    if (pathname?.includes('/market')) {
      setPostType('market')
    } else if (pathname?.startsWith('/board/')) {
      setPostType('board')
    } else if (pathname === '/home' || pathname === '/') {
      // 詳細は下のDOM観察で再判定する
      setPostType('board')
    } else {
      setPostType('board')
    }
  }, [pathname])

  // Check for active tab in home page (DOM-based)
  useEffect(() => {
    // イベント購読（推奨経路）
    const onActiveTabChange = (ev: Event) => {
      const e = ev as CustomEvent
      const detail = (e && (e as any).detail) || {}
      const a = detail.activeTab as string | undefined
      const s = detail.summaryTab as string | undefined
      if (a === 'market') {
        setPostType('market')
        return
      }
      if (a === 'summaries') {
        if (s === 'courses') {
          setPostType('course')
          return
        }
        if (s === 'circles') {
          setPostType('circle')
          return
        }
      }
      if (a === 'boards' || a === 'feed') {
        setPostType('board')
        return
      }
    }
    window.addEventListener('uriv:activeTabChange' as any, onActiveTabChange as any)

    if (pathname === '/home' || pathname === '/') {
      const checkActiveTab = () => {
        // まずトップレベルのアクティブタブを取得
        const topActive = document.querySelector('button.border-b-2.border-primary, button[class*="border-b-2"][class*="border-primary"]') as HTMLElement | null
        const topText = topActive?.textContent || ''

        if (topText.includes('中古品売買') || topText.includes('書籍売買')) {
          setPostType('market')
          return
        }

        // summaries（サークル授業レビュー）内の内部タブを判定
        if (topText.includes('サークル授業レビュー')) {
          const innerActiveCourse = Array.from(document.querySelectorAll('button'))
            .find(el => el.textContent?.includes('授業まとめ') && el.className.includes('bg-muted') && el.className.includes('text-foreground'))
          const innerActiveCircle = Array.from(document.querySelectorAll('button'))
            .find(el => el.textContent?.includes('サークルまとめ') && el.className.includes('bg-muted') && el.className.includes('text-foreground'))

          if (innerActiveCourse) {
            setPostType('course')
            return
          }
          if (innerActiveCircle) {
            setPostType('circle')
            return
          }
          // デフォルトは授業まとめに寄せるより安全に掲示板
          setPostType('board')
          return
        }

        // それ以外は掲示板
        setPostType('board')
      }
      
      checkActiveTab()
      // タブクリック時の変更を検出
      const observer = new MutationObserver(checkActiveTab)
      observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] })
      
      return () => {
        observer.disconnect()
        window.removeEventListener('uriv:activeTabChange' as any, onActiveTabChange as any)
      }
    }
    return () => {
      window.removeEventListener('uriv:activeTabChange' as any, onActiveTabChange as any)
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
        if (type === 'sell') {
          const p = price.trim() === '' ? NaN : parseInt(price, 10)
          if (Number.isNaN(p) || p < 0) {
            throw new Error('価格は0円以上で入力してください')
          }
        }
        endpoint = `${API_BASE_URL}/market/items${cacheBuster}`
        body = {
          title: title.trim(),
          description: description.trim(),
          type: type,
          // 売りたい: 0円以上を必須、買いたい: 任意（未入力はnull）
          price: type === 'sell' ? (parseInt(price) || 0) : (price.trim() ? (parseInt(price) || null) : null),
          condition: condition,
          contact_method: contactMethod,
          images: marketImages.slice(0, 3)
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
      const created = await res.json().catch(() => ({}))
      
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
      
      // 軽量なキャッシュ無効化と遷移（遷移後にrefreshで最新化）
      try {
        if (postType === 'board') {
          // フィード/掲示板キャッシュを無効化
          invalidateCache('feed-latest')
          invalidateCache('board-stats')
          const pid = created?.id
          const bid = body && (body as any).board_id
          if (pid && bid) {
            invalidateCache(`posts-${bid}`)
            router.push(`/board/${bid}?post_id=${pid}`)
            setTimeout(() => {
              try { router.refresh() } catch {}
            }, 300)
          }
        } else if (postType === 'market') {
          invalidateCache('market-items')
          const mid = created?.id || created?.item_id || created?.itemId
          if (mid) {
            router.push(`/market#market-${mid}`)
          } else {
            router.push('/market')
          }
          setTimeout(() => {
            try { router.refresh() } catch {}
          }, 300)
        } else if (postType === 'course') {
          const sid = created?.id
          router.push(sid ? `/home#course-${sid}` : '/home')
          setTimeout(() => { try { router.refresh() } catch {} }, 300)
        } else if (postType === 'circle') {
          const sid = created?.id
          router.push(sid ? `/home#circle-${sid}` : '/home')
          setTimeout(() => { try { router.refresh() } catch {} }, 300)
        }
      } catch {}
      
      alert(`${postTypeText}が完了しました！`)
    } catch (e: any) {
      alert(e?.message || '投稿に失敗しました')
    } finally {
      setSubmitting(false)
    }
  }

  // ---- Auto hashtag suggestions (軽量キーワード抽出) ----
  const STOPWORDS_JA = new Set([
    "これ","それ","あれ","ここ","そこ","あそこ","そして","しかし","でも","また","ため","こと","もの","よう","とき","ところ","ので","のでしょう","です","ます","でした","でしたら","する","した","して","なる","ある","いる","やる","られる","れる","ない","的","にて","により","について","など","とか","から","まで","より","なら","が","を","に","へ","で","と","や","の","も","は","ね","よ","ぞ","わ","かな","ですか","ますか"
  ])
  const extractKeywords = (text: string): string[] => {
    if (!text) return []
    const cleaned = text
      .replace(/https?:\/\/\S+/g, ' ') // URL除去
      .replace(/[@＠]\S+/g, ' ') // メンション除去
    const tokens: string[] = []
    // カタカナ2文字以上
    const katakana = cleaned.match(/[ァ-ヴー]{2,}/g) || []
    // 漢字2文字以上（々含む）
    const kanji = cleaned.match(/[一-龥々〆ヵヶ]{2,}/g) || []
    // 英数字3文字以上
    const latin = cleaned.match(/[A-Za-z0-9][A-Za-z0-9_-]{2,}/g) || []
    tokens.push(...katakana, ...kanji, ...latin)
    const freq = new Map<string, number>()
    for (const t of tokens) {
      const key = t.trim()
      if (!key) continue
      if (STOPWORDS_JA.has(key)) continue
      freq.set(key, (freq.get(key) || 0) + 1)
    }
    const sorted = Array.from(freq.entries()).sort((a, b) => b[1] - a[1]).map(([k]) => k)
    // 先頭5件程度
    return sorted.slice(0, 5)
  }
  useEffect(() => {
    setBoardTagSuggestions(extractKeywords(content))
  }, [content])
  useEffect(() => {
    setCourseTagSuggestions(extractKeywords(courseContent))
  }, [courseContent])
  useEffect(() => {
    setCircleTagSuggestions(extractKeywords(circleContent))
  }, [circleContent])
  const appendTagToInput = (current: string, tag: string): string => {
    const parts = (current || '').split(/\s+/).filter(Boolean)
    if (parts.includes(tag)) return current
    return (parts.concat([tag])).join(' ')
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
    setMarketImages([])
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
                    {boardTagSuggestions.length > 0 && (
                      <div className="mt-2">
                        <div className="text-[11px] text-muted-foreground mb-1">おすすめタグ</div>
                        <div className="flex flex-wrap gap-1.5">
                          {boardTagSuggestions.map(tag => (
                            <button
                              key={`sug-board-${tag}`}
                              type="button"
                              className="px-2 py-0.5 rounded text-[11px] bg-muted hover:bg-primary/10 text-foreground"
                              onClick={() => setHashtags(prev => appendTagToInput(prev, tag))}
                            >
                              #{tag}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
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
                        min={0}
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

                  {/* 画像アップロード（最大3枚） */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">商品画像（最大3枚）</label>
                    <div
                      className="border-2 border-dashed rounded-md p-4 text-center text-xs text-muted-foreground hover:bg-muted/30"
                      onDragOver={(e) => { e.preventDefault(); e.stopPropagation() }}
                      onDrop={(e) => { e.preventDefault(); e.stopPropagation(); handleMarketFiles(e.dataTransfer.files) }}
                      onClick={() => {
                        try { (document.getElementById('market-image-input') as HTMLInputElement)?.click() } catch {}
                      }}
                    >
                      クリックまたは画像をドラッグ＆ドロップして追加
                      <Input
                        id="market-image-input"
                        type="file"
                        accept=".jpg,.jpeg,.png,.webp,.gif"
                        multiple
                        onChange={(e) => handleMarketFiles(e.target.files)}
                        className="text-sm hidden"
                      />
                    </div>
                    {marketImages.length > 0 && (
                      <div className="grid grid-cols-3 gap-2 mt-2">
                        {marketImages.map((src, idx) => (
                          <div key={idx} className="relative">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={src} alt={`img-${idx}`} className="w-full h-20 object-contain bg-background rounded" />
                            <Button type="button" size="sm" variant="outline" className="absolute top-1 right-1 h-6 px-2 text-xs" onClick={() => removeMarketImage(idx)}>削除</Button>
                          </div>
                        ))}
                      </div>
                    )}
                    <p className="text-[11px] text-muted-foreground mt-1">各画像 8MB 以内（送信時に自動圧縮）、JPG/PNG/WEBP/GIF</p>
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
                    <Select value={department} onValueChange={setDepartment}>
                      <SelectTrigger className="text-sm">
                        <SelectValue placeholder="学部・学科・コースを選択" />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        {DEPARTMENT_OPTIONS.map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                  
                  {/* テンプレートを使う */}
                  <div>
                    <div className="text-[11px] text-muted-foreground mb-1">テンプレートを使う（数字が大きいほど詳しい）</div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={() => {
                          const t =
                            "【授業の概要】\n" +
                            "授業の目的・内容を1〜2行で\n\n" +
                            "【評価方法】\n" +
                            "出席: ／ 小テスト: ／ 課題: ／ 期末試験:\n\n" +
                            "【取りやすさ】\n" +
                            "ど仏 / 仏 / 普通 / 鬼 / ど鬼（理由を1行で）\n\n" +
                            "【おすすめ・注意】\n" +
                            "一言メモ（例: 欠席厳しめ／小テスト頻度高め 等）"
                          insertCourseTemplate(t)
                        }}
                      >① かんたん</Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={() => {
                          const t =
                            "【基本情報】\n" +
                            "授業名: ／ 教員名: ／ 学期: ／ 学部・コース:\n\n" +
                            "【授業の流れ・教材】\n" +
                            "毎回の進め方・扱うテーマ／使用教材・配布資料など\n\n" +
                            "【課題・試験】\n" +
                            "課題の頻度・量・締切／試験の形式（持ち込み可/不可 等）\n\n" +
                            "【成績配分（目安）】\n" +
                            "出席 % ／ 小テスト % ／ 課題 % ／ 期末 %\n\n" +
                            "【コツ・履修のヒント】\n" +
                            "理解のコツ・よく出る範囲・勉強時間の目安\n\n" +
                            "【対象/履修者層】\n" +
                            "想定学年・履修者の傾向（理系/文系/必修/選択 など）"
                          insertCourseTemplate(t)
                        }}
                      >② ふつう</Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={() => {
                          const t =
                            "【概要】\n" +
                            "授業のねらい・全体像\n\n" +
                            "【到達目標】\n" +
                            "この授業でできるようになること\n\n" +
                            "【進行（週ごとメモ可）】\n" +
                            "第1回: \n第2回: \n第3回: \n...\n\n" +
                            "【教材・参考書】\n" +
                            "教科書／配布資料／参考文献／サイトなど\n\n" +
                            "【成績内訳（実績）】\n" +
                            "出席 % ／ 小テスト % ／ 課題 % ／ 期末 %\n\n" +
                            "【課題・試験の具体】\n" +
                            "課題例・ボリューム／試験の出題傾向\n\n" +
                            "【大変だった点・時間】\n" +
                            "毎週の学習時間目安／詰まりやすい箇所\n\n" +
                            "【難易度/取りやすさ】\n" +
                            "ど仏 / 仏 / 普通 / 鬼 / ど鬼（理由も）\n\n" +
                            "【前提・おすすめ準備】\n" +
                            "履修前にあると楽な知識・科目・資料\n\n" +
                            "【その他】\n" +
                            "オンライン/対面、出席確認方法、小テスト頻度 等\n\n" +
                            "【キーワード】\n" +
                            "関連用語（例: ベクトル空間, 固有値, ...）"
                          insertCourseTemplate(t)
                        }}
                      >③ しっかり</Button>
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
                    postType === 'market' && (!title.trim() || !description.trim() || (type === 'sell' && (price.trim() === '' || isNaN(parseInt(price)) || parseInt(price) < 0))) ||
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
