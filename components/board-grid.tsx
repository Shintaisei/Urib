"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Users, MessageSquare, Clock, Heart } from "lucide-react"
import Link from "next/link"
import type React from "react"
import { useEffect, useState } from "react"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface BoardData {
  id: number
  category: string
  title: string
  description: string
  memberCount: number
  recentPosts: number
  replyCount: number
  likeCount: number
  lastActivity: string
}

type CategoryColorMap = {
  [key: string]: string
}

const initialBoardData: BoardData[] = [
  {
    id: 1,
    category: "全体",
    title: "全体掲示板",
    description: "北大生みんなで使える総合掲示板",
    memberCount: 0,
    recentPosts: 0,
    replyCount: 0,
    likeCount: 0,
    lastActivity: "-",
  },
  {
    id: 2,
    category: "授業",
    title: "授業・履修",
    description: "授業の情報、履修相談、試験対策など",
    memberCount: 0,
    recentPosts: 0,
    replyCount: 0,
    likeCount: 0,
    lastActivity: "-",
  },
  {
    id: 3,
    category: "部活",
    title: "サークル・部活",
    description: "サークル情報、メンバー募集、イベント告知",
    memberCount: 0,
    recentPosts: 0,
    replyCount: 0,
    likeCount: 0,
    lastActivity: "-",
  },
  {
    id: 4,
    category: "就活",
    title: "バイト・就活",
    description: "バイト募集、就活情報、インターン相談",
    memberCount: 0,
    recentPosts: 0,
    replyCount: 0,
    likeCount: 0,
    lastActivity: "-",
  },
  {
    id: 5,
    category: "雑談",
    title: "雑談・交流",
    description: "気軽におしゃべり、友達作り、暇つぶし",
    memberCount: 0,
    recentPosts: 0,
    replyCount: 0,
    likeCount: 0,
    lastActivity: "-",
  },
  {
    id: 6,
    category: "相談",
    title: "恋愛・相談",
    description: "恋愛相談、悩み相談、人生相談",
    memberCount: 0,
    recentPosts: 0,
    replyCount: 0,
    likeCount: 0,
    lastActivity: "-",
  },
]

const categoryColors: CategoryColorMap = {
  全体: "bg-slate-100 text-slate-800 border-slate-200",
  授業: "bg-blue-100 text-blue-800 border-blue-200",
  部活: "bg-purple-100 text-purple-800 border-purple-200",
  就活: "bg-green-100 text-green-800 border-green-200",
  雑談: "bg-orange-100 text-orange-800 border-orange-200",
  相談: "bg-pink-100 text-pink-800 border-pink-200",
}

interface BoardGridProps {
  boards?: BoardData[]
}

export function BoardGrid({ boards }: BoardGridProps): React.ReactElement {
  const [boardsWithStats, setBoardsWithStats] = useState<BoardData[]>(initialBoardData)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/board/stats`)
        const data = await response.json()
        
        // 統計情報を各掲示板にマージ
        const updatedBoards = initialBoardData.map(board => {
          const stat = data.stats.find((s: any) => s.board_id === board.id)
          if (stat) {
            return {
              ...board,
              recentPosts: stat.post_count,
              replyCount: stat.reply_count,
              likeCount: stat.like_count,
              lastActivity: stat.last_activity ? getTimeDiff(stat.last_activity) : "-"
            }
          }
          return board
        })
        
        setBoardsWithStats(updatedBoards)
      } catch (error) {
        console.error('Failed to fetch board stats:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  const getTimeDiff = (createdAt: string): string => {
    const now = new Date()
    const created = new Date(createdAt)
    const diffMs = now.getTime() - created.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return "たった今"
    if (diffMins < 60) return `${diffMins}分前`
    if (diffHours < 24) return `${diffHours}時間前`
    return `${diffDays}日前`
  }

  const displayBoards = boards || boardsWithStats

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {displayBoards.map((board: BoardData) => (
        <Card key={board.id} className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <div className="mb-2">
              <Badge variant="outline" className={categoryColors[board.category] || categoryColors["全体"]}>
                {board.category}
              </Badge>
            </div>
            <CardTitle className="text-lg">{board.title}</CardTitle>
            <CardDescription className="text-sm">{board.description}</CardDescription>
          </CardHeader>

          <CardContent className="pt-0">
            <div className="space-y-2 text-sm text-muted-foreground mb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <MessageSquare className="w-4 h-4 mr-1" />
                  投稿 {board.recentPosts}件
                </div>
                <div className="flex items-center">
                  <MessageSquare className="w-4 h-4 mr-1 text-blue-500" />
                  コメント {board.replyCount}件
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Heart className="w-4 h-4 mr-1 text-red-500" />
                  いいね {board.likeCount}件
                </div>
                <div className="flex items-center text-xs">
                  <Clock className="w-3 h-3 mr-1" />
                  {board.lastActivity}
                </div>
              </div>
            </div>

            <Link href={`/board/${board.id}`}>
              <Button className="w-full" size="sm">
                掲示板に入る
              </Button>
            </Link>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
