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
import Link from "next/link"
import { useRouter } from "next/navigation"

export function Header() {
  const router = useRouter()

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
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive" onClick={() => router.push("/")}>
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
