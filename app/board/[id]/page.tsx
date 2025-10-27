"use client"

import { Header } from "@/components/header"
import { BoardHeader } from "@/components/board/board-header"
import { PostList } from "@/components/board/post-list"
import { useState, useEffect, useRef } from "react"
import { useSearchParams, useRouter, useParams } from "next/navigation"

// route params are read via useParams on client

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

export default function BoardPage() {
  const { id } = useParams<{ id: string }>()
  const searchParams = useSearchParams()
  const highlightPostId = searchParams.get('post_id')
  const router = useRouter()
  // 初回のpost_idを保持（URLを消しても一度だけ使えるように）
  const initialHighlightRef = useRef<string | null>(highlightPostId)
  const board = boardInfo[id as keyof typeof boardInfo] || boardInfo["1"]
  const [refreshKey, setRefreshKey] = useState(0)
  useEffect(() => {
    const markVisited = async () => {
      try {
        const userId = typeof window !== 'undefined' ? localStorage.getItem('user_id') : null
        const email = typeof window !== 'undefined' ? localStorage.getItem('user_email') : null
        const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
        await fetch(`${API_BASE_URL}/board/visit/${id}`, {
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
  }, [id])


  // ナビゲート（post_idによるハイライト）は到達直後の1回だけ。
  // 一度ページに入ったらURLのpost_idクエリを消して恒久的に無効化する。
  useEffect(() => {
    if (initialHighlightRef.current) {
      // スクロールは親の初期描画で行われるため、ここではURLだけ消す
      router.replace(`/board/${id}`, { scroll: false })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-6 max-w-4xl">
        <BoardHeader title={board.title} description={board.description} />

        <div className="mt-8 space-y-6">
        <PostList boardId={id} refreshKey={refreshKey} highlightPostId={initialHighlightRef.current} />
        </div>
      </main>
    </div>
  )
}
