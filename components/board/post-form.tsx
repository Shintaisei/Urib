"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { MentionTextarea } from "@/components/ui/forms/mention-textarea"
import { Input } from "@/components/ui/input"
import { Send, Loader2, Hash } from "lucide-react"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface PostFormProps {
  boardId: string
  onPostCreated?: () => void
}

export function PostForm({ boardId, onPostCreated }: PostFormProps) {
  const [content, setContent] = useState("")
  const [hashtags, setHashtags] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!content.trim()) return

    setIsSubmitting(true)
    setError("")

    try {
      // ユーザーIDを取得
      const userId = localStorage.getItem('user_id')
      if (!userId) {
        throw new Error('ユーザーIDが見つかりません。再度登録してください。')
      }
      
      const response = await fetch(`${API_BASE_URL}/board/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': userId,
        },
        body: JSON.stringify({
          board_id: boardId,
          content: content.trim(),
          hashtags: hashtags.trim() || null,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.detail || '投稿に失敗しました')
      }

      // 成功したらフォームをクリア
      setContent("")
      setHashtags("")
      
      // 親コンポーネントに通知
      if (onPostCreated) {
        onPostCreated()
      }
    } catch (err: any) {
      setError(err.message || '投稿に失敗しました')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">新しい投稿</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <MentionTextarea
            placeholder="匿名で投稿できます。大学生活に関する情報や質問を自由に書き込んでください..."
            value={content}
            onChange={setContent}
            className="min-h-[120px] resize-none"
            maxLength={500}
          />

          <div className="space-y-2">
            <label className="text-sm text-muted-foreground flex items-center gap-1">
              <Hash className="w-3 h-3" />
              ハッシュタグ（任意・スペース区切りで複数OK）
            </label>
            <Input
              type="text"
              placeholder="例: 試験 レポート 期末テスト"
              value={hashtags}
              onChange={(e) => setHashtags(e.target.value)}
              maxLength={100}
              className="text-sm"
            />
            <p className="text-xs text-muted-foreground">
              ハッシュタグをつけると検索されやすくなります
            </p>
          </div>

          {error && (
            <div className="text-sm text-red-500">
              {error}
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="text-xs text-muted-foreground">{content.length}/500文字</div>

            <Button type="submit" disabled={!content.trim() || isSubmitting} className="min-w-[100px]">
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  投稿中...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  投稿する
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
