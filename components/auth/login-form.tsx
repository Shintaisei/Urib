"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Mail, Loader2 } from "lucide-react"
import type { AuthState } from "@/types"

interface LoginFormState {
  email: string
  isLoading: boolean
  isEmailSent: boolean
  authState: AuthState
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export function LoginForm(): React.ReactElement {
  const [email, setEmail] = useState<string>("")
  const [code, setCode] = useState<string>("")
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [isEmailSent, setIsEmailSent] = useState<boolean>(false)
  const [devCode, setDevCode] = useState<string>("")
  const [error, setError] = useState<string>("")
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault()
    setError("")

    if (!email.includes("@") || (!email.includes(".ac.jp") && !email.includes(".edu"))) {
      setError("大学のメールアドレスを入力してください")
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch(`${API_BASE_URL}/auth/request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.detail || '認証リクエストに失敗しました')
      }

      // 開発モードの認証コードを保存
      if (data.dev_code) {
        setDevCode(data.dev_code)
      }

      setIsEmailSent(true)
    } catch (err: any) {
      setError(err.message || '認証リクエストに失敗しました')
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerifyCode = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      const response = await fetch(`${API_BASE_URL}/auth/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, code }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.detail || '認証コードが正しくありません')
      }

      // 認証成功 - ローカルストレージに保存
      localStorage.setItem('user_email', email)
      localStorage.setItem('user_id', data.user_id)
      localStorage.setItem('university', data.university || '')
      localStorage.setItem('access_token', data.access_token || 'authenticated')

      // 初回遷移: ホームの最新タブ
      router.push('/home')
    } catch (err: any) {
      setError(err.message || '認証に失敗しました')
    } finally {
      setIsLoading(false)
    }
  }

  const handleReset = (): void => {
    setIsEmailSent(false)
    setEmail("")
    setCode("")
    setDevCode("")
    setError("")
  }

  if (isEmailSent) {
    return (
      <Card className="w-full">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Mail className="w-6 h-6 text-primary" />
          </div>
          <CardTitle className="text-xl">認証コードを入力</CardTitle>
          <CardDescription>
            {email} に認証コードを送信しました。
            {devCode && (
              <div className="mt-2 p-2 bg-yellow-100 dark:bg-yellow-900/20 rounded text-yellow-800 dark:text-yellow-200">
                <strong>開発モード：</strong> 認証コード: <strong className="text-lg">{devCode}</strong>
              </div>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleVerifyCode} className="space-y-4">
            <div className="space-y-2">
              <Input
                type="text"
                placeholder="認証コード (6桁)"
                value={code}
                onChange={(e: React.ChangeEvent<HTMLInputElement>): void => setCode(e.target.value)}
                required
                maxLength={6}
                className="w-full text-center text-2xl tracking-widest"
              />
            </div>
            {error && (
              <div className="text-sm text-red-500 text-center">
                {error}
              </div>
            )}
            <Button type="submit" className="w-full" disabled={isLoading || code.length !== 6}>
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  認証中...
                </>
              ) : (
                "ログイン"
              )}
            </Button>
            <Button variant="outline" className="w-full bg-transparent" onClick={handleReset} type="button">
              別のメールアドレスでログイン
            </Button>
          </form>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-xl text-center">ログイン</CardTitle>
        <CardDescription className="text-center">大学のメールアドレスを入力してください</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Input
              type="email"
              placeholder="example@university.ac.jp"
              value={email}
              onChange={(e: React.ChangeEvent<HTMLInputElement>): void => setEmail(e.target.value)}
              required
              className="w-full"
            />
          </div>
          {error && (
            <div className="text-sm text-red-500 text-center">
              {error}
            </div>
          )}
          <Button type="submit" className="w-full" disabled={isLoading || !email}>
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                送信中...
              </>
            ) : (
              "認証コードを送信"
            )}
          </Button>
        </form>

        <div className="mt-4 text-xs text-muted-foreground text-center">
          <p>対応ドメイン: .ac.jp, .edu</p>
        </div>
      </CardContent>
    </Card>
  )
}
