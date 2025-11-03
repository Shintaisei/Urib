"use client"

import { useEffect, useState, useRef } from "react"
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
import { MarketApi, MarketCommentsApi, type MarketItemComment, deleteItemComment, adminDeleteItem } from "@/lib/market-api"
import { isAdminEmail } from "@/lib/utils"
import { Textarea } from "@/components/ui/textarea"
import { useCachedFetch } from "@/lib/api-cache"
import { SafeImage } from "@/components/ui/safe-image"

function ExpandableText({ text, maxChars = 120 }: { text: string; maxChars?: number }) {
  const [expanded, setExpanded] = useState(false)
  const safeText = text || ""
  const isLong = safeText.length > maxChars
  const shown = expanded ? safeText : safeText.slice(0, maxChars)
  return (
    <div className="mb-3">
      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
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

interface MarketItemCardProps {
  item: MarketItem
  onLike: (itemId: string) => void
  onDeleted?: (itemId: string) => void
  onStatusChanged?: (itemId: string, isAvailable: boolean) => void
}

export function MarketItemCard({ item, onLike, onDeleted, onStatusChanged }: MarketItemCardProps) {
  const [isLiking, setIsLiking] = useState(false)
  const [isToggling, setIsToggling] = useState(false)
  const [comments, setComments] = useState<MarketItemComment[]>([])
  const [commentsOpen, setCommentsOpen] = useState(false)
  const commentsLoadedRef = useRef(false)
  const [imageIdx, setImageIdx] = useState(0)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const touchStartXRef = useRef<number | null>(null)
  const [commentInput, setCommentInput] = useState("")
  const [posting, setPosting] = useState(false)
  const { invalidateCache } = useCachedFetch()
  // 管理者ボタンは非表示にする（依頼により）
  const userEmail = typeof window !== 'undefined' ? localStorage.getItem('user_email') : null
  const userIdStr = typeof window !== 'undefined' ? localStorage.getItem('user_id') : null
  const myUserId = userIdStr ? parseInt(userIdStr, 10) : undefined
  const isAdmin = isAdminEmail(userEmail || '')

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
      commentsLoadedRef.current = true
    } catch (e) {
      console.error('コメント取得エラー:', e)
    }
  }

  // コメントを開いたときに初回のみ取得
  useEffect(() => {
    if (commentsOpen && !commentsLoadedRef.current) {
      fetchComments()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [commentsOpen])

  // 画像枚数の変化に追従
  useEffect(() => {
    if (!item.images || item.images.length === 0) {
      setImageIdx(0)
      return
    }
    if (imageIdx >= item.images.length) {
      setImageIdx(0)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.images?.length])

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
    <>
    <Card className="bg-card border-border hover:shadow-md transition-shadow duration-200">
      <CardContent className="p-0">
        {/* 商品画像 */}
        <div
          className="relative h-40 bg-muted/30 rounded-t-lg overflow-hidden"
          onTouchStart={(e) => { touchStartXRef.current = e.changedTouches[0]?.clientX ?? null }}
          onTouchEnd={(e) => {
            const sx = touchStartXRef.current
            const ex = e.changedTouches[0]?.clientX
            touchStartXRef.current = null
            if (sx == null || ex == null) return
            const dx = ex - sx
            if (Math.abs(dx) < 30) return
            if (dx < 0) {
              // next
              setImageIdx((idx) => (item.images && item.images.length > 0 ? (idx + 1) % item.images.length : 0))
            } else {
              // prev
              setImageIdx((idx) => (item.images && item.images.length > 0 ? (idx === 0 ? item.images.length - 1 : idx - 1) : 0))
            }
          }}
        >
          {item.images.length > 0 ? (
            <>
              <SafeImage
                src={item.images[imageIdx]}
                alt={item.title}
                width={800}
                height={320}
                className="w-full h-full object-contain bg-background cursor-zoom-in"
                onClick={() => setLightboxOpen(true)}
              />
              {item.images.length > 1 && (
                <>
                  {/* 前後ナビゲーション */}
                  <button
                    type="button"
                    aria-label="prev"
                    className="absolute left-1 top-1/2 -translate-y-1/2 bg-black/40 text-white rounded-full w-7 h-7 flex items-center justify-center z-10"
                    onClick={(e) => { e.stopPropagation(); setImageIdx((idx) => (idx === 0 ? item.images.length - 1 : idx - 1)) }}
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    aria-label="next"
                    className="absolute right-1 top-1/2 -translate-y-1/2 bg-black/40 text-white rounded-full w-7 h-7 flex items-center justify-center z-10"
                    onClick={(e) => { e.stopPropagation(); setImageIdx((idx) => (idx + 1) % item.images.length) }}
                  >
                    ›
                  </button>
                  {/* サムネイル */}
                  <div className="absolute bottom-1 left-1 right-1 flex gap-1 justify-center z-10">
                    {item.images.map((src, i) => (
                      <button
                        key={`thumb-${i}`}
                        type="button"
                        aria-label={`image-${i+1}`}
                        className={`w-7 h-7 rounded overflow-hidden border ${i === imageIdx ? 'border-primary' : 'border-transparent'} bg-background/80`}
                        onClick={(e) => { e.stopPropagation(); setImageIdx(i) }}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={src} alt="thumb" className="w-full h-full object-contain" />
                      </button>
                    ))}
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <TypeIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">画像なし</p>
              </div>
            </div>
          )}
          
          {/* 商品タイプバッジ（左上） */}
          <div className="absolute top-1.5 left-1.5">
            <Badge 
              className={`${typeInfo.bgColor} ${typeInfo.borderColor} ${typeInfo.color} border text-[11px] h-6`}
            >
              <TypeIcon className="w-2.5 h-2.5 mr-1" />
              {typeInfo.text}
            </Badge>
          </div>

          {/* ステータス + 価格（右上に縦積み） */}
          <div className="absolute top-1.5 right-1.5 flex flex-col items-end gap-1">
            <span
              className={`inline-block px-3 py-1 rounded text-[11px] font-bold shadow ${
                item.is_available
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gray-800 text-white'
              }`}
            >
              {item.is_available ? '出品中' : '購入済み'}
            </span>
            <Badge 
              variant="secondary" 
              className="bg-background/90 text-foreground font-semibold text-[11px] h-6"
            >
              {formatPrice(item.price)}
            </Badge>
          </div>

          {/* いいねボタン */}
          <div className="absolute bottom-1.5 right-1.5">
            <Button
              size="sm"
              variant="ghost"
              className={`h-7 w-7 p-0 ${item.is_liked ? 'text-red-500' : 'text-muted-foreground'}`}
              onClick={handleLike}
              disabled={isLiking}
            >
              <Heart className={`w-3.5 h-3.5 ${item.is_liked ? 'fill-current' : ''}`} />
            </Button>
          </div>
        </div>

        {/* 商品情報 */}
        <div className="p-3">
          {/* タイトルとカテゴリ */}
          <div className="mb-1.5">
            <h3 className="font-semibold text-foreground line-clamp-2 mb-1 text-[15px]">
              {item.title}
            </h3>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>{item.category}</span>
              <span>•</span>
              <span>{getConditionText(item.condition)}</span>
            </div>
          </div>

          {/* 管理者: 出品削除ボタン */}
          {isAdmin && (
            <div className="flex justify-end mb-2">
              <Button
                size="sm"
                variant="destructive"
                className="h-7 px-2 text-xs"
                onClick={async () => {
                  if (!confirm('この出品を削除しますか？')) return
                  try {
                    await adminDeleteItem(item.id)
                    if (onDeleted) onDeleted(item.id)
                  } catch (e: any) {
                    alert(e.message || '削除に失敗しました')
                  }
                }}
              >削除（管理者）</Button>
            </div>
          )}

          {/* 説明 */}
          <ExpandableText text={item.description} maxChars={140} />

          {/* 投稿者情報 */}
          <div className="flex items-center gap-2 mb-2.5">
            <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center">
              <span className="text-xs font-medium text-primary">
                {item.author_name.charAt(0) || "?"}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground truncate">
                {item.author_name}
              </p>
              <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <MapPin className="w-3 h-3" />
                <span className="truncate">{item.university}</span>
              </div>
            </div>
          </div>

          {/* 統計情報 */}
          <div className="flex items-center gap-3 text-[12px] text-muted-foreground mb-2.5">
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

          {/* 出品者用: ステータス切替（バックエンドで権限チェック） */}
          {myUserId && (
            <div className="mt-2">
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs"
                disabled={isToggling}
                onClick={async () => {
                  try {
                    setIsToggling(true)
                    const updated = await MarketApi.updateItem(item.id, { is_available: !item.is_available })
                    if (onStatusChanged) onStatusChanged(item.id, updated.is_available)
                    invalidateCache('market-items')
                  } catch (e: any) {
                    alert(e?.message || 'ステータスの更新に失敗しました（権限がない可能性があります）')
                  } finally {
                    setIsToggling(false)
                  }
                }}
              >
                {item.is_available ? '購入済みにする' : '出品中に戻す'}
              </Button>
            </div>
          )}

          {/* 取引可能状態（本文側の補助表示） */}
          {!item.is_available && (
            <div className="mt-2">
              <Badge variant="destructive" className="text-xs">購入済み</Badge>
            </div>
          )}

          {/* コメント（トグル表示） */}
          <div className="mt-3 space-y-2.5">
            <div className="flex justify-end">
              <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setCommentsOpen(!commentsOpen)}>
                {commentsOpen ? 'コメントを閉じる' : 'コメントを見る'}
              </Button>
            </div>
            {commentsOpen && (
              <>
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {comments.length === 0 ? (
                    <p className="text-[12px] text-muted-foreground">まだコメントはありません</p>
                  ) : (
                    comments.map((c) => (
                      <div key={c.id} className="bg-muted/30 rounded p-1.5">
                        <div className="flex items-center justify-between mb-0.5">
                          <div className="text-[11px] text-muted-foreground">{c.author_name} ・ {new Date(c.created_at).toLocaleString('ja-JP')}</div>
                          {(isAdmin || (myUserId && c.author_id === myUserId)) && (
                            <button
                              className="text-[11px] text-destructive hover:underline"
                              onClick={async () => {
                                if (!confirm('このコメントを削除しますか？')) return
                                try {
                                  await deleteItemComment(item.id, c.id)
                                  setComments(prev => prev.filter(x => x.id !== c.id))
                                } catch (e:any) {
                                  alert(e.message || '削除に失敗しました')
                                }
                              }}
                            >削除</button>
                          )}
                        </div>
                        <div className="text-[13px] text-foreground whitespace-pre-wrap">{c.content}</div>
                      </div>
                    ))
                  )}
                </div>
                <div className="space-y-2">
                  <Textarea
                    placeholder="コメントを入力..."
                    value={commentInput}
                    onChange={(e) => setCommentInput(e.target.value)}
                    className="min-h-[56px] text-[14px]"
                    maxLength={300}
                  />
                  <div className="flex justify-end">
                    <Button size="sm" onClick={handlePostComment} disabled={!commentInput.trim() || posting}>
                      {posting ? '送信中...' : '送信'}
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>

    {/* 画像ライトボックス */}
    {lightboxOpen && item.images.length > 0 && (
      <div
        className="fixed inset-0 bg-black/80 z-[9999] flex items-center justify-center p-4"
        onClick={() => setLightboxOpen(false)}
      >
        <div className="relative max-w-5xl w-full max-h-[90vh]">
          <SafeImage
            src={item.images[imageIdx]}
            alt={item.title}
            className="w-full max-h-[80vh] object-contain"
          />
          {item.images.length > 1 && (
            <>
              <button
                type="button"
                aria-label="prev"
                className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/60 text-white rounded-full w-9 h-9 flex items-center justify-center"
                onClick={(e) => { e.stopPropagation(); setImageIdx((idx) => (idx === 0 ? item.images.length - 1 : idx - 1)) }}
              >
                ‹
              </button>
              <button
                type="button"
                aria-label="next"
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/60 text-white rounded-full w-9 h-9 flex items-center justify-center"
                onClick={(e) => { e.stopPropagation(); setImageIdx((idx) => (idx + 1) % item.images.length) }}
              >
                ›
              </button>
            </>
          )}
        </div>
      </div>
    )}
    </>
  )
}
