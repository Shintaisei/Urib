"use client"

import { useState, useEffect } from "react"
import { Progress } from "@/components/ui/progress"

interface LoadingProgressProps {
  isLoading: boolean
  text?: string
  className?: string
}

export function LoadingProgress({ isLoading, text = "読み込み中...", className }: LoadingProgressProps) {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    if (!isLoading) {
      setProgress(0)
      return
    }

    // 進捗バーのアニメーション
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) return prev // 90%で止める
        return prev + Math.random() * 15
      })
    }, 200)

    return () => clearInterval(timer)
  }, [isLoading])

  useEffect(() => {
    if (!isLoading && progress > 0) {
      // ローディング完了時は100%まで一気に進める
      setProgress(100)
      const timer = setTimeout(() => setProgress(0), 300)
      return () => clearTimeout(timer)
    }
  }, [isLoading, progress])

  if (!isLoading && progress === 0) return null

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{text}</span>
        <span className="text-sm text-muted-foreground">{Math.round(progress)}%</span>
      </div>
      <Progress value={progress} className="h-2" />
    </div>
  )
}