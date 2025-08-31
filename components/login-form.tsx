"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Mail, Loader2 } from "lucide-react"

export function LoginForm() {
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isEmailSent, setIsEmailSent] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email.includes("@") || (!email.includes(".ac.jp") && !email.includes(".edu"))) {
      alert("大学のメールアドレスを入力してください")
      return
    }

    setIsLoading(true)

    setTimeout(() => {
      setIsLoading(false)
      setIsEmailSent(true)
    }, 2000)
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
          <Button className="w-full" onClick={() => router.push("/home")}>
            ホームに進む
          </Button>
          <Button
            variant="outline"
            className="w-full bg-transparent"
            onClick={() => {
              setIsEmailSent(false)
              setEmail("")
            }}
          >
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
              onChange={(e) => setEmail(e.target.value)}
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
