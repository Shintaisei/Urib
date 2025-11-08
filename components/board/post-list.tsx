"use client"

import { useEffect, useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { MentionTextarea } from "@/components/ui/forms/mention-textarea"
import { Heart, MessageCircle, Send, Loader2 } from "lucide-react"
import { LoadingProgress } from "@/components/loading-progress"
import { useCachedFetch } from "@/lib/api-cache"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

function ExpandableText({ text, maxChars = 140 }: { text: string; maxChars?: number }) {
  const [expanded, setExpanded] = useState(false)
  const safeText = text || ""
  const isLong = safeText.length > maxChars
  const shown = expanded ? safeText : safeText.slice(0, maxChars)
  return (
    <div className="mb-2">
      <p className="text-[14px] text-foreground leading-relaxed whitespace-pre-wrap">
        {shown}
        {!expanded && isLong ? '…' : ''}
      </p>
      {isLong && (
        <button
          type="button"
          className="text-xs text-primary hover:underline"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? '閉じる' : 'もっと見る'}
        </button>
      )}
    </div>
  )
}

interface Post {
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
  has_replied?: boolean
  new_replies_since_my_last_reply?: number
}

interface Reply {
  id: number
  post_id: number
  content: string
  author_name: string
  author_year?: string
  author_department?: string
  like_count: number
  is_liked: boolean
  created_at: string
}

interface PostListProps {
  boardId: string
  refreshKey?: number
  highlightPostId?: string | null
}

function getTimeDiff(dateString: string): string {
  const now = new Date()
  const postDate = new Date(dateString)
  const diffMs = now.getTime() - postDate.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return "たった今"
  if (diffMins < 60) return `${diffMins}分前`
  if (diffHours < 24) return `${diffHours}時間前`
  if (diffDays < 7) return `${diffDays}日前`
  return postDate.toLocaleDateString('ja-JP')
}

