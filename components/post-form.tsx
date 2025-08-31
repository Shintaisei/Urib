"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Send, Loader2 } from "lucide-react"

export function PostForm() {
  const [content, setContent] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!content.trim()) return

    setIsSubmitting(true)

    // Simulate API call
    setTimeout(() => {
      setIsSubmitting(false)
      setContent("")
      // In real app, this would refresh the post list
    }, 1000)
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">新しい投稿</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Textarea
            placeholder="匿名で投稿できます。大学生活に関する情報や質問を自由に書き込んでください..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-[120px] resize-none"
            maxLength={500}
          />

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
