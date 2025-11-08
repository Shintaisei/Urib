"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"
import { MarketApi } from "@/lib/market-api"
import type { MarketItem } from "@/types"
import { LoadingProgress } from "@/components/loading-progress"
import { MarketItemCard } from "./market-item-card"

interface MarketDetailModalProps {
  itemId: string
  onClose: () => void
  onLike?: (itemId: string) => Promise<void> | void
  onDeleted?: (itemId: string) => void
  onStatusChanged?: (itemId: string, isAvailable: boolean) => void
}

export function MarketDetailModal({
  itemId,
  onClose,
  onLike,
  onDeleted,
  onStatusChanged,
}: MarketDetailModalProps) {
  const [item, setItem] = useState<MarketItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const it = await MarketApi.getItem(itemId)
        setItem(it)
      } catch (e: any) {
        setError(e?.message || "商品取得に失敗しました")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [itemId])

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-3xl max-h-[90vh] overflow-hidden">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">商品詳細</CardTitle>
            <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0 overflow-y-auto max-h-[80vh]">
          {loading ? (
            <div className="py-8">
              <LoadingProgress isLoading={true} text="読み込み中..." />
            </div>
          ) : error ? (
            <div className="py-8 text-center text-red-500 text-sm">{error}</div>
          ) : item ? (
            <MarketItemCard
              item={item}
              onLike={async (id) => {
                if (onLike) await onLike(id)
                // 明示的に最新を取得して反映
                try {
                  const fresh = await MarketApi.getItem(id)
                  setItem(fresh)
                } catch {}
              }}
              onDeleted={(id) => {
                if (onDeleted) onDeleted(id)
                onClose()
              }}
              onStatusChanged={(id, isAvailable) => {
                if (onStatusChanged) onStatusChanged(id, isAvailable)
                // リスト側更新は親に委譲、モーダルは閉じない
              }}
            />
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}


