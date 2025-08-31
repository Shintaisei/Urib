import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Users, MessageSquare, Clock } from "lucide-react"
import Link from "next/link"

const boardData = [
  {
    id: 1,
    category: "学部",
    title: "工学部 掲示板",
    description: "工学部の学生向けの情報交換",
    memberCount: 1247,
    recentPosts: 23,
    lastActivity: "2分前",
  },
  {
    id: 2,
    category: "学部",
    title: "文学部 掲示板",
    description: "文学部の学生向けの情報交換",
    memberCount: 892,
    recentPosts: 15,
    lastActivity: "5分前",
  },
  {
    id: 3,
    category: "学科",
    title: "情報理工学系研究科",
    description: "大学院生向けの研究・学習情報",
    memberCount: 456,
    recentPosts: 8,
    lastActivity: "12分前",
  },
  {
    id: 4,
    category: "サークル",
    title: "テニスサークル",
    description: "テニス好きの学生が集まる場所",
    memberCount: 234,
    recentPosts: 12,
    lastActivity: "1時間前",
  },
  {
    id: 5,
    category: "サークル",
    title: "プログラミング研究会",
    description: "プログラミングの情報共有・勉強会",
    memberCount: 567,
    recentPosts: 31,
    lastActivity: "30分前",
  },
  {
    id: 6,
    category: "学部",
    title: "理学部 掲示板",
    description: "理学部の学生向けの情報交換",
    memberCount: 723,
    recentPosts: 19,
    lastActivity: "45分前",
  },
]

const categoryColors = {
  学部: "bg-blue-100 text-blue-800 border-blue-200",
  学科: "bg-green-100 text-green-800 border-green-200",
  サークル: "bg-purple-100 text-purple-800 border-purple-200",
}

export function BoardGrid() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {boardData.map((board) => (
        <Card key={board.id} className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between mb-2">
              <Badge variant="outline" className={categoryColors[board.category as keyof typeof categoryColors]}>
                {board.category}
              </Badge>
              <div className="flex items-center text-xs text-muted-foreground">
                <Clock className="w-3 h-3 mr-1" />
                {board.lastActivity}
              </div>
            </div>
            <CardTitle className="text-lg">{board.title}</CardTitle>
            <CardDescription className="text-sm">{board.description}</CardDescription>
          </CardHeader>

          <CardContent className="pt-0">
            <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
              <div className="flex items-center">
                <Users className="w-4 h-4 mr-1" />
                {board.memberCount.toLocaleString()}人
              </div>
              <div className="flex items-center">
                <MessageSquare className="w-4 h-4 mr-1" />
                {board.recentPosts}件の投稿
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
