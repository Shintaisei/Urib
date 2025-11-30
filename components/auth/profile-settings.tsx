"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { School, Shield, Save, Check, Image as ImageIcon, Quote } from "lucide-react"
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://urib-backend.onrender.com'
import { isAdminEmail } from "@/lib/utils"

export function ProfileSettings() {
  const [nickname, setNickname] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
  const [email, setEmail] = useState("")
  const [university, setUniversity] = useState("")
  const [isAdmin, setIsAdmin] = useState(false)
  const [year, setYear] = useState("")
  const [department, setDepartment] = useState("")
  const [bio, setBio] = useState("")
  const [profileImage, setProfileImage] = useState<string>("")
  const [imagePreview, setImagePreview] = useState<string>("")

  useEffect(() => {
    const storedEmail = typeof window !== 'undefined' ? (localStorage.getItem('user_email') || '') : ''
    const storedUniversity = typeof window !== 'undefined' ? (localStorage.getItem('university') || '') : ''
    setEmail(storedEmail)
    setUniversity(storedUniversity)
    setIsAdmin(isAdminEmail(storedEmail))
    // 初期プロフィール取得（user_id が無い場合はメールで解決）
    const loadProfile = async () => {
      try {
        const userId = typeof window !== 'undefined' ? localStorage.getItem('user_id') : null
        const devEmail = typeof window !== 'undefined' ? (localStorage.getItem('dev_user_email') || localStorage.getItem('user_email')) : null
        if (userId) {
          const headers: HeadersInit = { 'X-User-Id': String(userId) }
          const res = await fetch(`${API_BASE_URL}/users/public/${userId}`, { headers })
          if (res.ok) {
            const p = await res.json()
            setNickname(p.anonymous_name || "")
            setUniversity(p.university || "")
            setYear(p.year || "")
            setDepartment(p.department || "")
            setBio(p.bio || "")
            setProfileImage(p.profile_image || "")
            setImagePreview(p.profile_image || "")
            return
          }
        }
        if (devEmail) {
          const res = await fetch(`${API_BASE_URL}/users/check-email?email=${encodeURIComponent(devEmail)}`)
          if (res.ok) {
            const j = await res.json()
            if (j?.user) {
              setNickname(j.user.anonymous_name || "")
              setUniversity(j.user.university || "")
              setYear(j.user.year || "")
              setDepartment(j.user.department || "")
            }
          }
        }
      } catch {}
    }
    loadProfile()
  }, [])

  const handleImageFile = async (file: File) => {
    if (!file) return
    if (!file.type.startsWith("image/")) {
      alert("画像ファイルを選択してください")
      return
    }
    if (file.size > 4 * 1024 * 1024) {
      alert("画像は4MB以下にしてください")
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      setProfileImage(dataUrl)
      setImagePreview(dataUrl)
    }
    reader.readAsDataURL(file)
  }

  const handleSave = async () => {
    try {
      setIsSaving(true)
      const userId = typeof window !== 'undefined' ? localStorage.getItem('user_id') : null
      const devEmail = typeof window !== 'undefined' ? (localStorage.getItem('dev_user_email') || localStorage.getItem('user_email')) : null
      if (!userId && !devEmail) {
        alert('保存にはログインが必要です。メール認証を行ってください。')
        setIsSaving(false)
        return
      }
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...(userId ? { 'X-User-Id': String(userId) } : {}),
        ...(devEmail ? { 'X-Dev-Email': `dev:${devEmail}` } : {}),
      }
      const body = {
        anonymous_name: nickname,
        year,
        department,
        university,
        profile_image: profileImage || null,
        bio,
      }
      const res = await fetch(`${API_BASE_URL}/users/me`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.detail || '保存に失敗しました')
      }
      setIsSaved(true)
      setTimeout(() => setIsSaved(false), 2000)
    } catch (e: any) {
      alert(e?.message || '保存に失敗しました')
    } finally {
      setIsSaving(false)
    }
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
              <div className="flex items-center gap-2">
                <p className="font-medium text-foreground">{university || '大学未設定'}</p>
              </div>
              <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="university">学校（自由入力）</Label>
                  <Input id="university" value={university} onChange={(e) => setUniversity(e.target.value)} placeholder="例: 北海道大学" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="year">学年</Label>
                  <Input id="year" value={year} onChange={(e) => setYear(e.target.value)} placeholder="例: 1年/2年/3年/4年/修士/博士" />
                </div>
              </div>
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
          <CardDescription>表示名・学部・プロフィール画像・ひと言</CardDescription>
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
            <p className="text-xs text-muted-foreground">他のユーザーに表示される名前です。</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="department">学部</Label>
              <Input id="department" value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="例: 工学部" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bio" className="flex items-center gap-1"><Quote className="w-4 h-4" /> ひと言</Label>
              <Input id="bio" value={bio} onChange={(e) => setBio(e.target.value)} placeholder="例: 今日も頑張る" maxLength={200} />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2"><ImageIcon className="w-4 h-4" /> プロフィール画像</Label>
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 rounded-full overflow-hidden bg-muted flex items-center justify-center">
                {imagePreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={imagePreview} alt="profile" className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon className="w-6 h-6 text-muted-foreground" />
                )}
              </div>
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) handleImageFile(f)
                }}
                className="max-w-xs"
              />
            </div>
            <p className="text-xs text-muted-foreground">4MBまで、正方形推奨。画像は端末内に一時保存され、サーバーにはDataURLとして保存されます。</p>
          </div>

          <Separator />
        </CardContent>
      </Card>

      {/* 通知設定・プライバシー機能は未実装のため一旦非表示 */}

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
