"use client"

import { GraduationCap, MessageCircle, User, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { SearchDialog } from "@/components/search-dialog"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export function Header() {
  const router = useRouter()

  useEffect(() => {
    const already = sessionStorage.getItem('pv_tracked')
    if (already) return
    const userId = typeof window !== 'undefined' ? localStorage.getItem('user_id') : null
    const email = typeof window !== 'undefined' ? localStorage.getItem('user_email') : null
    fetch(`${API_BASE_URL}/analytics/track`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(userId ? { 'X-User-Id': userId } : {}),
        ...(email ? { 'X-Dev-Email': email } : {}),
      },
      body: JSON.stringify({ path: typeof window !== 'undefined' ? window.location.pathname : '/' })
    }).catch(() => {})
    sessionStorage.setItem('pv_tracked', '1')
  }, [])

  const handleLogout = () => {
    // localStorageをクリア
    localStorage.clear()
    // ログイン画面にリダイレクト
    router.push("/")
  }

  return (
    <header className="border-b border-border bg-card">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between max-w-6xl">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
            <GraduationCap className="w-5 h-5 text-primary-foreground" />
          </div>
          <Link href="/home">
            <h1 className="text-xl font-bold text-foreground hover:text-primary cursor-pointer">Uriv</h1>
          </Link>
        </div>

        <nav className="flex items-center space-x-4">
          <SearchDialog />
          
          <Link href="/dm">
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
              <MessageCircle className="w-4 h-4 mr-2" />
              DM
            </Button>
          </Link>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                <User className="w-4 h-4 mr-2" />
                メニュー
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => router.push("/profile")}>
                <User className="w-4 h-4 mr-2" />
                プロフィール設定
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push("/analytics")}>
                アナリティクス
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive" onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-2" />
                ログアウト
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </nav>
      </div>
    </header>
  )
}
