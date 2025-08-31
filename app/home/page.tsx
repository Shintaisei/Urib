import { Header } from "@/components/header"
import { BoardGrid } from "@/components/board-grid"
import { UniversityInfo } from "@/components/university-info"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-6 max-w-6xl">
        <UniversityInfo />

        <div className="mt-8">
          <h2 className="text-2xl font-bold text-foreground mb-6">掲示板一覧</h2>
          <BoardGrid />
        </div>
      </main>
    </div>
  )
}
