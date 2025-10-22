"use client"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Search, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { DMApi, type Conversation } from "@/lib/dm-api"
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface DMSidebarProps {
  selectedChatId: string | null
  onSelectChat: (chatId: string) => void
}

export function DMSidebar({ selectedChatId, onSelectChat }: DMSidebarProps) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [search, setSearch] = useState("")
  const [year, setYear] = useState("")
  const [department, setDepartment] = useState("")
  const [userResults, setUserResults] = useState<Array<{id:number; anonymous_name:string; email?:string; university?:string; year?:string; department?:string}>>([])
  const [loadingUsers, setLoadingUsers] = useState(false)

  const refresh = async (): Promise<void> => {
    try {
      const list = await DMApi.getConversations()
      setConversations(list)
    } catch {
      setConversations([])
    }
  }

  useEffect(() => {
    refresh()
    const id = setInterval(refresh, 15000)
    return () => clearInterval(id)
  }, [])

  // 全ユーザー検索（匿名名 + 学年/学部フィルタ）
  useEffect(() => {
    const h = setTimeout(async () => {
      if (!search && !year && !department) { setUserResults([]); return }
      setLoadingUsers(true)
      try {
        const params = new URLSearchParams()
        if (search) params.set('name_prefix', search)
        if (year) params.set('year', year)
        if (department) params.set('department', department)
        const res = await fetch(`${API_BASE_URL}/users/search?${params.toString()}`, { cache: 'no-store' })
        const data = await res.json()
        setUserResults(Array.isArray(data) ? data : [])
      } catch {
        setUserResults([])
      } finally {
        setLoadingUsers(false)
      }
    }, 250)
    return () => clearTimeout(h)
  }, [search, year, department])

  const startNew = async (): Promise<void> => {
    const email = window.prompt("相手のメールアドレスを入力")?.trim()
    if (!email) return
    try {
      const conv = await DMApi.createConversation({ partner_email: email })
      await refresh()
      onSelectChat(String(conv.id))
    } catch (e: any) {
      alert(e?.message || "作成に失敗しました")
    }
  }

  const startDMToUser = async (userId: number) => {
    try {
      const uid = typeof window !== 'undefined' ? localStorage.getItem('user_id') : null
      if (!uid) throw new Error('ユーザーIDが見つかりません')
      const res = await fetch(`${API_BASE_URL}/dm/conversations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-User-Id': uid },
        body: JSON.stringify({ partner_user_id: userId })
      })
      const conv = await res.json()
      await refresh()
      onSelectChat(String(conv.id))
    } catch (e: any) {
      alert(e?.message || 'DM開始に失敗しました')
    }
  }

  return (
    <div className="w-80 bg-card border-r border-border flex flex-col">
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">DM</h2>
          <Button size="sm" variant="outline" onClick={startNew}>
            <Plus className="w-4 h-4 mr-2" />
            新規
          </Button>
        </div>

        <div className="space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="ユーザーを検索..." className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="flex gap-2">
            <Input placeholder="学年(例: 1年生)" value={year} onChange={(e) => setYear(e.target.value)} />
            <Input placeholder="学部(例: 工学部)" value={department} onChange={(e) => setDepartment(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* 検索結果（ユーザー） */}
        {(search || year || department) && (
          <div className="p-2">
            <div className="text-xs text-muted-foreground mb-1">ユーザー</div>
            {loadingUsers && <div className="text-xs text-muted-foreground p-2">検索中...</div>}
            {!loadingUsers && userResults.length === 0 && (
              <div className="text-xs text-muted-foreground p-2">一致するユーザーがいません</div>
            )}
            {userResults.map(u => (
              <div key={u.id} className="p-2 mb-1 rounded hover:bg-muted/50 cursor-pointer flex items-center justify-between"
                   onClick={() => startDMToUser(u.id)}>
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                    <span className="text-xs text-primary">匿</span>
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm text-foreground truncate">{u.anonymous_name}</div>
                    <div className="text-xs text-muted-foreground truncate">{u.department || ''} {u.year || ''}</div>
                  </div>
                </div>
                <Button size="sm" variant="outline">DM</Button>
              </div>
            ))}
          </div>
        )}

        {/* 既存会話 */}
        {conversations
          .filter((c) => !search || c.partner_name?.includes(search) || c.partner_email?.includes(search))
          .map((chat) => (
          <div
            key={chat.id}
            className={cn(
              "p-4 border-b border-border cursor-pointer hover:bg-muted/50 transition-colors",
              selectedChatId === String(chat.id) && "bg-muted",
            )}
            onClick={() => onSelectChat(String(chat.id))}
          >
            <div className="flex items-start space-x-3">
              <div className="relative">
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-primary">匿</span>
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-medium text-foreground truncate">{chat.partner_name || chat.partner_email}</p>
                  <span className="text-xs text-muted-foreground">{chat.last_message_at ? new Date(chat.last_message_at).toLocaleTimeString() : ''}</span>
                </div>

                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground truncate">{chat.last_message || ''}</p>
                  {chat.unread_count > 0 && (
                    <Badge variant="default" className="ml-2 h-5 min-w-[20px] text-xs">
                      {chat.unread_count}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
