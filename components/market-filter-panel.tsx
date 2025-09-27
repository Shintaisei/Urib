"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { X } from "lucide-react"
import { MarketFilter } from "@/types"

interface MarketFilterPanelProps {
  filter: MarketFilter
  onFilterChange: (filter: MarketFilter) => void
  onClose: () => void
}

export function MarketFilterPanel({ filter, onFilterChange, onClose }: MarketFilterPanelProps) {
  const [localFilter, setLocalFilter] = useState<MarketFilter>(filter)

  // フィルターの適用
  const handleApplyFilter = () => {
    onFilterChange(localFilter)
  }

  // フィルターのリセット
  const handleResetFilter = () => {
    const resetFilter: MarketFilter = {}
    setLocalFilter(resetFilter)
    onFilterChange(resetFilter)
  }

  // 個別フィルターの更新
  const updateFilter = (key: keyof MarketFilter, value: any) => {
    setLocalFilter(prev => ({
      ...prev,
      [key]: value
    }))
  }

  // カテゴリオプション
  const categories = [
    "教科書",
    "電子機器",
    "家具",
    "衣類",
    "スポーツ用品",
    "楽器",
    "その他"
  ]

  // 商品状態オプション
  const conditions = [
    { value: "new", label: "新品" },
    { value: "like_new", label: "ほぼ新品" },
    { value: "good", label: "良い" },
    { value: "fair", label: "普通" },
    { value: "poor", label: "悪い" }
  ]

  return (
    <Card className="sticky top-4">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">フィルター</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* カテゴリフィルター */}
        <div className="space-y-2">
          <Label htmlFor="category">カテゴリ</Label>
          <Select
            value={localFilter.category || ""}
            onValueChange={(value) => updateFilter("category", value || undefined)}
          >
            <SelectTrigger>
              <SelectValue placeholder="カテゴリを選択" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">すべて</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 価格範囲フィルター */}
        <div className="space-y-2">
          <Label>価格範囲</Label>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="minPrice" className="text-xs text-muted-foreground">
                最低価格
              </Label>
              <Input
                id="minPrice"
                type="number"
                placeholder="0"
                value={localFilter.minPrice || ""}
                onChange={(e) => updateFilter("minPrice", e.target.value ? Number(e.target.value) : undefined)}
              />
            </div>
            <div>
              <Label htmlFor="maxPrice" className="text-xs text-muted-foreground">
                最高価格
              </Label>
              <Input
                id="maxPrice"
                type="number"
                placeholder="100000"
                value={localFilter.maxPrice || ""}
                onChange={(e) => updateFilter("maxPrice", e.target.value ? Number(e.target.value) : undefined)}
              />
            </div>
          </div>
        </div>

        {/* 商品状態フィルター */}
        <div className="space-y-2">
          <Label htmlFor="condition">商品状態</Label>
          <Select
            value={localFilter.condition || ""}
            onValueChange={(value) => updateFilter("condition", value || undefined)}
          >
            <SelectTrigger>
              <SelectValue placeholder="状態を選択" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">すべて</SelectItem>
              {conditions.map((condition) => (
                <SelectItem key={condition.value} value={condition.value}>
                  {condition.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 大学フィルター */}
        <div className="space-y-2">
          <Label htmlFor="university">大学</Label>
          <Select
            value={localFilter.university || ""}
            onValueChange={(value) => updateFilter("university", value || undefined)}
          >
            <SelectTrigger>
              <SelectValue placeholder="大学を選択" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">すべて</SelectItem>
              <SelectItem value="北海道大学">北海道大学</SelectItem>
              <SelectItem value="東京大学">東京大学</SelectItem>
              <SelectItem value="京都大学">京都大学</SelectItem>
              <SelectItem value="大阪大学">大阪大学</SelectItem>
              <SelectItem value="名古屋大学">名古屋大学</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* アクションボタン */}
        <div className="flex gap-2 pt-4">
          <Button
            onClick={handleApplyFilter}
            className="flex-1"
            size="sm"
          >
            適用
          </Button>
          <Button
            onClick={handleResetFilter}
            variant="outline"
            size="sm"
          >
            リセット
          </Button>
        </div>

        {/* 現在のフィルター表示 */}
        {(localFilter.category || localFilter.minPrice !== undefined || localFilter.maxPrice !== undefined || localFilter.condition || localFilter.university) && (
          <div className="pt-4 border-t">
            <Label className="text-xs text-muted-foreground mb-2 block">
              現在のフィルター
            </Label>
            <div className="space-y-1">
              {localFilter.category && (
                <div className="text-xs text-muted-foreground">
                  カテゴリ: {localFilter.category}
                </div>
              )}
              {(localFilter.minPrice !== undefined || localFilter.maxPrice !== undefined) && (
                <div className="text-xs text-muted-foreground">
                  価格: {localFilter.minPrice || 0}円 ～ {localFilter.maxPrice || "∞"}円
                </div>
              )}
              {localFilter.condition && (
                <div className="text-xs text-muted-foreground">
                  状態: {conditions.find(c => c.value === localFilter.condition)?.label}
                </div>
              )}
              {localFilter.university && (
                <div className="text-xs text-muted-foreground">
                  大学: {localFilter.university}
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

