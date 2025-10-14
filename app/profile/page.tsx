"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { ProfileSettings } from "@/components/profile-settings"
import { isAdminEmail } from "@/lib/utils"

export default function ProfilePage() {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    const email = typeof window !== 'undefined' ? localStorage.getItem('user_email') : null
    const ok = isAdminEmail(email || '')
    setIsAdmin(ok)
    if (!ok) {
      router.replace('/')
    }
    setReady(true)
  }, [router])

  if (!ready) return null
  if (!isAdmin) return null

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-6 max-w-2xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">プロフィール設定</h1>
          <p className="text-muted-foreground mt-2">匿名性を保ちながら、アプリの使用体験をカスタマイズできます</p>
        </div>

        <ProfileSettings />
      </main>
    </div>
  )
}
