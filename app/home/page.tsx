"use client"

import { useState, useEffect } from "react"
export const dynamic = 'force-dynamic'
import { Header } from "@/components/header"
import { BoardGrid } from "@/components/board/board-grid"
import { UniversityInfo } from "@/components/university-info"
import { PostFeed } from "@/components/board/post-feed"
import { MarketWidget } from "@/components/market/market-widget"
import { MarketBoard } from "@/components/market/market-board"
import { TrendingUp, LayoutGrid, BookOpen, Users } from "lucide-react"
import { CourseSummaries } from "@/components/course-summaries"
import { CircleSummaries } from "@/components/circle-summaries"
import { useParallelFetch } from "@/lib/api-cache"
import { PostList } from "@/components/board/post-list"

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<'feed' | 'boards' | 'market' | 'summaries'>('feed')
  const [initialDataLoaded, setInitialDataLoaded] = useState(false)
  const { fetchMultiple } = useParallelFetch()
  const [selectedBoardId, setSelectedBoardId] = useState<string>('1')
  const [summaryTab, setSummaryTab] = useState<'courses' | 'circles'>('courses')

  // 初期データの並列読み込み
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
        const userId = localStorage.getItem('user_id')
        const headers: HeadersInit = userId ? { 'X-User-Id': String(userId) } : {}

        // 複数のAPIを並列で呼び出し
        await fetchMultiple([
          {
            url: `${API_BASE_URL}/board/stats`,
            options: { headers },
            cacheKey: 'board-stats',
            ttl: 600000 // 10分キャッシュ
          },
          {
            url: `${API_BASE_URL}/board/posts/feed?feed_type=latest&limit=10`,
            options: { headers },
            cacheKey: 'latest-feed',
            ttl: 120000 // 2分キャッシュ
          },
          {
            url: `${API_BASE_URL}/market/items?limit=6`,
            options: { headers },
            cacheKey: 'market-items',
            ttl: 600000 // 10分キャッシュ
          }
        ])
        
        setInitialDataLoaded(true)
      } catch (error) {
        console.error('初期データ読み込みエラー:', error)
        setInitialDataLoaded(true) // エラーでも続行
      }
    }

    loadInitialData()
  }, [fetchMultiple])

  // タブ状態の変更をグローバルに通知（フローティング投稿ボタンが購読）
  useEffect(() => {
    try {
      const detail = { activeTab, summaryTab }
      window.dispatchEvent(new CustomEvent('uriv:activeTabChange', { detail }))
    } catch {}
  }, [activeTab, summaryTab])

  // URLハッシュに応じてタブを自動選択し、対象要素へスクロール
  useEffect(() => {
    const applyHash = () => {
      const hash = typeof window !== 'undefined' ? window.location.hash : ''
      if (!hash) return
      if (hash.startsWith('#course-')) {
        setActiveTab('summaries')
        setSummaryTab('courses')
        setTimeout(() => {
          const el = document.getElementById(hash.substring(1))
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }, 300)
      } else if (hash.startsWith('#circle-')) {
        setActiveTab('summaries')
        setSummaryTab('circles')
        setTimeout(() => {
          const el = document.getElementById(hash.substring(1))
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }, 300)
      }
    }
    applyHash()
    window.addEventListener('hashchange', applyHash)
    return () => window.removeEventListener('hashchange', applyHash)
  }, [])

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
            中古品売買
          </button>
          <button
            onClick={() => setActiveTab('summaries')}
            className={`pb-3 px-6 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'summaries'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <BookOpen className="w-4 h-4 inline mr-2" />
            サークル授業レビュー
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
              {/* 掲示板タブ */}
              <div className="flex flex-wrap gap-2 mb-4">
                {[
                  { id: '1', title: '全体' },
                  { id: '2', title: '授業・履修' },
                  { id: '3', title: 'サークル・部活' },
                  { id: '4', title: 'バイト・就活' },
                  { id: '5', title: '雑談・交流' },
                  { id: '6', title: '恋愛・相談' },
                ].map(b => (
                  <button
                    key={`board-tab-${b.id}`}
                    onClick={() => setSelectedBoardId(b.id)}
                    className={`px-3 py-1.5 rounded border text-sm transition-colors ${
                      selectedBoardId === b.id
                        ? 'bg-primary text-white border-primary'
                        : 'bg-background text-foreground border-border hover:bg-muted'
                    }`}
                  >
                    {b.title}
                  </button>
                ))}
              </div>

              {/* 選択掲示板の投稿一覧（ページ遷移なし） */}
              <div className="mb-10">
                <PostList boardId={selectedBoardId} />
              </div>

              {/* 統計付き一覧は非表示（ナビ簡略化） */}
            </div>
          )}

          {activeTab === 'market' && (
            <div>
              <MarketBoard />
            </div>
          )}

          {activeTab === 'summaries' && (
            <div>
              {/* 内部タブ */}
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => setSummaryTab('courses')}
                  className={`px-3 py-1.5 rounded border text-sm transition-colors ${
                    summaryTab === 'courses' ? 'bg-muted text-foreground border-border' : 'text-muted-foreground border-border hover:bg-muted'
                  }`}
                >授業まとめ</button>
                <button
                  onClick={() => setSummaryTab('circles')}
                  className={`px-3 py-1.5 rounded border text-sm transition-colors ${
                    summaryTab === 'circles' ? 'bg-muted text-foreground border-border' : 'text-muted-foreground border-border hover:bg-muted'
                  }`}
                >サークルまとめ</button>
                
              </div>

              {/* コンテンツ */}
              {summaryTab === 'courses' && <CourseSummaries />}
              {summaryTab === 'circles' && <CircleSummaries />}
              
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
