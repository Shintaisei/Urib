import { Header } from "@/components/header"
import { BoardHeader } from "@/components/board-header"
import { PostList } from "@/components/post-list"
import { PostForm } from "@/components/post-form"

interface BoardPageProps {
  params: {
    id: string
  }
}

// Mock data for different boards
const boardInfo = {
  "1": {
    title: "東京大学 工学部 掲示板",
    description: "工学部の学生向けの情報交換",
    memberCount: 1247,
  },
  "2": {
    title: "東京大学 文学部 掲示板",
    description: "文学部の学生向けの情報交換",
    memberCount: 892,
  },
  "3": {
    title: "東京大学 情報理工学系研究科",
    description: "大学院生向けの研究・学習情報",
    memberCount: 456,
  },
}

export default function BoardPage({ params }: BoardPageProps) {
  const board = boardInfo[params.id as keyof typeof boardInfo] || boardInfo["1"]

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-6 max-w-4xl">
        <BoardHeader title={board.title} description={board.description} memberCount={board.memberCount} />

        <div className="mt-8 space-y-6">
          <PostForm />
          <PostList />
        </div>
      </main>
    </div>
  )
}
