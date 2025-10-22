"use client"

import { useEffect, useState, useRef } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { MentionTextarea } from "@/components/mention-textarea"
import { Heart, MessageCircle, Share, MoreHorizontal, Send, Loader2, AtSign, MessageSquare } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { isAdminEmail } from "@/lib/utils"

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
  const userEmail = typeof window !== 'undefined' ? localStorage.getItem('user_email') : null
  const isAdmin = isAdminEmail(userEmail)

  const fetchPosts = async () => {
    try {
      setLoading(true)
      const userId = localStorage.getItem('user_id')
      const email = typeof window !== 'undefined' ? localStorage.getItem('user_email') : null
      
      const headers: any = {}
      if (userId) {
        headers['X-User-Id'] = userId
      }
      if (email) {
        headers['X-Dev-Email'] = email
      }
      
      const response = await fetch(`${API_BASE_URL}/board/posts/${boardId}`, {
        headers,
        cache: 'no-store'
      })

      if (!response.ok) {
        throw new Error('投稿の取得に失敗しました')
      }

      const data = await response.json()
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
      setLoadingReplies(postId)
      const userId = localStorage.getItem('user_id')
      
      const headers: any = {}
      if (userId) {
        headers['X-User-Id'] = userId
      }
      
      const response = await fetch(`${API_BASE_URL}/board/posts/${postId}/replies`, {
        headers,
      })

      if (!response.ok) {
        throw new Error('返信の取得に失敗しました')
      }

      const data = await response.json()
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

  const insertMentionForPost = (postId: number, name: string) => {
    setExpandedPostId(postId)
    setReplyContent(prev => {
      const current = prev[postId] || ''
      const joiner = current && !current.endsWith(' ') ? ' ' : ''
      return { ...prev, [postId]: current + joiner + `@${name} ` }
    })
    // 返信入力にフォーカス
    setTimeout(() => {
      const ta = document.querySelector(`#reply-input-${postId} textarea`) as HTMLTextAreaElement | null
      if (ta) {
        ta.focus()
        const len = ta.value.length
        ta.setSelectionRange(len, len)
      }
    }, 0)
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

  const handleDeletePost = async (postId: number) => {
    if (!isAdmin) return
    if (!confirm('この投稿を削除しますか？')) return
    try {
      const userId = localStorage.getItem('user_id')
      if (!userId) throw new Error('ユーザーIDが見つかりません')
      const response = await fetch(`${API_BASE_URL}/board/admin/posts/${postId}`, {
        method: 'DELETE',
        headers: { 'X-User-Id': userId }
      })
      if (!response.ok) throw new Error('投稿の削除に失敗しました')
      setPosts(prev => prev.filter(p => p.id !== postId))
    } catch (err) {
      console.error(err)
      alert('削除に失敗しました')
    }
  }

  const handleDeleteReply = async (replyId: number, postId: number) => {
    if (!isAdmin) return
    if (!confirm('この返信を削除しますか？')) return
    try {
      const userId = localStorage.getItem('user_id')
      if (!userId) throw new Error('ユーザーIDが見つかりません')
      const response = await fetch(`${API_BASE_URL}/board/admin/replies/${replyId}`, {
        method: 'DELETE',
        headers: { 'X-User-Id': userId }
      })
      if (!response.ok) throw new Error('返信の削除に失敗しました')
      setReplies(prev => ({
        ...prev,
        [postId]: (prev[postId] || []).filter(r => r.id !== replyId)
      }))
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, reply_count: Math.max(0, p.reply_count - 1) } : p))
    } catch (err) {
      console.error(err)
      alert('削除に失敗しました')
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

  const handleLike = async (postId: number) => {
    try {
      const userId = localStorage.getItem('user_id')
      if (!userId) return
      
      const response = await fetch(`${API_BASE_URL}/board/posts/${postId}/like`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': userId,
        },
      })

      if (!response.ok) {
        throw new Error('いいねに失敗しました')
      }

      const data = await response.json()
      
      // 投稿のいいね状態を更新
      setPosts(prevPosts => 
        prevPosts.map(post => 
          post.id === postId 
            ? { ...post, is_liked: data.is_liked, like_count: data.like_count }
            : post
        )
      )
    } catch (err: any) {
      console.error('いいねエラー:', err)
    }
  }

  const handleReplyLike = async (replyId: number, postId: number) => {
    try {
      const userId = localStorage.getItem('user_id')
      if (!userId) return
      
      const response = await fetch(`${API_BASE_URL}/board/replies/${replyId}/like`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': userId,
        },
      })

      if (!response.ok) {
        throw new Error('いいねに失敗しました')
      }

      const data = await response.json()
      
      // 返信のいいね状態を更新
      setReplies(prev => ({
        ...prev,
        [postId]: prev[postId].map(reply =>
          reply.id === replyId
            ? { ...reply, is_liked: data.is_liked, like_count: data.like_count }
            : reply
        )
      }))
    } catch (err: any) {
      console.error('返信いいねエラー:', err)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground">最新の投稿</h2>
        <div className="text-center py-8 text-muted-foreground">
          読み込み中...
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground">最新の投稿</h2>
        <div className="text-center py-8 text-red-500">
          {error}
        </div>
      </div>
    )
  }

  if (posts.length === 0) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground">最新の投稿</h2>
        <Card className="bg-card border-border">
          <CardContent className="p-8 text-center text-muted-foreground">
            まだ投稿がありません。最初の投稿をしてみましょう！
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold text-foreground">最新の投稿</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
      {posts.map((post) => {
        const isHighlighted = highlightPostId && parseInt(highlightPostId) === post.id
        return (
        <Card 
          key={post.id} 
          id={`post-${post.id}`}
          className={`bg-card border-border hover:shadow-sm transition-all ${
            isHighlighted ? 'ring-2 ring-primary shadow-lg' : ''
          }`}
        >
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                  <span className="text-xs font-medium text-primary">匿</span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-[13px] font-medium text-foreground">{post.author_name}</p>
                    <button
                      type="button"
                      className="text-xs text-primary hover:underline"
                      onClick={() => insertMentionForPost(post.id, post.author_name)}
                      title="この投稿者をメンション"
                    >
                      <AtSign className="inline w-3 h-3 mr-1" />
                    </button>
                    {post.author_department && post.author_year && (
                      <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                        {post.author_department} {post.author_year}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground">{getTimeDiff(post.created_at)}</p>
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>報告する</DropdownMenuItem>
                  {isAdmin && (
                    <DropdownMenuItem className="text-destructive" onClick={() => handleDeletePost(post.id)}>
                      投稿を削除（管理者）
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem>非表示にする</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <ExpandableText text={post.content} maxChars={50} />
            
            {post.hashtags && (
              <div className="flex flex-wrap gap-1.5 mt-2 mb-3">
              {post.hashtags.split(/[\s,]+/).filter(tag => tag.trim()).map((tag) => (
                  <span
                  key={`post-${post.id}-tag-${tag}`}
                    className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] bg-primary/10 text-primary hover:bg-primary/20 cursor-pointer transition-colors"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            {!post.hashtags && <div className="mb-4"></div>}

            <div className="flex items-center space-x-4">
              <Button 
                variant="ghost" 
                size="sm" 
                className={`${post.is_liked ? 'text-red-500' : 'text-muted-foreground'} hover:text-red-500`}
                onClick={() => handleLike(post.id)}
              >
                <Heart className={`w-4 h-4 mr-1 ${post.is_liked ? 'fill-current' : ''}`} />
                {post.like_count}
              </Button>

              <Button 
                variant="ghost" 
                size="sm" 
                className={`${expandedPostId === post.id ? 'text-primary' : 'text-muted-foreground'} hover:text-primary`}
                onClick={() => toggleReplies(post.id)}
              >
                <MessageCircle className="w-4 h-4 mr-1" />
                {post.reply_count}
                {post.has_replied && (post.new_replies_since_my_last_reply || 0) > 0 && (
                  <span className="ml-1 inline-flex items-center text-[10px] bg-blue-500/10 text-blue-600 dark:text-blue-300 px-1 py-0.5 rounded">
                    +{post.new_replies_since_my_last_reply}
                  </span>
                )}
              </Button>

              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                <Share className="w-4 h-4 mr-1" />
                共有
              </Button>
            </div>

            {/* 返信セクション */}
            {expandedPostId === post.id && (
              <div className="mt-3 pt-3 border-t border-border space-y-3">
                {/* 返信一覧 */}
                {loadingReplies === post.id ? (
                  <div className="text-center py-4 text-muted-foreground text-sm">
                    返信を読み込み中...
                  </div>
                ) : replies[post.id]?.length > 0 ? (
                  <div className="space-y-3">
                    {replies[post.id].map((reply) => (
                      <div key={reply.id} className="bg-muted/30 rounded-lg p-2.5">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center">
                              <span className="text-xs font-medium text-primary">匿</span>
                            </div>
                <div className="flex items-center gap-2">
                              <div className="flex items-center gap-2">
                                <p className="text-[13px] font-medium text-foreground">{reply.author_name}</p>
                                {reply.author_department && reply.author_year && (
                                  <span className="text-xs text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded">
                                    {reply.author_department} {reply.author_year}
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-muted-foreground">{getTimeDiff(reply.created_at)}</p>
                            </div>
                <button
                  type="button"
                  className="text-xs text-primary hover:underline"
                  onClick={() => insertMentionForPost(post.id, reply.author_name)}
                  title="このユーザーをメンション"
                >
                  <AtSign className="inline w-3 h-3 mr-1" />メンション
                </button>
                          </div>
                          {isAdmin && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2 text-destructive"
                              onClick={() => handleDeleteReply(reply.id, post.id)}
                            >
                              削除（管理者）
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className={`h-6 px-2 ${reply.is_liked ? 'text-red-500' : 'text-muted-foreground'} hover:text-red-500`}
                            onClick={() => handleReplyLike(reply.id, post.id)}
                          >
                            <Heart className={`w-3 h-3 mr-1 ${reply.is_liked ? 'fill-current' : ''}`} />
                            <span className="text-xs">{reply.like_count}</span>
                          </Button>
                        </div>
                        <p className="text-[13px] text-foreground whitespace-pre-wrap ml-8">{reply.content}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted-foreground text-sm">
                    まだ返信がありません
                  </div>
                )}

                {/* 返信フォーム */}
                <div className="space-y-2" id={`reply-input-${post.id}`}>
                  <MentionTextarea
                    placeholder="返信を入力..."
                    value={replyContent[post.id] || ''}
                    onChange={(val) => setReplyContent(prev => ({ ...prev, [post.id]: val }))}
                    className="min-h-[64px] resize-none"
                    maxLength={500}
                  />
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-muted-foreground">
                      {(replyContent[post.id] || '').length}/500文字
                    </div>
                    <Button
                      size="sm"
                      onClick={() => submitReply(post.id)}
                      disabled={!replyContent[post.id]?.trim() || submittingReply === post.id}
                    >
                      {submittingReply === post.id ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                          送信中...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4 mr-1" />
                          返信する
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )
      })}
      </div>
    </div>
  )
}
