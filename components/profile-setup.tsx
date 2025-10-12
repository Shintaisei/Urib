"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select } from "@/components/ui/select"
import { GraduationCap, Loader2 } from "lucide-react"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

// 学年の選択肢
const YEARS = [
  "1年生",
  "2年生",
  "3年生",
  "4年生",
  "修士1年",
  "修士2年",
  "博士課程",
  "その他"
]

// 学部の選択肢
const DEPARTMENTS = [
  "文学部",
  "法学部",
  "経済学部",
  "商学部",
  "教育学部",
  "工学部",
  "理学部",
  "農学部",
  "医学部",
  "歯学部",
  "薬学部",
  "看護学部",
  "情報学部",
  "国際学部",
  "芸術学部",
  "総合系",
  "その他"
]

// 大学の選択肢
const UNIVERSITIES = [
  "北海道大学",
  "東北大学",
  "東京大学",
  "東京工業大学",
  "一橋大学",
  "名古屋大学",
  "京都大学",
  "大阪大学",
  "神戸大学",
  "九州大学",
  "早稲田大学",
  "慶應義塾大学",
  "上智大学",
  "明治大学",
  "青山学院大学",
  "立教大学",
  "中央大学",
  "法政大学",
  "同志社大学",
  "立命館大学",
  "関西大学",
  "関西学院大学",
  "その他"
]

interface ProfileSetupProps {
  email?: string  // ログイン画面から渡されたメールアドレス
  onComplete: (userData: any) => void
}

export function ProfileSetup({ email, onComplete }: ProfileSetupProps) {
  const [university, setUniversity] = useState("")
  const [year, setYear] = useState("")
  const [department, setDepartment] = useState("")
  const [nickname, setNickname] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!university || !year || !department || !nickname.trim()) {
      setError("すべての項目を入力してください")
      return
    }
    
    if (nickname.trim().length < 2) {
      setError("ニックネームは2文字以上で入力してください")
      return
    }
    
    if (nickname.trim().length > 20) {
      setError("ニックネームは20文字以内で入力してください")
      return
    }

    setIsSubmitting(true)
    setError("")

    try {
      const response = await fetch(`${API_BASE_URL}/users/quick-register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email || null,  // メールアドレスがあれば含める
          university,
          year,
          department,
          nickname: nickname.trim()
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.detail || '登録に失敗しました')
      }

      const userData = await response.json()
      
      // localStorageに保存
      localStorage.setItem('user_id', userData.user_id.toString())
      localStorage.setItem('user_email', email || `user${userData.user_id}@temp.uriv`)
      localStorage.setItem('anonymous_name', userData.anonymous_name)
      localStorage.setItem('university', userData.university)
      localStorage.setItem('year', userData.year)
      localStorage.setItem('department', userData.department)
      
      // 完了コールバック
      onComplete(userData)
    } catch (err: any) {
      setError(err.message || '登録に失敗しました')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-primary rounded-full flex items-center justify-center mb-4">
            <GraduationCap className="w-8 h-8 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl">Uriv へようこそ</CardTitle>
          <CardDescription>
            {email && (
              <div className="mb-2 text-primary font-medium">
                {email}
              </div>
            )}
            大学生限定の匿名コミュニティ
            <br />
            まずは簡単な情報を教えてください（10秒で完了）
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* ニックネーム入力 */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                ニックネーム（2〜20文字）
              </label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="例: さくら、たろう、工学太郎 など"
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground"
                maxLength={20}
                required
              />
              <p className="text-xs text-muted-foreground">
                投稿時にこの名前で表示されます。本名でなくてOKです。
              </p>
            </div>

            {/* 大学選択 */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                あなたの大学は？
              </label>
              <select
                value={university}
                onChange={(e) => setUniversity(e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground"
                required
              >
                <option value="">選択してください</option>
                {UNIVERSITIES.map((univ) => (
                  <option key={univ} value={univ}>
                    {univ}
                  </option>
                ))}
              </select>
            </div>

            {/* 学年選択 */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                学年は？
              </label>
              <select
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground"
                required
              >
                <option value="">選択してください</option>
                {YEARS.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            {/* 学部選択 */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                学部は？
              </label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground"
                required
              >
                <option value="">選択してください</option>
                {DEPARTMENTS.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>

            {error && (
              <div className="text-sm text-red-500 text-center">
                {error}
              </div>
            )}

            <Button 
              type="submit" 
              className="w-full" 
              disabled={isSubmitting || !university || !year || !department || !nickname.trim()}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  登録中...
                </>
              ) : (
                "始める"
              )}
            </Button>

            <p className="text-xs text-center text-muted-foreground mt-4">
              ※本名やメールアドレスは不要です。好きなニックネームで参加できます。
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

