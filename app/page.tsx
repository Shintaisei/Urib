"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { SimpleLogin } from "@/components/simple-login"
import { ProfileSetup } from "@/components/profile-setup"

export default function LoginPage() {
  const router = useRouter()
  const [isRegistered, setIsRegistered] = useState<boolean | null>(null)
  const [showProfile, setShowProfile] = useState(false)
  const [newUserEmail, setNewUserEmail] = useState("")

  useEffect(() => {
    // ユーザーが登録済みかチェック
    const userId = localStorage.getItem('user_id')
    const university = localStorage.getItem('university')
    const year = localStorage.getItem('year')
    const department = localStorage.getItem('department')

    if (userId && university && year && department) {
      // 登録済み → ホームページへ
      setIsRegistered(true)
      router.push('/home')
    } else {
      // 未登録 → ログイン画面を表示
      setIsRegistered(false)
    }
  }, [router])

  const handleExistingUser = (userData: any) => {
    // 既存ユーザー → ホームページへ
    router.push('/home')
  }

  const handleNewUser = (email: string) => {
    // 新規ユーザー → プロフィール設定画面へ
    setNewUserEmail(email)
    setShowProfile(true)
  }

  const handleProfileComplete = (userData: any) => {
    // 登録完了 → ホームページへ
    router.push('/home')
  }

  // チェック中
  if (isRegistered === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">読み込み中...</p>
        </div>
      </div>
    )
  }

  // プロフィール設定画面
  if (showProfile) {
    return <ProfileSetup email={newUserEmail} onComplete={handleProfileComplete} />
  }

  // ログイン画面
  if (isRegistered === false) {
    return <SimpleLogin onExistingUser={handleExistingUser} onNewUser={handleNewUser} />
  }

  // 登録済み → リダイレクト処理中
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <p className="mt-4 text-muted-foreground">読み込み中...</p>
      </div>
    </div>
  )
}
