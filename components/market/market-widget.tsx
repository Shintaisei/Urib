"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"
import { MarketApi } from "@/lib/market-api"
import type { MarketItem } from "@/types"
import Link from "next/link"
import { SafeImage } from "@/components/ui/safe-image"

export function MarketWidget() {
  const [items, setItems] = useState<MarketItem[]>([])
  const [q, setQ] = useState("")

  useEffect(() => {
    MarketApi.getItems({ limit: 6 }).then(setItems).catch(() => setItems([]))
  }, [])

  const filtered = q
    ? items.filter(i => (i.title + i.description + i.category).toLowerCase().includes(q.toLowerCase()))
    : items

  return (
    <Card className="bg-card border-border">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">書籍売買（最新）</h3>
          <Link href="/market">
            <Button size="sm" variant="outline">もっと見る</Button>
          </Link>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="検索..." className="pl-10" />
        </div>
        <div className="space-y-2">
          {filtered.slice(0, 6).map(it => (
            <Link key={it.id} href={`/market`}>
              <div className="flex items-center gap-3 p-2 rounded hover:bg-muted/30 cursor-pointer">
                <div className="w-12 h-12 rounded bg-muted overflow-hidden">
                  {it.images[0] ? (
                    <SafeImage src={it.images[0]} alt={it.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">No image</div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-foreground truncate">{it.title}</div>
                  <div className="text-xs text-muted-foreground truncate">{it.category} ・ {it.price ? `¥${it.price.toLocaleString()}` : '無料'}</div>
                </div>
              </div>
            </Link>
          ))}
          {filtered.length === 0 && (
            <div className="text-xs text-muted-foreground p-2">該当する商品がありません</div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}


