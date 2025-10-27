"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Heart, MessageCircle, TrendingUp, Clock, Flame } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { LoadingProgress } from "@/components/loading-progress"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

const BOARD_NAMES: { [key: string]: string } = {
  "1": "全体",
  "2": "授業",
  "3": "部活",
  "4": "就活",
  "5": "雑談",
  "6": "相談"
}

const BOARD_COLORS: { [key: string]: string } = {
  "1": "bg-slate-100 text-slate-800 border-slate-200",
  "2": "bg-blue-100 text-blue-800 border-blue-200",
  "3": "bg-purple-100 text-purple-800 border-purple-200",
  "4": "bg-green-100 text-green-800 border-green-200",
  "5": "bg-orange-100 text-orange-800 border-orange-200",
  "6": "bg-pink-100 text-pink-800 border-pink-200"
}

interface FeedPost {
  id: number
  board_id: string
  content: string
  hashtags?: string
  author_name: string
  author_year?: string
  author_department?: string
  like_count: number
  reply_count: number
  created_at: string
  is_liked: boolean
}

type FeedType = 'latest' | 'popular' | 'trending'
type LatestTab = 'posts' | 'replies' | 'no_comments'

export function PostFeed() {
  const router = useRouter()
  const [feedType, setFeedType] = useState<FeedType>('latest')
  const [posts, setPosts] = useState<FeedPost[]>([])
  const [loading, setLoading] = useState(true)
  const [latestTab, setLatestTab] = useState<LatestTab>('posts')
  const [latestReplies, setLatestReplies] = useState<any[]>([])
  const [replyOpenByPost, setReplyOpenByPost] = useState<Record<number, boolean>>({})
  const [replyContentByPost, setReplyContentByPost] = useState<Record<number, string>>({})
  const [submittingReply, setSubmittingReply] = useState<number | null>(null)

  useEffect(() => {
    fetchFeed()
  }, [feedType])

  useEffect(() => {
    if (feedType !== 'latest') return
    const fetchReplies = async () => {
      try {
        const userId = localStorage.getItem('user_id')
        const headers: any = {}
        if (userId) headers['X-User-Id'] = userId
        const res = await fetch(`${API_BASE_URL}/board/replies/feed?limit=10`, { headers })
        if (!res.ok) throw new Error('failed')
        const data = await res.json()
        setLatestReplies(data.items || [])
      } catch {
        setLatestReplies([])
      }
    }
    fetchReplies()
  }, [feedType])

  const fetchFeed = async () => {
    try {
      setLoading(true)
      const userId = localStorage.getItem('user_id')
      
      const headers: any = {}
      if (userId) {
        headers['X-User-Id'] = userId
      }
      
      const response = await fetch(
        `${API_BASE_URL}/board/posts/feed?feed_type=${feedType}&limit=10`,
        { headers }
      )

      if (!response.ok) {
        throw new Error('フィードの取得に失敗しました')
      }

      const data = await response.json()
      setPosts(data.posts || [])
    } catch (error) {
      console.error('Failed to fetch feed:', error)
      setPosts([])
    } finally {
      setLoading(false)
    }
  }

  // 表示中のリストの遷移先をプリフェッチして体感速度を改善
  useEffect(() => {
    try {
      if (feedType !== 'latest') return
      if (latestTab === 'posts' || latestTab === 'no_comments') {
        posts.slice(0, 8).forEach((p) => router.prefetch(`/board/${p.board_id}?post_id=${p.id}`))
      } else if (latestTab === 'replies') {
        latestReplies.slice(0, 8).forEach((row: any) => router.prefetch(`/board/${row.post.board_id}?post_id=${row.post.id}`))
      }
    } catch {}
  }, [router, feedType, latestTab, posts, latestReplies])

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

  // フィード内のコメントボタンは投稿詳細へ遷移（クイック返信は行わない）
  const toggleReplyForm = (postId: number) => {
    setReplyOpenByPost(prev => ({ ...prev, [postId]: !prev[postId] }))
  }

  const submitReply = async (postId: number) => {
    const content = (replyContentByPost[postId] || '').trim()
    if (!content) return
    try {
      setSubmittingReply(postId)
      const userId = typeof window !== 'undefined' ? localStorage.getItem('user_id') : null
      if (!userId) throw new Error('ユーザーIDが見つかりません')
      const res = await fetch(`${API_BASE_URL}/board/posts/${postId}/replies`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': userId,
        },
        body: JSON.stringify({ content })
      })
      if (!res.ok) throw new Error('返信の投稿に失敗しました')
      // 返信数を+1し、入力をクリア
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, reply_count: p.reply_count + 1 } : p))
      setReplyContentByPost(prev => ({ ...prev, [postId]: '' }))
      setReplyOpenByPost(prev => ({ ...prev, [postId]: false }))
    } catch (e) {
      // noop
    } finally {
      setSubmittingReply(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-foreground">話題の投稿</h2>
      </div>

      {/* タブ */}
      <div className="flex gap-2 border-b border-border">
        <button
          onClick={() => setFeedType('latest')}
          className={`pb-3 px-4 text-sm font-medium border-b-2 transition-colors ${
            feedType === 'latest'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Clock className="w-4 h-4 inline mr-1" />
          最新
        </button>
        <button
          onClick={() => setFeedType('popular')}
          className={`pb-3 px-4 text-sm font-medium border-b-2 transition-colors ${
            feedType === 'popular'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Heart className="w-4 h-4 inline mr-1" />
          人気
        </button>
        <button
          onClick={() => setFeedType('trending')}
          className={`pb-3 px-4 text-sm font-medium border-b-2 transition-colors ${
            feedType === 'trending'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Flame className="w-4 h-4 inline mr-1" />
          話題
        </button>
      </div>

      {/* 最新内タブ（最新投稿 / 最新返信） */}
      {feedType === 'latest' && (
        <div className="flex flex-wrap gap-2 mt-2">
          <button
            onClick={() => setLatestTab('posts')}
            className={`px-3 py-1 text-xs rounded border ${latestTab === 'posts' ? 'bg-muted text-foreground border-border' : 'text-muted-foreground border-border'}`}
          >最新投稿</button>
          <button
            onClick={() => setLatestTab('replies')}
            className={`px-3 py-1 text-xs rounded border ${latestTab === 'replies' ? 'bg-muted text-foreground border-border' : 'text-muted-foreground border-border'}`}
          >最新返信</button>
          <button
            onClick={async () => {
              setLatestTab('no_comments')
              try {
                setLoading(true)
                const userId = localStorage.getItem('user_id')
                const headers: any = {}
                if (userId) headers['X-User-Id'] = userId
                const res = await fetch(`${API_BASE_URL}/board/posts/feed?feed_type=no_comments&limit=10`, { headers })
                const data = await res.json()
                setPosts(data.posts || [])
              } catch {
                setPosts([])
              } finally {
                setLoading(false)
              }
            }}
            className={`px-3 py-1 text-xs rounded border ${latestTab === 'no_comments' ? 'bg-muted text-foreground border-border' : 'text-muted-foreground border-border'}`}
          >コメント一番乗り</button>
        </div>
      )}

      {/* 投稿リスト / 最新返信リスト */}
      <div className="space-y-3">
        {loading && (
          <div className="py-8">
            <LoadingProgress isLoading={loading} text="投稿を読み込み中..." />
          </div>
        )}

        {!loading && latestTab === 'posts' && (
          <>
            {posts.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <p className="text-sm">まだ投稿がありません</p>
              </div>
            )}
            {posts.map((post) => (
              <Link key={post.id} href={`/board/${post.board_id}?post_id=${post.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${BOARD_COLORS[post.board_id] || BOARD_COLORS["1"]}`}
                          >
                            {BOARD_NAMES[post.board_id] || `掲示板${post.board_id}`}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {getTimeDiff(post.created_at)}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm font-medium text-foreground">{post.author_name}</span>
                          {post.author_department && post.author_year && (
                            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                              {post.author_department} {post.author_year}
                            </span>
                          )}
                        </div>

                        <p className="text-sm text-foreground line-clamp-2 mb-2">
                          {post.content}
                        </p>

                        {post.hashtags && (
                          <div className="flex flex-wrap gap-1 mb-2">
                            {post.hashtags.split(/[\s,]+/).filter(tag => tag.trim()).slice(0, 3).map((tag) => (
                              <span
                                key={`feed-${post.id}-tag-${tag}`}
                                className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-primary/10 text-primary"
                              >
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}

                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Heart className={`w-3 h-3 ${post.is_liked ? 'fill-red-500 text-red-500' : ''}`} />
                            {post.like_count}
                          </div>
                          <div className="flex items-center gap-1">
                            <MessageCircle className="w-3 h-3" />
                            {post.reply_count}
                          </div>
                        </div>

                        {/* フィード内 ピンポイント返信 */}
                        <div className="mt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleReplyForm(post.id) }}
                          >
                            返信
                          </Button>
                        </div>
                        {replyOpenByPost[post.id] && (
                          <div className="mt-2" onClick={(e) => { e.preventDefault(); e.stopPropagation() }}>
                            <Textarea
                              placeholder="返信を入力..."
                              value={replyContentByPost[post.id] || ''}
                              onChange={(e) => setReplyContentByPost(prev => ({ ...prev, [post.id]: e.target.value }))}
                              className="min-h-[64px]"
                              maxLength={500}
                            />
                            <div className="mt-2 flex items-center justify-end">
                              <Button
                                size="sm"
                                onClick={() => submitReply(post.id)}
                                disabled={submittingReply === post.id || !(replyContentByPost[post.id] || '').trim()}
                              >
                                {submittingReply === post.id ? '送信中...' : '返信する'}
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </>
        )}

        {!loading && feedType === 'latest' && latestTab === 'replies' && (
          <>
            {latestReplies.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <p className="text-sm">まだ返信がありません</p>
              </div>
            )}
            {latestReplies.map((row: any) => (
              <Link key={`reply-${row.reply.id}`} href={`/board/${row.post.board_id}?post_id=${row.post.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${BOARD_COLORS[row.post.board_id] || BOARD_COLORS["1"]}`}
                          >
                            {BOARD_NAMES[row.post.board_id] || `掲示板${row.post.board_id}`}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {getTimeDiff(row.reply.created_at)}
                          </span>
                        </div>

                        <div className="mb-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">返信</span>
                            {row.reply.author_department && row.reply.author_year && (
                              <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                                {row.reply.author_department} {row.reply.author_year}
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-foreground line-clamp-2">{row.reply.content}</div>
                        </div>

                        <div className="text-xs text-muted-foreground mb-2">元投稿: {row.post.content.slice(0, 80)}</div>

                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Heart className={`w-3 h-3 ${row.reply.is_liked ? 'fill-red-500 text-red-500' : ''}`} />
                            {row.reply.like_count}
                          </div>
                          <div className="flex items-center gap-1">
                            <MessageCircle className="w-3 h-3" />
                            {row.post.reply_count}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </>
        )}

        {!loading && feedType === 'latest' && latestTab === 'no_comments' && (
          <>
            {posts.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <p className="text-sm">対象の投稿がありません</p>
              </div>
            )}
            {posts.map((post) => (
              <Link key={post.id} href={`/board/${post.board_id}?post_id=${post.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${BOARD_COLORS[post.board_id] || BOARD_COLORS["1"]}`}
                          >
                            {BOARD_NAMES[post.board_id] || `掲示板${post.board_id}`}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {getTimeDiff(post.created_at)}
                          </span>
                        </div>
                        <p className="text-sm text-foreground line-clamp-2 mb-2">
                          {post.content}
                        </p>
                        <div className="text-[10px] inline-flex items-center bg-amber-100 text-amber-700 px-2 py-0.5 rounded">
                          コメント一番乗り募集中
                        </div>

                        <div className="mt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleReplyForm(post.id) }}
                          >
                            返信
                          </Button>
                        </div>
                        {replyOpenByPost[post.id] && (
                          <div className="mt-2" onClick={(e) => { e.preventDefault(); e.stopPropagation() }}>
                            <Textarea
                              placeholder="返信を入力..."
                              value={replyContentByPost[post.id] || ''}
                              onChange={(e) => setReplyContentByPost(prev => ({ ...prev, [post.id]: e.target.value }))}
                              className="min-h-[64px]"
                              maxLength={500}
                            />
                            <div className="mt-2 flex items-center justify-end">
                              <Button
                                size="sm"
                                onClick={() => submitReply(post.id)}
                                disabled={submittingReply === post.id || !(replyContentByPost[post.id] || '').trim()}
                              >
                                {submittingReply === post.id ? '送信中...' : '返信する'}
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </>
        )}
      </div>
    </div>
  )
}

