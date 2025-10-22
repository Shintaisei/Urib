"use client"

import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface UserPublic {
  id: number
  anonymous_name: string
  university?: string
  year?: string
  department?: string
}

interface UserPreviewProps {
  userId?: number
  anonymousName?: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onStartDM: (emailOrUserId: { user_id?: number; email?: string }) => void
}

export function UserPreview({ userId, anonymousName, open, onOpenChange, onStartDM }: UserPreviewProps) {
  const [info, setInfo] = useState<UserPublic | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const run = async () => {
      if (!open) return
      setLoading(true)
      try {
        let res
        if (userId) {
          res = await fetch(`${API_BASE_URL}/users/public/${userId}`, { cache: 'no-store' })
        } else if (anonymousName) {
          res = await fetch(`${API_BASE_URL}/users/resolve?anonymous_name=${encodeURIComponent(anonymousName)}`, { cache: 'no-store' })
        }
        const data = await res?.json()
        setInfo(data || null)
      } catch {
        setInfo(null)
      } finally {
        setLoading(false)
      }
    }
    run()
  }, [open, userId, anonymousName])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>ユーザー情報</DialogTitle>
        </DialogHeader>
        {loading ? (
          <div className="py-8 text-center text-muted-foreground">読み込み中...</div>
        ) : info ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-primary">匿</span>
              </div>
              <div>
                <div className="text-sm font-medium">{info.anonymous_name}</div>
                <div className="text-xs text-muted-foreground">{info.university || ''}</div>
              </div>
            </div>
            <div className="text-sm text-muted-foreground">
              {info.department} {info.year}
            </div>
            <div className="pt-2">
              <Button onClick={() => onStartDM({ user_id: info.id })}>このユーザーとDMを開始</Button>
            </div>
          </div>
        ) : (
          <div className="py-8 text-center text-muted-foreground">ユーザーが見つかりません</div>
        )}
      </DialogContent>
    </Dialog>
  )
}


