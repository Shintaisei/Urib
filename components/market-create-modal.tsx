"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { X, Upload, DollarSign, Gift, ShoppingCart } from "lucide-react"
import { MarketItemType, MarketItemCreate } from "@/types"

interface MarketCreateModalProps {
  onClose: () => void
  onSubmit: (item: MarketItemCreate) => void
}

export function MarketCreateModal({ onClose, onSubmit }: MarketCreateModalProps) {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    type: "sell" as MarketItemType,
    price: "",
    condition: "good" as "new" | "like_new" | "good" | "fair" | "poor",
    images: [] as string[]
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  // フォームデータの更新
  const updateFormData = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleFiles = async (files: FileList | null) => {
    if (!files) return
    const picked: string[] = []
    const allowedExt = [".jpg", ".jpeg", ".png", ".webp", ".gif"]
    const allowedMime = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
    ]
    const maxSizeBytes = 5 * 1024 * 1024 // 5MB/枚
    const limit = Math.min(3 - formData.images.length, files.length)
    const errors: string[] = []
    for (let i = 0; i < limit; i++) {
      const f = files[i]
      const ext = `.${f.name.split('.').pop()?.toLowerCase() || ''}`
      if (!allowedMime.includes(f.type) && !allowedExt.includes(ext)) {
        errors.push(`${f.name}: 未対応の形式です`)
        continue
      }
      if (f.size > maxSizeBytes) {
        errors.push(`${f.name}: 5MBを超えています`)
        continue
      }
      if (!f.type.startsWith('image/')) {
        errors.push(`${f.name}: 画像ではありません`)
        continue
      }
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(f)
      })
      picked.push(dataUrl)
    }
    if (picked.length > 0) {
      setFormData(prev => ({ ...prev, images: [...prev.images, ...picked].slice(0, 3) }))
    }
    if (errors.length > 0) {
      alert(`一部の画像を追加できませんでした:\n- ${errors.join('\n- ')}`)
    }
  }

  const removeImage = (idx: number) => {
    setFormData(prev => ({ ...prev, images: prev.images.filter((_, i) => i !== idx) }))
  }

  // フォームの送信
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isSubmitting) return

    // バリデーション
    if (!formData.title.trim()) {
      alert("商品名を入力してください")
      return
    }
    if (!formData.description.trim()) {
      alert("商品説明を入力してください")
      return
    }
    if (formData.type !== "free" && !formData.price) {
      alert("価格を入力してください")
      return
    }

    setIsSubmitting(true)
    try {
      // モックデータとして現在のユーザー情報を使用
      const newItem: MarketItemCreate = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        type: formData.type,
        price: formData.type === "free" ? 0 : Number(formData.price),
        condition: formData.condition,
        images: formData.images,
        contact_method: 'dm'
      }

      onSubmit(newItem)
    } catch (error) {
      console.error('出品エラー:', error)
      alert('出品に失敗しました')
    } finally {
      setIsSubmitting(false)
    }
  }

  // 商品状態オプション
  const conditions = [
    { value: "new", label: "新品" },
    { value: "like_new", label: "ほぼ新品" },
    { value: "good", label: "良い" },
    { value: "fair", label: "普通" },
    { value: "poor", label: "悪い" }
  ]

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl">商品を出品</CardTitle>
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
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 商品タイプ */}
            <div className="space-y-2">
              <Label>出品タイプ</Label>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  type="button"
                  variant={formData.type === "sell" ? "default" : "outline"}
                  size="sm"
                  onClick={() => updateFormData("type", "sell")}
                  className="text-green-600 border-green-600 hover:bg-green-50"
                >
                  <DollarSign className="w-4 h-4 mr-1" />
                  売りたい
                </Button>
                <Button
                  type="button"
                  variant={formData.type === "buy" ? "default" : "outline"}
                  size="sm"
                  onClick={() => updateFormData("type", "buy")}
                  className="text-blue-600 border-blue-600 hover:bg-blue-50"
                >
                  <ShoppingCart className="w-4 h-4 mr-1" />
                  買いたい
                </Button>
                <Button
                  type="button"
                  variant={formData.type === "free" ? "default" : "outline"}
                  size="sm"
                  onClick={() => updateFormData("type", "free")}
                  className="text-purple-600 border-purple-600 hover:bg-purple-50"
                >
                  <Gift className="w-4 h-4 mr-1" />
                  ただであげる
                </Button>
              </div>
            </div>

            {/* 商品名 */}
            <div className="space-y-2">
              <Label htmlFor="title">商品名 *</Label>
              <Input
                id="title"
                placeholder="商品名を入力してください"
                value={formData.title}
                onChange={(e) => updateFormData("title", e.target.value)}
                required
              />
            </div>

            {/* 商品説明 */}
            <div className="space-y-2">
              <Label htmlFor="description">商品説明 *</Label>
              <Textarea
                id="description"
                placeholder="商品の詳細を入力してください"
                value={formData.description}
                onChange={(e) => updateFormData("description", e.target.value)}
                rows={4}
                required
              />
            </div>

            {/* 価格（売りたい・買いたいの場合のみ） */}
            {formData.type !== "free" && (
              <div className="space-y-2">
                <Label htmlFor="price">価格 *</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                    ¥
                  </span>
                  <Input
                    id="price"
                    type="number"
                    placeholder="0"
                    value={formData.price}
                    onChange={(e) => updateFormData("price", e.target.value)}
                    className="pl-8"
                    required
                  />
                </div>
              </div>
            )}

            {/* 商品状態 */}
            <div className="space-y-2">
              <Label htmlFor="condition">商品状態</Label>
              <Select
                value={formData.condition}
                onValueChange={(value) => updateFormData("condition", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {conditions.map((condition) => (
                    <SelectItem key={condition.value} value={condition.value}>
                      {condition.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 画像アップロード（最大3枚） */}
            <div className="space-y-2">
              <Label>商品画像</Label>
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 text-center space-y-3">
                <div className="text-xs text-muted-foreground space-y-1">
                  <div>最大3枚までアップロードできます（各5MBまで）</div>
                  <div>対応形式: JPG/JPEG, PNG, WEBP, GIF</div>
                </div>
                <Input type="file" accept=".jpg,.jpeg,.png,.webp,.gif" multiple onChange={(e) => handleFiles(e.target.files)} />
                {formData.images.length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {formData.images.map((src, idx) => (
                      <div key={idx} className="relative">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={src} alt={`img-${idx}`} className="w-full h-20 object-cover rounded" />
                        <Button type="button" size="sm" variant="outline" className="absolute top-1 right-1 h-6 px-2 text-xs" onClick={() => removeImage(idx)}>削除</Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* 送信ボタン */}
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="flex-1"
              >
                キャンセル
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="flex-1"
              >
                {isSubmitting ? "出品中..." : "出品する"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
