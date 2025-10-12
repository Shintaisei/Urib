"use client"

import { useState } from "react"
import { Search, X, MessageSquare, Heart } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface SearchResult {
  post_id: number
  board_id: string
  content: string
  hashtags?: string
  author_name: string
  author_year?: string
  author_department?: string
  like_count: number
  reply_count: number
  created_at: string
  matched_in_post: boolean
  matched_in_hashtags?: boolean
  matched_replies: Array<{
    id: number
    content: string
    author_name: string
    created_at: string
  }>
}

const BOARD_NAMES: { [key: string]: string } = {
  "1": "全体掲示板",
  "2": "授業・履修",
  "3": "サークル・部活",
  "4": "バイト・就活",
  "5": "雑談・交流",
  "6": "恋愛・相談"
}

export function SearchDialog() {
  const [open, setOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [searching, setSearching] = useState(false)
  const [results, setResults] = useState<SearchResult[]>([])
  const [totalResults, setTotalResults] = useState(0)

  const handleSearch = async () => {
    if (!searchQuery.trim()) return

    setSearching(true)
    try {
      const response = await fetch(
        `${API_BASE_URL}/board/search?query=${encodeURIComponent(searchQuery.trim())}`
      )
      const data = await response.json()
      
      setResults(data.results || [])
      setTotalResults(data.total_results || 0)
    } catch (error) {
      console.error('Search failed:', error)
      setResults([])
      setTotalResults(0)
    } finally {
      setSearching(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

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

  const highlightText = (text: string, query: string) => {
    if (!query) return text
    const parts = text.split(new RegExp(`(${query})`, 'gi'))
    return parts.map((part, i) => 
      part.toLowerCase() === query.toLowerCase() ? 
        <mark key={i} className="bg-yellow-200 font-semibold">{part}</mark> : 
        part
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Search className="w-4 h-4" />
          検索
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>投稿・コメント検索</DialogTitle>
          <DialogDescription>
            キーワードで投稿とコメントを検索できます
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="キーワードを入力（例: 試験、バイト、サークル）"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              className="pl-10"
            />
          </div>
          <Button onClick={handleSearch} disabled={searching || !searchQuery.trim()}>
            {searching ? "検索中..." : "検索"}
          </Button>
        </div>

        {totalResults > 0 && (
          <div className="text-sm text-muted-foreground">
            {totalResults}件の結果が見つかりました
          </div>
        )}

        <div className="flex-1 overflow-y-auto space-y-4 pr-2">
          {results.length === 0 && !searching && searchQuery && (
            <div className="text-center py-12 text-muted-foreground">
              <Search className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p>該当する投稿が見つかりませんでした</p>
            </div>
          )}

          {results.length === 0 && !searching && !searchQuery && (
            <div className="text-center py-12 text-muted-foreground">
              <Search className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p>キーワードを入力して検索してください</p>
            </div>
          )}

          {searching && (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-muted-foreground">検索中...</p>
            </div>
          )}

          {results.map((result) => (
            <Card key={result.post_id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <Badge variant="outline" className="text-xs">
                    {BOARD_NAMES[result.board_id] || `掲示板${result.board_id}`}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {getTimeDiff(result.created_at)}
                  </span>
                </div>

                <div className="mb-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium">{result.author_name}</span>
                    {result.author_department && result.author_year && (
                      <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                        {result.author_department} {result.author_year}
                      </span>
                    )}
                    {result.matched_in_post && (
                      <Badge variant="secondary" className="text-xs">投稿本文</Badge>
                    )}
                  </div>
                  <p className="text-sm text-foreground whitespace-pre-wrap">
                    {highlightText(result.content, searchQuery)}
                  </p>
                  
                  {result.hashtags && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {result.hashtags.split(/[\s,]+/).filter(tag => tag.trim()).map((tag, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-primary/10 text-primary"
                        >
                          #{highlightText(tag, searchQuery)}
                        </span>
                      ))}
                      {result.matched_in_hashtags && (
                        <Badge variant="secondary" className="text-xs">ハッシュタグ一致</Badge>
                      )}
                    </div>
                  )}
                </div>

                {result.matched_replies.length > 0 && (
                  <div className="mt-3 pl-4 border-l-2 border-muted space-y-2">
                    <p className="text-xs text-muted-foreground font-medium">
                      マッチしたコメント（{result.matched_replies.length}件）:
                    </p>
                    {result.matched_replies.slice(0, 2).map((reply) => (
                      <div key={reply.id} className="bg-muted/30 rounded p-2">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium">{reply.author_name}</span>
                          <Badge variant="secondary" className="text-xs">コメント</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {highlightText(reply.content, searchQuery)}
                        </p>
                      </div>
                    ))}
                    {result.matched_replies.length > 2 && (
                      <p className="text-xs text-muted-foreground">
                        他 {result.matched_replies.length - 2}件のコメント
                      </p>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between mt-3 pt-3 border-t">
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Heart className="w-3 h-3" />
                      {result.like_count}
                    </div>
                    <div className="flex items-center gap-1">
                      <MessageSquare className="w-3 h-3" />
                      {result.reply_count}
                    </div>
                  </div>
                  <Link href={`/board/${result.board_id}?post_id=${result.post_id}`} onClick={() => setOpen(false)}>
                    <Button variant="ghost" size="sm" className="text-xs">
                      投稿を見る →
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}

