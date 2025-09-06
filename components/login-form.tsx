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

export function LoginForm(): React.ReactElement {
  const [email, setEmail] = useState<string>("")
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [isEmailSent, setIsEmailSent] = useState<boolean>(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault()

    if (!email.includes("@") || (!email.includes(".ac.jp") && !email.includes(".edu"))) {
      alert("大学のメールアドレスを入力してください")
      return
    }

    setIsLoading(true)

    setTimeout((): void => {
      setIsLoading(false)
      setIsEmailSent(true)
    }, 2000)
  }

  const handleReset = (): void => {
    setIsEmailSent(false)
    setEmail("")
  }

  const handleNavigateHome = (): void => {
    router.push("/home")
  }

  if (isEmailSent) {
    return (
      <Card className="w-full">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Mail className="w-6 h-6 text-primary" />
          </div>
          <CardTitle className="text-xl">メールを送信しました</CardTitle>
          <CardDescription>
            {email} に認証リンクを送信しました。
            <br />
            メールをご確認ください。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button className="w-full" onClick={handleNavigateHome}>
            ホームに進む
          </Button>
          <Button variant="outline" className="w-full bg-transparent" onClick={handleReset}>
            別のメールアドレスでログイン
          </Button>
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
          <Button type="submit" className="w-full" disabled={isLoading || !email}>
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                送信中...
              </>
            ) : (
              "認証リンクを送信"
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
