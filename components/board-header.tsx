"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Bell } from "lucide-react"
import { useRouter } from "next/navigation"

interface BoardHeaderProps {
  title: string
  description: string
}

export function BoardHeader({ title, description }: BoardHeaderProps) {
  const router = useRouter()

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-4">
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-foreground"
          onClick={() => router.back()}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          戻る
        </Button>
      </div>

      <Card className="bg-card border-border">
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-foreground">{title}</h1>
              <p className="text-muted-foreground">{description}</p>
            </div>

            <div className="flex items-center space-x-2">
              <Badge variant="secondary">匿名</Badge>
              <Button variant="outline" size="sm">
                <Bell className="w-4 h-4 mr-2" />
                通知ON
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
