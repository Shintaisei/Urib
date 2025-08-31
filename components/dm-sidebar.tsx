"use client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Search, Plus } from "lucide-react"
import { cn } from "@/lib/utils"

interface DMSidebarProps {
  selectedChatId: string | null
  onSelectChat: (chatId: string) => void
}

const mockChats = [
  {
    id: "1",
    anonymousId: "匿名ユーザー #A1B2",
    lastMessage: "ありがとうございました！",
    timestamp: "2分前",
    unreadCount: 0,
    isOnline: true,
  },
  {
    id: "2",
    anonymousId: "匿名ユーザー #C3D4",
    lastMessage: "研究室の件、どうでしたか？",
    timestamp: "15分前",
    unreadCount: 2,
    isOnline: false,
  },
  {
    id: "3",
    anonymousId: "匿名ユーザー #E5F6",
    lastMessage: "明日の授業について教えてください",
    timestamp: "1時間前",
    unreadCount: 0,
    isOnline: true,
  },
  {
    id: "4",
    anonymousId: "匿名ユーザー #G7H8",
    lastMessage: "プログラミングの課題、解決しました",
    timestamp: "3時間前",
    unreadCount: 1,
    isOnline: false,
  },
]

export function DMSidebar({ selectedChatId, onSelectChat }: DMSidebarProps) {
  return (
    <div className="w-80 bg-card border-r border-border flex flex-col">
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">DM</h2>
          <Button size="sm" variant="outline">
            <Plus className="w-4 h-4 mr-2" />
            新規
          </Button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="ユーザーを検索..." className="pl-10" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {mockChats.map((chat) => (
          <div
            key={chat.id}
            className={cn(
              "p-4 border-b border-border cursor-pointer hover:bg-muted/50 transition-colors",
              selectedChatId === chat.id && "bg-muted",
            )}
            onClick={() => onSelectChat(chat.id)}
          >
            <div className="flex items-start space-x-3">
              <div className="relative">
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-primary">匿</span>
                </div>
                {chat.isOnline && (
                  <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-background"></div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-medium text-foreground truncate">{chat.anonymousId}</p>
                  <span className="text-xs text-muted-foreground">{chat.timestamp}</span>
                </div>

                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground truncate">{chat.lastMessage}</p>
                  {chat.unreadCount > 0 && (
                    <Badge variant="default" className="ml-2 h-5 min-w-[20px] text-xs">
                      {chat.unreadCount}
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
