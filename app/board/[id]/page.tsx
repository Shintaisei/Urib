"use client"

import { Header } from "@/components/header"
import { BoardHeader } from "@/components/board-header"
import { PostList } from "@/components/post-list"
import { PostForm } from "@/components/post-form"
import { useState, useEffect } from "react"
import { use } from "react"
import { useSearchParams } from "next/navigation"

interface BoardPageProps {
  params: Promise<{
    id: string
  }>
}

// 掲示板情報（北大特化）
const boardInfo = {
  "1": {
    title: "全体掲示板",
    description: "北大生みんなで使える総合掲示板",
    memberCount: 0,
  },
  "2": {
    title: "授業・履修",
    description: "授業の情報、履修相談、試験対策など",
    memberCount: 0,
  },
  "3": {
    title: "サークル・部活",
    description: "サークル情報、メンバー募集、イベント告知",
    memberCount: 0,
  },
  "4": {
    title: "バイト・就活",
    description: "バイト募集、就活情報、インターン相談",
    memberCount: 0,
  },
  "5": {
    title: "雑談・交流",
    description: "気軽におしゃべり、友達作り、暇つぶし",
    memberCount: 0,
  },
  "6": {
    title: "恋愛・相談",
    description: "恋愛相談、悩み相談、人生相談",
    memberCount: 0,
  },
}

export default function BoardPage({ params }: BoardPageProps) {
  const resolvedParams = use(params)
  const searchParams = useSearchParams()
  const highlightPostId = searchParams.get('post_id')
  const board = boardInfo[resolvedParams.id as keyof typeof boardInfo] || boardInfo["1"]
  const [refreshKey, setRefreshKey] = useState(0)
  useEffect(() => {
    const markVisited = async () => {
      try {
        const userId = typeof window !== 'undefined' ? localStorage.getItem('user_id') : null
        const email = typeof window !== 'undefined' ? localStorage.getItem('user_email') : null
        const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
        await fetch(`${API_BASE_URL}/board/visit/${resolvedParams.id}`, {
          method: 'POST',
          headers: {
            ...(userId ? { 'X-User-Id': userId } : {}),
            ...(email ? { 'X-Dev-Email': email } : {}),
          }
        })
      } catch {}
    }
    markVisited()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedParams.id])

  const handlePostCreated = () => {
    // 投稿が作成されたら、PostListを更新
    setRefreshKey(prev => prev + 1)
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-6 max-w-4xl">
        <BoardHeader title={board.title} description={board.description} />

        <div className="mt-8 space-y-6">
          <PostForm boardId={resolvedParams.id} onPostCreated={handlePostCreated} />
          <PostList boardId={resolvedParams.id} refreshKey={refreshKey} highlightPostId={highlightPostId} />
        </div>
      </main>
    </div>
  )
}
