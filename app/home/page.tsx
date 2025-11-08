"use client"

import { useState, useEffect } from "react"
export const dynamic = 'force-dynamic'
import { Header } from "@/components/header"
import { BoardGrid } from "@/components/board/board-grid"
import { PostFeed } from "@/components/board/post-feed"
import { MarketWidget } from "@/components/market/market-widget"
import { MarketBoard } from "@/components/market/market-board"
import { TrendingUp, LayoutGrid, BookOpen, Users } from "lucide-react"
import { CourseSummaries } from "@/components/course-summaries"
import { CircleSummaries } from "@/components/circle-summaries"
import { useParallelFetch } from "@/lib/api-cache"
import { PostList } from "@/components/board/post-list"

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'feed' | 'boards' | 'market' | 'summaries'>('overview')
  const [initialDataLoaded, setInitialDataLoaded] = useState(false)
  const { fetchMultiple } = useParallelFetch()
  const [selectedBoardId, setSelectedBoardId] = useState<string>('1')
  const [summaryTab, setSummaryTab] = useState<'courses' | 'circles'>('courses')
  const [overviewPosts, setOverviewPosts] = useState<any[]>([])
  const [overviewCourses, setOverviewCourses] = useState<any[]>([])
  const [overviewCircles, setOverviewCircles] = useState<any[]>([])
  const [overviewMarket, setOverviewMarket] = useState<any[]>([])
  const [loadingOverview, setLoadingOverview] = useState<boolean>(true)

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

  // 概要用の新着データを取得（軽量・コンパクト表示用）
  useEffect(() => {
    const fetchOverview = async () => {
      try {
        setLoadingOverview(true)
        const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
        const userId = typeof window !== 'undefined' ? localStorage.getItem('user_id') : null
        const headers: HeadersInit = userId ? { 'X-User-Id': String(userId) } : {}
        const [pRes, cRes, sRes, mRes] = await Promise.all([
          fetch(`${API_BASE_URL}/board/posts/feed?feed_type=latest&limit=6`, { headers, cache: 'no-store' }),
          fetch(`${API_BASE_URL}/courses/summaries?limit=5`, { cache: 'no-store' }),
          fetch(`${API_BASE_URL}/circles/summaries?limit=5`, { cache: 'no-store' }),
          fetch(`${API_BASE_URL}/market/items?limit=8`, { headers, cache: 'no-store' }),
        ])
        const pJson = await pRes.json().catch(() => ({ posts: [] }))
        const cJson = await cRes.json().catch(() => ([]))
        const sJson = await sRes.json().catch(() => ([]))
        const mJson = await mRes.json().catch(() => ([]))
        setOverviewPosts(Array.isArray(pJson?.posts) ? pJson.posts : [])
        setOverviewCourses(Array.isArray(cJson) ? cJson : [])
        setOverviewCircles(Array.isArray(sJson) ? sJson : [])
        setOverviewMarket(Array.isArray(mJson) ? mJson : [])
      } catch (e) {
        setOverviewPosts([])
        setOverviewCourses([])
        setOverviewCircles([])
        setOverviewMarket([])
      } finally {
        setLoadingOverview(false)
      }
    }
    fetchOverview()
  }, [])

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
        

        {/* タブナビゲーション */}
        <div className="mt-8 flex gap-2 border-b border-border">
          <button
            onClick={() => setActiveTab('overview')}
            className={`pb-3 px-6 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'overview'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <LayoutGrid className="w-4 h-4 inline mr-2" />
            ホーム
          </button>
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
          {activeTab === 'overview' && (
            <div className="space-y-8">
              {/* 機能紹介（メリハリのあるカード） */}
              <section>
                <h2 className="text-xl font-bold text-foreground mb-3">URIVでできること</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="border rounded-lg p-4 bg-card/80 hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="w-5 h-5 text-primary" />
                      <div className="font-semibold">掲示板</div>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">匿名で相談・交流。学内の最新トピックをチェック。</p>
                    <button
                      onClick={() => setActiveTab('boards')}
                      className="text-sm px-3 py-1.5 rounded bg-primary text-primary-foreground hover:opacity-90"
                    >掲示板を見る</button>
                  </div>
                  <div className="border rounded-lg p-4 bg-card/80 hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-2 mb-2">
                      <LayoutGrid className="w-5 h-5 text-primary" />
                      <div className="font-semibold">中古品売買</div>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">教科書・生活用品の売買を安全に。</p>
                    <button
                      onClick={() => setActiveTab('market')}
                      className="text-sm px-3 py-1.5 rounded bg-primary text-primary-foreground hover:opacity-90"
                    >中古品を見る</button>
                  </div>
                  <div className="border rounded-lg p-4 bg-card/80 hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-2 mb-2">
                      <BookOpen className="w-5 h-5 text-primary" />
                      <div className="font-semibold">授業まとめ</div>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">先輩の知見で履修を賢く。</p>
                    <button
                      onClick={() => { setActiveTab('summaries'); setSummaryTab('courses') }}
                      className="text-sm px-3 py-1.5 rounded bg-primary text-primary-foreground hover:opacity-90"
                    >授業まとめを見る</button>
                  </div>
                  <div className="border rounded-lg p-4 bg-card/80 hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="w-5 h-5 text-primary" />
                      <div className="font-semibold">サークルまとめ</div>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">活動内容や雰囲気をまとめてチェック。</p>
                    <button
                      onClick={() => { setActiveTab('summaries'); setSummaryTab('circles') }}
                      className="text-sm px-3 py-1.5 rounded bg-primary text-primary-foreground hover:opacity-90"
                    >サークルまとめを見る</button>
                  </div>
                </div>
              </section>

              {/* 新着ダイジェスト（コンパクト表示） */}
              <section>
                <h3 className="text-lg font-semibold text-foreground mb-3">新着ダイジェスト</h3>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* 最新投稿（コンパクト） */}
                  <div className="border rounded-lg p-4 bg-card/80">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-semibold">掲示板 最新投稿</div>
                      <button
                        onClick={() => setActiveTab('feed')}
                        className="text-xs text-primary hover:underline"
                      >もっと見る</button>
                    </div>
                    {loadingOverview ? (
                      <div className="text-sm text-muted-foreground py-4">読み込み中...</div>
                    ) : (overviewPosts.length === 0 ? (
                      <div className="text-sm text-muted-foreground py-4">まだ投稿がありません</div>
                    ) : (
                      <ul className="space-y-2">
                        {overviewPosts.slice(0, 6).map((p: any) => (
                          <li key={`ov-post-${p.id}`} className="text-sm">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <div className="font-medium text-foreground truncate">{p.author_name}</div>
                                <div className="text-muted-foreground truncate">{(p.content || '').slice(0, 60)}{(p.content || '').length > 60 ? '…' : ''}</div>
                              </div>
                              <div className="flex-shrink-0 text-xs text-muted-foreground">{p.reply_count}件</div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    ))}
                  </div>

                  {/* 授業・サークルまとめ 新着（統合） */}
                  <div className="border rounded-lg p-4 bg-card/80">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-semibold">授業・サークルまとめ 新着</div>
                      <button
                        onClick={() => { setActiveTab('summaries'); setSummaryTab('courses') }}
                        className="text-xs text-primary hover:underline"
                      >もっと見る</button>
                    </div>
                    {loadingOverview ? (
                      <div className="text-sm text-muted-foreground py-4">読み込み中...</div>
                    ) : ((overviewCourses.length + overviewCircles.length) === 0 ? (
                      <div className="text-sm text-muted-foreground py-4">まだまとめがありません</div>
                    ) : (
                      (() => {
                        // 混合リスト（最新順に近い感じで単純に先頭から閾値まで）
                        const combined = [
                          ...overviewCourses.map((s: any) => ({ ...s, _type: 'course' })),
                          ...overviewCircles.map((s: any) => ({ ...s, _type: 'circle' })),
                        ].slice(0, 8)
                        return (
                          <ul className="space-y-2">
                            {combined.map((s: any, idx: number) => (
                              <li key={`ov-sum-${s._type}-${s.id}-${idx}`} className="text-sm">
                                <div className="truncate font-medium text-foreground">
                                  {s.title}
                                </div>
                                <div className="text-xs text-muted-foreground truncate">
                                  {s._type === 'course' ? (s.course_name || s.department || '') : (s.circle_name || s.category || '')}
                                </div>
                              </li>
                            ))}
                          </ul>
                        )
                      })()
                    ))}
                  </div>

                  {/* 中古品売買 新着 */}
                  <div className="border rounded-lg p-4 bg-card/80">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-semibold">中古品売買 新着</div>
                      <button
                        onClick={() => setActiveTab('market')}
                        className="text-xs text-primary hover:underline"
                      >もっと見る</button>
                    </div>
                    {loadingOverview ? (
                      <div className="text-sm text-muted-foreground py-4">読み込み中...</div>
                    ) : (overviewMarket.length === 0 ? (
                      <div className="text-sm text-muted-foreground py-4">まだ出品がありません</div>
                    ) : (
                      <ul className="space-y-2">
                        {overviewMarket.slice(0, 6).map((m: any) => (
                          <li key={`ov-market-${m.id}`} className="text-sm">
                            <div className="flex items-center justify-between gap-2">
                              <div className="min-w-0">
                                <div className="truncate font-medium text-foreground">{m.title}</div>
                                <div className="text-xs text-muted-foreground truncate">{m.price === 0 ? '無料' : (m.price != null ? `¥${m.price}` : '')}</div>
                              </div>
                              <div className="flex-shrink-0 text-xs text-muted-foreground">{m.type === 'sell' ? '売' : '買'}</div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    ))}
                  </div>
                </div>
              </section>
            </div>
          )}

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
