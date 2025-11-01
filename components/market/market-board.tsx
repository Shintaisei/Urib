"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { 
  Search, 
  Filter, 
  Plus, 
  ShoppingCart, 
  DollarSign, 
  Gift,
  Eye,
  Heart,
  MessageCircle,
  MapPin
} from "lucide-react"
import { LoadingProgress } from "@/components/loading-progress"
import { MarketItem, MarketItemType, type MarketItemCreate } from "@/types"
import type { MarketFilter } from "@/lib/market-api"
import { MarketItemCard } from "./market-item-card"
import { MarketFilterPanel } from "./market-filter-panel"
import { MarketCreateModal } from "./market-create-modal"
import { MarketApi, setDevUserEmail } from "@/lib/market-api"
import { useCachedFetch } from "@/lib/api-cache"
import { useAuth } from "@/contexts/AuthContext"

// モックデータ（実際のAPIから取得するデータ）
const mockMarketItems: MarketItem[] = [
  {
    id: "1",
    title: "線形代数の教科書",
    description: "数学科の線形代数の教科書です。ほぼ新品で、書き込みはありません。",
    type: "sell",
    price: 2500,
    condition: "like_new",
    category: "教科書",
    images: ["/placeholder.jpg"],
    author_name: "匿名ユーザー #A1B2",
    university: "北海道大学",
    contact_method: "dm",
    is_available: true,
    created_at: "2024-01-15T00:00:00Z",
    updated_at: "2024-01-15T00:00:00Z",
    view_count: 45,
    like_count: 8,
    is_liked: false
  },
  {
    id: "2",
    title: "MacBook Pro 13インチ",
    description: "2020年モデルのMacBook Proです。プログラミング学習に最適です。",
    type: "sell",
    price: 120000,
    condition: "good",
    category: "電子機器",
    images: ["/placeholder.jpg"],
    author_name: "匿名ユーザー #C3D4",
    university: "東京大学",
    contact_method: "dm",
    is_available: true,
    created_at: "2024-01-14T00:00:00Z",
    updated_at: "2024-01-14T00:00:00Z",
    view_count: 120,
    like_count: 15,
    is_liked: true
  },
  {
    id: "3",
    title: "プログラミングの参考書",
    description: "Pythonの参考書を探しています。初心者向けのものが希望です。",
    type: "buy",
    price: 3000,
    condition: "good",
    category: "教科書",
    images: [],
    author_name: "匿名ユーザー #E5F6",
    university: "京都大学",
    contact_method: "dm",
    is_available: true,
    created_at: "2024-01-13T00:00:00Z",
    updated_at: "2024-01-13T00:00:00Z",
    view_count: 67,
    like_count: 3,
    is_liked: false
  },
  {
    id: "4",
    title: "自転車（無料）",
    description: "引っ越しのため自転車を無料で譲ります。少し古いですが、まだ乗れます。",
    type: "free",
    price: 0,
    condition: "fair",
    category: "その他",
    images: ["/placeholder.jpg"],
    author_name: "匿名ユーザー #G7H8",
    university: "大阪大学",
    contact_method: "dm",
    is_available: true,
    created_at: "2024-01-12T00:00:00Z",
    updated_at: "2024-01-12T00:00:00Z",
    view_count: 89,
    like_count: 12,
    is_liked: false
  }
]

