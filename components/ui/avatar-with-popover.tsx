"use client"

import { useEffect, useMemo, useState } from "react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { MessageCircle, User } from "lucide-react"
import { useRouter } from "next/navigation"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

type PublicUser = {
  id: number
  anonymous_name: string
  university?: string | null
  year?: string | null
  department?: string | null
  profile_image?: string | null
  bio?: string | null
}

export function AvatarWithPopover({
  anonymousName,
  userId,
  size = 28,
}: {
  anonymousName?: string
  userId?: number
  size?: number
}) {
  const router = useRouter()
  const [user, setUser] = useState<PublicUser | null>(null)
  const [loading, setLoading] = useState(false)

  const headers = useMemo(() => {
    const h: Record<string, string> = {}
    const uid = typeof window !== "undefined" ? localStorage.getItem("user_id") : null
    const email = typeof window !== "undefined" ? localStorage.getItem("user_email") : null
    if (uid) h["X-User-Id"] = uid
    if (email) h["X-Dev-Email"] = email
    return h
  }, [])

  useEffect(() => {
    let cancelled = false
    const fetchUser = async () => {
      try {
        setLoading(true)
        let uid = userId
        if (!uid && anonymousName) {
          const res = await fetch(`${API_BASE_URL}/users/resolve?anonymous_name=${encodeURIComponent(anonymousName)}`, { headers })
          if (!res.ok) return
          const j = await res.json()
          uid = j?.id
        }
        if (!uid) return
        const res2 = await fetch(`${API_BASE_URL}/users/public/${uid}`, { headers })
        if (!res2.ok) return
        const j2 = await res2.json()
        if (!cancelled) setUser(j2)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchUser()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anonymousName, userId])

  const img = user?.profile_image
  const initials = (user?.anonymous_name || anonymousName || "?").slice(0, 2)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" aria-label="ユーザー情報" className="rounded-full overflow-hidden bg-muted flex items-center justify-center" style={{ width: size, height: size }}>
          {img ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={img} alt={user?.anonymous_name || anonymousName || "user"} className="w-full h-full object-cover" />
          ) : (
            <span className="text-[10px] text-muted-foreground">{initials}</span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <div className="p-2">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full overflow-hidden bg-muted flex items-center justify-center">
              {img ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={img} alt="user" className="w-full h-full object-cover" />
              ) : (
                <User className="w-5 h-5 text-muted-foreground" />
              )}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold truncate">{user?.anonymous_name || anonymousName || "匿名"}</div>
              <div className="text-xs text-muted-foreground truncate">
                {(user?.university || "学校未設定")} / {(user?.department || "学部未設定")} / {(user?.year || "学年未設定")}
              </div>
            </div>
          </div>
          {user?.bio && <div className="text-xs mt-2 text-foreground line-clamp-3">“{user.bio}”</div>}
        </div>
        <DropdownMenuItem onClick={() => { if (user?.id) router.push(`/u/${user.id}?tab=posts`) }}>
          投稿を見る
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => { if (user?.id) router.push(`/u/${user.id}?tab=liked`) }}>
          いいね一覧
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => { if (user?.id) router.push(`/u/${user.id}?tab=replied`) }}>
          返信した投稿
        </DropdownMenuItem>
        <div className="p-2 pt-0">
          <Button variant="outline" size="sm" className="w-full">
            <MessageCircle className="w-4 h-4 mr-1" />
            DMする
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}


