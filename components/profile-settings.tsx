"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { School, Shield, Bell, Eye, Save, Check } from "lucide-react"
import { isAdminEmail } from "@/lib/utils"

export function ProfileSettings() {
  const [nickname, setNickname] = useState("匿名ユーザー #A1B2")
  const [notifications, setNotifications] = useState(true)
  const [showOnlineStatus, setShowOnlineStatus] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
  const [email, setEmail] = useState("")
  const [university, setUniversity] = useState("")
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    const storedEmail = typeof window !== 'undefined' ? (localStorage.getItem('user_email') || '') : ''
    const storedUniversity = typeof window !== 'undefined' ? (localStorage.getItem('university') || '') : ''
    setEmail(storedEmail)
    setUniversity(storedUniversity)
    setIsAdmin(isAdminEmail(storedEmail))
  }, [])

  const handleSave = async () => {
    setIsSaving(true)

    // Simulate API call
    setTimeout(() => {
      setIsSaving(false)
      setIsSaved(true)
      setTimeout(() => setIsSaved(false), 2000)
    }, 1000)
  }

  return (
    <div className="space-y-6">
      {/* University Information */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <School className="w-5 h-5 text-primary" />
            <CardTitle>大学情報</CardTitle>
          </div>
          <CardDescription>認証済みの大学アカウント情報</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div>
              <p className="font-medium text-foreground">{university || '大学未設定'}</p>
              {isAdmin && email && (
                <p className="text-sm text-muted-foreground">{email}</p>
              )}
            </div>
            <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200">
              <Shield className="w-3 h-3 mr-1" />
              認証済み
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            大学のメールアドレスで認証されています。この情報は他のユーザーには表示されません。
          </p>
        </CardContent>
      </Card>

      {/* Anonymous Settings */}
      <Card>
        <CardHeader>
          <CardTitle>プロフィール設定</CardTitle>
          <CardDescription>表示名に関する設定</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nickname">表示名</Label>
            <Input
              id="nickname"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="表示名を入力"
              maxLength={20}
            />
            <p className="text-xs text-muted-foreground">
              他のユーザーに表示される名前です。いつでも変更できます。
            </p>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="online-status">オンライン状態を表示</Label>
              <p className="text-sm text-muted-foreground">DMでオンライン状態を他のユーザーに表示します</p>
            </div>
            <Switch id="online-status" checked={showOnlineStatus} onCheckedChange={setShowOnlineStatus} />
          </div>
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Bell className="w-5 h-5 text-primary" />
            <CardTitle>通知設定</CardTitle>
          </div>
          <CardDescription>アプリからの通知に関する設定</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="notifications">プッシュ通知</Label>
              <p className="text-sm text-muted-foreground">新しいメッセージや返信の通知を受け取ります</p>
            </div>
            <Switch id="notifications" checked={notifications} onCheckedChange={setNotifications} />
          </div>
        </CardContent>
      </Card>

      {/* Privacy & Safety */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Eye className="w-5 h-5 text-primary" />
            <CardTitle>プライバシーと安全</CardTitle>
          </div>
          <CardDescription>アカウントの安全性に関する設定</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <Button variant="outline" className="w-full justify-start bg-transparent">
              ブロックしたユーザーを管理
            </Button>
            <Button variant="outline" className="w-full justify-start bg-transparent">
              報告履歴を確認
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start text-destructive hover:text-destructive bg-transparent"
              onClick={async () => {
                if (!isAdmin) {
                  alert('この操作は管理者のみが実行できます')
                  return
                }
                if (!confirm('アカウントを削除します。よろしいですか？\nこの操作は取り消せません。')) return
                try {
                  const userId = typeof window !== 'undefined' ? localStorage.getItem('user_id') : null
                  const email = typeof window !== 'undefined' ? localStorage.getItem('user_email') : null
                  const res = await fetch((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000') + '/users/me', {
                    method: 'DELETE',
                    headers: {
                      ...(userId ? { 'X-User-Id': userId } : {}),
                      ...(email ? { 'X-Dev-Email': email } : {}),
                    },
                  })
                  if (!res.ok) {
                    const j = await res.json().catch(() => ({}))
                    throw new Error(j.detail || '削除に失敗しました')
                  }
                  alert('アカウントを削除しました。トップへ戻ります。')
                  if (typeof window !== 'undefined') {
                    localStorage.clear()
                    window.location.href = '/'
                  }
                } catch (e: any) {
                  alert(e.message || '削除に失敗しました')
                }
              }}
            >
              アカウントを削除
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving || isSaved} className="min-w-[120px]">
          {isSaved ? (
            <>
              <Check className="w-4 h-4 mr-2" />
              保存済み
            </>
          ) : isSaving ? (
            <>
              <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent" />
              保存中...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              設定を保存
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
