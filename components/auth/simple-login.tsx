"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { GraduationCap, Loader2, Mail } from "lucide-react"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface SimpleLoginProps {
  onExistingUser: (userData: any) => void
  onNewUser: (email: string) => void
}

export function SimpleLogin({ onExistingUser, onNewUser }: SimpleLoginProps) {
  const [email, setEmail] = useState("")
  const [isChecking, setIsChecking] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email.trim()) {
      setError("メールアドレスを入力してください")
      return
    }

    // 簡易的なメールフォーマットチェック
    if (!email.includes("@") || !email.includes(".")) {
      setError("有効なメールアドレスを入力してください")
      return
    }

    setIsChecking(true)
    setError("")

    try {
      // メールアドレスでユーザーをチェック
      const response = await fetch(`${API_BASE_URL}/users/check-email?email=${encodeURIComponent(email.trim())}`)

      if (!response.ok) {
        throw new Error('ユーザーチェックに失敗しました')
      }

      const data = await response.json()
      
      if (data.exists) {
        // 既存ユーザー → ログイン完了
        localStorage.setItem('user_id', data.user.id.toString())
        localStorage.setItem('user_email', data.user.email)
        localStorage.setItem('anonymous_name', data.user.anonymous_name)
        localStorage.setItem('university', data.user.university)
        localStorage.setItem('year', data.user.year)
        localStorage.setItem('department', data.user.department)
        
        onExistingUser(data.user)
      } else {
        // 新規ユーザー → プロフィール設定画面へ
        onNewUser(email.trim())
      }
    } catch (err: any) {
      setError(err.message || 'エラーが発生しました')
    } finally {
      setIsChecking(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-primary rounded-full flex items-center justify-center mb-4">
            <GraduationCap className="w-8 h-8 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl">Uriv にログイン</CardTitle>
          <CardDescription>
            大学のメールアドレスを入力してください
            <br />
            初めての方は自動的に登録画面に移動します
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                メールアドレス
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@university.ac.jp"
                  className="pl-10"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="text-sm text-red-500 text-center">
                {error}
              </div>
            )}

            <Button 
              type="submit" 
              className="w-full" 
              disabled={isChecking || !email.trim()}
            >
              {isChecking ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  確認中...
                </>
              ) : (
                "次へ"
              )}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              対応ドメイン: .ac.jp, .edu など
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

