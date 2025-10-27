"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Header } from "@/components/header"
import { ProfileSettings } from "@/components/auth/profile-settings"
import { isAdminEmail } from "@/lib/utils"

export default function ProfilePage() {
  const [ready, setReady] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    const email = typeof window !== 'undefined' ? localStorage.getItem('user_email') : null
    const ok = isAdminEmail(email || '')
    setIsAdmin(ok)
    setReady(true)
  }, [])

  if (!ready) return null

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-6 max-w-2xl">
        {!isAdmin ? (
          <div className="text-center py-16">
            <h1 className="text-2xl font-bold text-foreground mb-2">管理者限定ページ</h1>
            <p className="text-muted-foreground mb-6">このページは管理者のみが閲覧できます。</p>
            <Link href="/" className="text-primary underline">ホームへ戻る</Link>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-foreground">プロフィール設定</h1>
              <p className="text-muted-foreground mt-2">匿名性を保ちながら、アプリの使用体験をカスタマイズできます</p>
            </div>

            <ProfileSettings />
          </>
        )}
      </main>
    </div>
  )
}