export function MarketBoard() {
  const { user } = useAuth()
  const { invalidateCache } = useCachedFetch()
  const [items, setItems] = useState<MarketItem[]>([])
  const [filteredItems, setFilteredItems] = useState<MarketItem[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedType, setSelectedType] = useState<MarketItemType | "all">("all")
  const [showFilter, setShowFilter] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [filter, setFilter] = useState<MarketFilter>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 初期データの読み込み
  useEffect(() => {
    const fetchItems = async () => {
      try {
        setLoading(true)
        setError(null)
        
        // 現在のユーザー情報を設定
        if (user?.email) {
          setDevUserEmail(user.email)
        }
        
        const fetchedItems = await MarketApi.getItems()
        setItems(fetchedItems)
      } catch (err) {
        console.error('商品一覧の取得エラー:', err)
        setError(err instanceof Error ? err.message : '商品一覧の取得に失敗しました')
        // エラー時はモックデータを使用
        setItems(mockMarketItems)
      } finally {
        setLoading(false)
      }
    }

    fetchItems()
  }, [user])

  // 検索とフィルタリングの処理
  useEffect(() => {
    // 取引済みは一覧から除外（出品中のみ表示）
    let filtered = items.filter(i => i.is_available)

    // 検索クエリでフィルタリング
    if (searchQuery) {
      filtered = filtered.filter(item =>
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // タイプでフィルタリング
    if (selectedType !== "all") {
      filtered = filtered.filter(item => item.type === selectedType)
    }

    // その他のフィルター
    // カテゴリは廃止
    if (filter.min_price !== undefined) {
      filtered = filtered.filter(item => (item.price || 0) >= filter.min_price!)
    }
    if (filter.max_price !== undefined) {
      filtered = filtered.filter(item => (item.price || 0) <= filter.max_price!)
    }
    if (filter.condition) {
      filtered = filtered.filter(item => item.condition === filter.condition)
    }

    setFilteredItems(filtered)
  }, [items, searchQuery, selectedType, filter])

  // アイテムのいいね機能
  const handleLike = async (itemId: string) => {
    try {
      const result = await MarketApi.toggleLike(itemId)
      setItems(prevItems =>
        prevItems.map(item =>
          item.id === itemId
            ? {
                ...item,
                is_liked: result.is_liked,
                like_count: result.like_count
              }
            : item
        )
      )
    } catch (error) {
      console.error('いいねエラー:', error)
      alert('いいねの更新に失敗しました')
    }
  }

  // 新しいアイテムの作成
  const handleCreateItem = async (newItem: MarketItemCreate) => {
    try {
      const createdItem = await MarketApi.createItem({
        title: newItem.title,
        description: newItem.description,
        type: newItem.type,
        price: newItem.price,
        condition: newItem.condition,
        category: newItem.category,
        images: newItem.images,
        contact_method: newItem.contact_method
      })
      // 画像がレスポンスに含まれない場合はフロント側の選択画像をフォールバック
      const itemToAdd = {
        ...createdItem,
        images: (createdItem.images && createdItem.images.length > 0) ? createdItem.images : (newItem.images || [])
      }
      setItems(prevItems => [itemToAdd, ...prevItems])
      invalidateCache('market-items')
      setShowCreateModal(false)
    } catch (error) {
      console.error('商品作成エラー:', error)
      alert('商品の作成に失敗しました')
    }
  }

  // 統計情報の計算
  const availableItems = items.filter(i => i.is_available)
  const stats = {
    totalItems: availableItems.length,
    buyItems: availableItems.filter(item => item.type === "buy").length,
    sellItems: availableItems.filter(item => item.type === "sell").length,
    freeItems: availableItems.filter(item => item.type === "free").length
  }

  return (
    <div className="min-h-screen bg-background">
      {/* ヘッダーセクション */}
      <div className="bg-card border-b border-border">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">マーケット掲示板</h1>
              <p className="text-muted-foreground">
                大学内で商品の売買や無料譲渡を行える掲示板です
              </p>
            </div>
          </div>

          {/* 統計情報（非表示要件により削除） */}

          {/* 検索とフィルター */}
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="商品名、説明、カテゴリで検索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => setShowFilter(!showFilter)}
              className="md:w-auto"
            >
              <Filter className="w-4 h-4 mr-2" />
              フィルター
            </Button>
          </div>

          {/* タイプフィルター */}
          <div className="flex flex-wrap gap-2 mt-3">
            <Button
              variant={selectedType === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedType("all")}
            >
              すべて
            </Button>
            <Button
              variant={selectedType === "buy" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedType("buy")}
              className="text-blue-600 border-blue-600 hover:bg-blue-50"
            >
              <ShoppingCart className="w-4 h-4 mr-1" />
              買いたい
            </Button>
            <Button
              variant={selectedType === "sell" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedType("sell")}
              className="text-green-600 border-green-600 hover:bg-green-50"
            >
              <DollarSign className="w-4 h-4 mr-1" />
              売りたい
            </Button>
            <Button
              variant={selectedType === "free" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedType("free")}
              className="text-purple-600 border-purple-600 hover:bg-purple-50"
            >
              <Gift className="w-4 h-4 mr-1" />
              ただであげる
            </Button>
          </div>
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* フィルターパネル */}
          {showFilter && (
            <div className="lg:w-64">
              <MarketFilterPanel
                filter={filter}
                onFilterChange={setFilter}
                onClose={() => setShowFilter(false)}
              />
            </div>
          )}

          {/* 商品一覧 */}
          <div className="flex-1">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-foreground">
                商品一覧 ({filteredItems.length}件)
              </h2>
            </div>

            {loading ? (
              <Card className="bg-muted/30">
                <CardContent className="p-8">
                  <LoadingProgress isLoading={loading} text="商品を読み込み中..." />
                </CardContent>
              </Card>
            ) : error ? (
              <Card className="bg-destructive/10 border-destructive/20">
                <CardContent className="p-8 text-center">
                  <div className="text-destructive mb-4">
                    <p className="text-lg">エラーが発生しました</p>
                    <p className="text-sm">{error}</p>
                    <Button 
                      onClick={() => window.location.reload()} 
                      className="mt-4"
                      variant="outline"
                    >
                      再読み込み
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : filteredItems.length === 0 ? (
              <Card className="bg-muted/30">
                <CardContent className="p-8 text-center">
                  <div className="text-muted-foreground mb-4">
                    <Search className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p className="text-lg">該当する商品が見つかりません</p>
                    <p className="text-sm">検索条件を変更してお試しください</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
                {filteredItems.map((item) => (
                  <div key={`market-item-${item.id}`} id={`market-${item.id}`}>
                    <MarketItemCard
                      item={item}
                      onLike={handleLike}
                      onDeleted={(itemId) => {
                        setItems(prev => prev.filter(i => i.id !== itemId))
                        invalidateCache('market-items')
                      }}
                      onStatusChanged={(itemId, isAvailable) => {
                        setItems(prev => prev.map(i => i.id === itemId ? { ...i, is_available: isAvailable } : i))
                        invalidateCache('market-items')
                      }}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 出品モーダル */}
      {showCreateModal && (
        <MarketCreateModal
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateItem}
        />
      )}
    </div>
  )
}
