"use client"

import { useState } from "react"
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

export function FloatingPostButton() {
  const [isOpen, setIsOpen] = useState(false)
  const [content, setContent] = useState("")
  const [hashtags, setHashtags] = useState("")
  const [boardId, setBoardId] = useState("1")
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!content.trim()) return
    
    setSubmitting(true)
    try {
      const userId = typeof window !== 'undefined' ? localStorage.getItem('user_id') : null
      if (!userId) throw new Error('ユーザーIDが見つかりません')
      
      const res = await fetch(`${API_BASE_URL}/board/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-User-Id': userId },
        body: JSON.stringify({
          board_id: boardId,
          content: content.trim(),
          hashtags: hashtags.trim() || null
        })
      })
      
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d?.detail || '投稿に失敗しました')
      }
      
      // 成功時はフォームをリセットして閉じる
      setContent("")
      setHashtags("")
      setBoardId("1")
      setIsOpen(false)
      
      // ページをリロードして新しい投稿を表示
      window.location.reload()
    } catch (e: any) {
      alert(e?.message || '投稿に失敗しました')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      {/* フローティングボタン */}
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 bg-primary hover:bg-primary/90"
        size="icon"
      >
        <Plus className="h-6 w-6" />
      </Button>

      {/* モーダル */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="text-lg">新規投稿</CardTitle>
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
                  disabled={submitting || !content.trim()}
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