export function PostList({ boardId, refreshKey, highlightPostId }: PostListProps) {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [expandedPostId, setExpandedPostId] = useState<number | null>(null)
  const [replies, setReplies] = useState<{ [key: number]: Reply[] }>({})
  const [replyContent, setReplyContent] = useState<{ [key: number]: string }>({})
  const [submittingReply, setSubmittingReply] = useState<number | null>(null)
  const [loadingReplies, setLoadingReplies] = useState<number | null>(null)
  
  const { fetchWithCache, getCached, invalidateCache } = useCachedFetch()

  const fetchPosts = async () => {
    try {
      const cacheKey = `posts-${boardId}`
      const cached = getCached(cacheKey)
      if (cached) {
        setPosts(cached)
        setLoading(false)
      } else {
        setLoading(true)
      }
      const userId = localStorage.getItem('user_id')
      const email = typeof window !== 'undefined' ? localStorage.getItem('user_email') : null
      
      const headers: any = {}
      if (userId) {
        headers['X-User-Id'] = userId
      }
      if (email) {
        headers['X-Dev-Email'] = email
      }
      
      const data = await fetchWithCache(
        `${API_BASE_URL}/board/posts/${boardId}`,
        { headers },
        cacheKey,
        600000 // 10分キャッシュ
      )

      setPosts(data)
      setError("")
    } catch (err: any) {
      setError(err.message || '投稿の取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const fetchReplies = async (postId: number) => {
    try {
      const cacheKey = `replies-${postId}`
      const cached = getCached(cacheKey)
      if (cached) {
        setReplies(prev => ({ ...prev, [postId]: cached }))
        setLoadingReplies(null)
      } else {
        setLoadingReplies(postId)
      }
      const userId = localStorage.getItem('user_id')
      
      const headers: any = {}
      if (userId) {
        headers['X-User-Id'] = userId
      }
      
      const data = await fetchWithCache(
        `${API_BASE_URL}/board/posts/${postId}/replies`,
        { headers },
        cacheKey,
        600000 // 10分キャッシュ
      )

      setReplies(prev => ({ ...prev, [postId]: data }))
    } catch (err: any) {
      console.error('返信取得エラー:', err)
    } finally {
      setLoadingReplies(null)
    }
  }

  const toggleReplies = async (postId: number) => {
    if (expandedPostId === postId) {
      // 閉じる
      setExpandedPostId(null)
    } else {
      // 開く
      setExpandedPostId(postId)
      // 返信をまだ取得していない場合は取得
      if (!replies[postId]) {
        await fetchReplies(postId)
      }
      // 開いたタイミングで既読化: last_viewed_at を更新し、バッジを0に
      try {
        const userId = localStorage.getItem('user_id')
        const email = typeof window !== 'undefined' ? localStorage.getItem('user_email') : null
        const headers: any = {}
        if (userId) headers['X-User-Id'] = userId
        if (email) headers['X-Dev-Email'] = email
        await fetch(`${API_BASE_URL}/board/posts/${postId}/replies/view`, {
          method: 'POST',
          headers,
        })
        setPosts(prev => prev.map(p => p.id === postId ? { ...p, new_replies_since_my_last_reply: 0 } : p))
      } catch {}
    }
  }

  const submitReply = async (postId: number) => {
    const content = replyContent[postId]?.trim()
    if (!content) return

    try {
      setSubmittingReply(postId)
      const userId = localStorage.getItem('user_id')
      if (!userId) {
        throw new Error('ユーザーIDが見つかりません')
      }
      
      const response = await fetch(`${API_BASE_URL}/board/posts/${postId}/replies`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': userId,
        },
        body: JSON.stringify({ content }),
      })

      if (!response.ok) {
        throw new Error('返信の投稿に失敗しました')
      }

      // 返信が投稿されたら、返信一覧を再取得
      await fetchReplies(postId)
      
      // キャッシュを無効化
      invalidateCache(`posts-${boardId}`)
      invalidateCache(`replies-${postId}`)

      // 投稿の返信数を更新
      setPosts(prevPosts => 
        prevPosts.map(post => 
          post.id === postId 
            ? { ...post, reply_count: post.reply_count + 1, has_replied: true, new_replies_since_my_last_reply: 0 }
            : post
        )
      )

      // フォームをクリア
      setReplyContent(prev => ({ ...prev, [postId]: '' }))
    } catch (err: any) {
      console.error('返信投稿エラー:', err)
    } finally {
      setSubmittingReply(null)
    }
  }

  useEffect(() => {
    fetchPosts()
  }, [boardId, refreshKey])

  // ハイライトは1回だけ実施し、完了後はユーザー操作に干渉しない
  // ハイライトスクロールは1回だけ実行
  const didHighlightRef = useRef(false)
  useEffect(() => {
    if (didHighlightRef.current) return
    if (!highlightPostId || posts.length === 0) return
    const postId = parseInt(highlightPostId as string)
    if (isNaN(postId)) return
    const el = document.getElementById(`post-${postId}`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      didHighlightRef.current = true
    }
  }, [posts, highlightPostId])

  if (loading) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground">掲示板の投稿</h2>
        <div className="py-8">
          <LoadingProgress isLoading={loading} text="投稿を読み込み中..." />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground">掲示板の投稿</h2>
        <div className="text-center py-8 text-red-500">
          {error}
        </div>
      </div>
    )
  }

  if (posts.length === 0) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground">掲示板の投稿</h2>
        <div className="p-8 text-center text-muted-foreground border border-dashed rounded">
          まだ投稿がありません。最初の投稿をしてみましょう！
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-1">
      <h2 className="text-lg font-semibold text-foreground">掲示板の投稿</h2>

      <div className="divide-y divide-border border border-border rounded">
        {posts.map((post) => {
          const isHighlighted = highlightPostId && parseInt(highlightPostId) === post.id
          return (
            <div
              key={`board-post-${post.id}`}
              id={`post-${post.id}`}
              className={`px-3 py-2 ${isHighlighted ? 'bg-primary/5' : ''}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[12px] font-medium text-foreground truncate">{post.author_name}</span>
                  {post.author_department && post.author_year && (
                    <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                      {post.author_department} {post.author_year}
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-muted-foreground flex-shrink-0">{getTimeDiff(post.created_at)}</span>
              </div>

              <div className="mt-1 text-[13px] text-foreground truncate">
                {post.content}
              </div>

              <div className="mt-1 flex items-center gap-4 text-[12px] text-muted-foreground">
                <div className="inline-flex items-center gap-1">
                  <Heart className="w-3 h-3" />
                  {post.like_count}
                </div>
                <button
                  type="button"
                  className={`inline-flex items-center gap-1 ${expandedPostId === post.id ? 'text-primary' : ''}`}
                  onClick={() => toggleReplies(post.id)}
                  aria-label="返信一覧を開く"
                >
                  <MessageCircle className="w-3 h-3" />
                  {post.reply_count}
                  {post.has_replied && (post.new_replies_since_my_last_reply || 0) > 0 && (
                    <span className="ml-1 inline-flex items-center text-[10px] bg-blue-500/10 text-blue-600 px-1 py-0.5 rounded">
                      +{post.new_replies_since_my_last_reply}
                    </span>
                  )}
                </button>
              </div>

              {expandedPostId === post.id && (
                <div className="mt-2 pt-2 border-t border-border space-y-2">
                  {loadingReplies === post.id ? (
                    <div className="py-2">
                      <LoadingProgress isLoading={true} text="返信を読み込み中..." />
                    </div>
                  ) : replies[post.id]?.length > 0 ? (
                    <div className="space-y-2">
                      {replies[post.id].map((reply) => (
                        <div key={`board-reply-${reply.id}`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-[12px] font-medium text-foreground truncate">{reply.author_name}</span>
                              {reply.author_department && reply.author_year && (
                                <span className="text-[10px] text-muted-foreground bg-muted/50 px-1 py-0.5 rounded">
                                  {reply.author_department} {reply.author_year}
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-muted-foreground flex-shrink-0">{getTimeDiff(reply.created_at)}</span>
                          </div>
                          <div className="mt-1 text-[13px] text-foreground whitespace-pre-wrap">
                            {reply.content}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-2 text-muted-foreground text-[12px]">
                      まだ返信がありません
                    </div>
                  )}

                  <div className="space-y-1" id={`reply-input-${post.id}`}>
                    <MentionTextarea
                      placeholder="返信を入力..."
                      value={replyContent[post.id] || ''}
                      onChange={(val) => setReplyContent(prev => ({ ...prev, [post.id]: val }))}
                      className="min-h-[56px] resize-none text-[13px]"
                      maxLength={500}
                    />
                    <div className="flex items-center justify-between">
                      <div className="text-[10px] text-muted-foreground">
                        {(replyContent[post.id] || '').length}/500文字
                      </div>
                      <Button
                        size="sm"
                        onClick={() => submitReply(post.id)}
                        disabled={!replyContent[post.id]?.trim() || submittingReply === post.id}
                        className="h-7 px-3 text-[12px]"
                      >
                        {submittingReply === post.id ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                            送信中...
                          </>
                        ) : (
                          <>
                            <Send className="w-3.5 h-3.5 mr-1" />
                            返信する
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

