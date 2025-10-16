"use client"

import { useState } from "react"
import { Header } from "@/components/header"
import { BoardGrid } from "@/components/board-grid"
import { UniversityInfo } from "@/components/university-info"
import { PostFeed } from "@/components/post-feed"
import { MarketWidget } from "@/components/market-widget"
import { MarketBoard } from "@/components/market-board"
import { TrendingUp, LayoutGrid } from "lucide-react"

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<'feed' | 'boards' | 'market'>('feed')

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-6 max-w-6xl">
        <UniversityInfo />

        {/* タブナビゲーション */}
        <div className="mt-8 flex gap-2 border-b border-border">
          <button
            onClick={() => setActiveTab('feed')}
            className={`pb-3 px-6 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'feed'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <TrendingUp className="w-4 h-4 inline mr-2" />
            話題の投稿
          </button>
          <button
            onClick={() => setActiveTab('boards')}
            className={`pb-3 px-6 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'boards'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <LayoutGrid className="w-4 h-4 inline mr-2" />
            掲示板一覧
          </button>
          <button
            onClick={() => setActiveTab('market')}
            className={`pb-3 px-6 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'market'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            書籍売買
          </button>
        </div>

        {/* タブコンテンツ */}
        <div className="mt-6">
          {activeTab === 'feed' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <PostFeed />
              </div>
              <div className="lg:col-span-1">
                <MarketWidget />
              </div>
            </div>
          )}

          {activeTab === 'boards' && (
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-6">掲示板カテゴリー</h2>
              <BoardGrid />
            </div>
          )}

          {activeTab === 'market' && (
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-6">書籍売買</h2>
              <MarketBoard />
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
