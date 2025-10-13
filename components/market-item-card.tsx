"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Heart, 
  Eye, 
  MessageCircle, 
  MapPin, 
  DollarSign, 
  Gift,
  ShoppingCart,
  MoreHorizontal
} from "lucide-react"
import { MarketItem } from "@/types"
import { MarketApi, MarketCommentsApi, type MarketItemComment } from "@/lib/market-api"
import { Textarea } from "@/components/ui/textarea"

interface MarketItemCardProps {
  item: MarketItem
  onLike: (itemId: string) => void
}

export function MarketItemCard({ item, onLike }: MarketItemCardProps) {
  const [isLiking, setIsLiking] = useState(false)
  const [comments, setComments] = useState<MarketItemComment[]>([])
  const [commentInput, setCommentInput] = useState("")
  const [posting, setPosting] = useState(false)

  // 価格の表示フォーマット
  const formatPrice = (price?: number) => {
    if (price === undefined || price === 0) return "無料"
    return `¥${price.toLocaleString()}`
  }

  // 商品の状態の表示
  const getConditionText = (condition: string) => {
    const conditionMap = {
      "new": "新品",
      "like_new": "ほぼ新品",
      "good": "良い",
      "fair": "普通",
      "poor": "悪い"
    }
    return conditionMap[condition as keyof typeof conditionMap] || condition
  }

  // 商品タイプのアイコンと色
  const getTypeInfo = (type: string) => {
    switch (type) {
      case "buy":
        return {
          icon: ShoppingCart,
          color: "text-blue-600",
          bgColor: "bg-blue-50",
          borderColor: "border-blue-200",
          text: "買いたい"
        }
      case "sell":
        return {
          icon: DollarSign,
          color: "text-green-600",
          bgColor: "bg-green-50",
          borderColor: "border-green-200",
          text: "売りたい"
        }
      case "free":
        return {
          icon: Gift,
          color: "text-purple-600",
          bgColor: "bg-purple-50",
          borderColor: "border-purple-200",
          text: "ただであげる"
        }
      default:
        return {
          icon: ShoppingCart,
          color: "text-gray-600",
          bgColor: "bg-gray-50",
          borderColor: "border-gray-200",
          text: "その他"
        }
    }
  }

  // いいね機能
  const handleLike = async () => {
    if (isLiking) return
    setIsLiking(true)
    try {
      await onLike(item.id)
    } catch (error) {
      console.error('いいねエラー:', error)
    } finally {
      setIsLiking(false)
    }
  }

  // コメント取得/投稿
  const fetchComments = async () => {
    try {
      const list = await MarketCommentsApi.getItemComments(item.id)
      setComments(list)
    } catch (e) {
      console.error('コメント取得エラー:', e)
    }
  }

  useEffect(() => {
    fetchComments()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handlePostComment = async () => {
    const content = commentInput.trim()
    if (!content || posting) return
    setPosting(true)
    try {
      const created = await MarketCommentsApi.createItemComment(item.id, content)
      setComments(prev => [...prev, created])
      setCommentInput("")
    } catch (e) {
      console.error('コメント投稿エラー:', e)
      alert('コメントの投稿に失敗しました')
    } finally {
      setPosting(false)
    }
  }

  const typeInfo = getTypeInfo(item.type)
  const TypeIcon = typeInfo.icon

  return (
    <Card className="bg-card border-border hover:shadow-md transition-shadow duration-200">
      <CardContent className="p-0">
        {/* 商品画像 */}
        <div className="relative h-48 bg-muted/30 rounded-t-lg overflow-hidden">
          {item.images.length > 0 ? (
            <img
              src={item.images[0]}
              alt={item.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <TypeIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">画像なし</p>
              </div>
            </div>
          )}
          
          {/* 商品タイプバッジ */}
          <div className="absolute top-2 left-2">
            <Badge 
              className={`${typeInfo.bgColor} ${typeInfo.borderColor} ${typeInfo.color} border`}
            >
              <TypeIcon className="w-3 h-3 mr-1" />
              {typeInfo.text}
            </Badge>
          </div>

          {/* 価格表示 */}
          <div className="absolute top-2 right-2">
            <Badge 
              variant="secondary" 
              className="bg-background/90 text-foreground font-semibold"
            >
              {formatPrice(item.price)}
            </Badge>
          </div>

          {/* いいねボタン */}
          <div className="absolute bottom-2 right-2">
            <Button
              size="sm"
              variant="ghost"
              className={`h-8 w-8 p-0 ${item.is_liked ? 'text-red-500' : 'text-muted-foreground'}`}
              onClick={handleLike}
              disabled={isLiking}
            >
              <Heart className={`w-4 h-4 ${item.is_liked ? 'fill-current' : ''}`} />
            </Button>
          </div>
        </div>

        {/* 商品情報 */}
        <div className="p-4">
          {/* タイトルとカテゴリ */}
          <div className="mb-2">
            <h3 className="font-semibold text-foreground line-clamp-2 mb-1">
              {item.title}
            </h3>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>{item.category}</span>
              <span>•</span>
              <span>{getConditionText(item.condition)}</span>
            </div>
          </div>

          {/* 説明 */}
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
            {item.description}
          </p>

          {/* 投稿者情報 */}
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center">
              <span className="text-xs font-medium text-primary">
                {item.author_name.charAt(0) || "?"}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground truncate">
                {item.author_name}
              </p>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="w-3 h-3" />
                <span className="truncate">{item.university}</span>
              </div>
            </div>
          </div>

          {/* 統計情報 */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
            <div className="flex items-center gap-1">
              <Eye className="w-3 h-3" />
              <span>{item.view_count}</span>
            </div>
            <div className="flex items-center gap-1">
              <Heart className="w-3 h-3" />
              <span>{item.like_count}</span>
            </div>
            <div className="flex items-center gap-1">
              <span>連絡: {item.contact_method === 'dm' ? 'DM' : item.contact_method}</span>
            </div>
          </div>

          {/* アクションボタン（チャットを開く） */}
          <div className="flex gap-2">
            <Button size="sm" className="flex-1">
              <MessageCircle className="w-4 h-4 mr-1" />
              チャット
            </Button>
          </div>

          {/* 取引可能状態 */}
          {!item.is_available && (
            <div className="mt-2">
              <Badge variant="destructive" className="text-xs">取引済み</Badge>
            </div>
          )}

          {/* コメント（チャット） */}
          <div className="mt-4 space-y-3">
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {comments.length === 0 ? (
                <p className="text-xs text-muted-foreground">まだコメントはありません</p>
              ) : (
                comments.map((c) => (
                  <div key={c.id} className="bg-muted/30 rounded p-2">
                    <div className="text-xs text-muted-foreground mb-1">{c.author_name} ・ {new Date(c.created_at).toLocaleString('ja-JP')}</div>
                    <div className="text-sm text-foreground whitespace-pre-wrap">{c.content}</div>
                  </div>
                ))
              )}
            </div>
            <div className="space-y-2">
              <Textarea
                placeholder="コメントを入力..."
                value={commentInput}
                onChange={(e) => setCommentInput(e.target.value)}
                className="min-h-[72px]"
                maxLength={300}
              />
              <div className="flex justify-end">
                <Button size="sm" onClick={handlePostComment} disabled={!commentInput.trim() || posting}>
                  {posting ? '送信中...' : '送信'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
