"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Send, MoreVertical } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { DMApi, type Message, type Conversation } from "@/lib/dm-api"
import { LoadingProgress } from "@/components/loading-progress"

interface ChatAreaProps { chatId: string }

export function ChatArea({ chatId }: ChatAreaProps) {
  const [message, setMessage] = useState("")
  const [messages, setMessages] = useState<Message[]>([])
  const [partnerLabel, setPartnerLabel] = useState<string>("相手")
  const [loading, setLoading] = useState(false)
  const [partnerInitial, setPartnerInitial] = useState<string>("匿")
  const [myName, setMyName] = useState<string>("あなた")

  const fetchMessages = async () => {
    try {
      setLoading(true)
      const rows = await DMApi.getMessages(chatId)
      setMessages(rows)
    } catch {
      setMessages([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const load = async () => {
      try {
        // 会話情報から相手名を解決
        const list: Conversation[] = await DMApi.getConversations()
        const conv = list.find(c => String(c.id) === String(chatId))
        const name = conv?.partner_name || conv?.partner_email || "相手"
        setPartnerLabel(name)
        setPartnerInitial(name?.charAt(0) || '匿')
      } catch {}
      await fetchMessages()
    }
    load()
  }, [chatId])

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim()) return
    try {
      await DMApi.sendMessage({ conversation_id: chatId, content: message.trim() } as any)
      setMessage("")
      await fetchMessages()
      // 既読反映
      try { await fetch(`/api`) } catch {}
    } catch (err: any) {
      alert(err?.message || '送信に失敗しました')
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Chat Header */}
      <div className="p-4 border-b border-border bg-card">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
              <span className="text-sm font-medium text-primary">匿</span>
            </div>
            <div>
              <h3 className="font-medium text-foreground">{partnerLabel}</h3>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-xs text-muted-foreground">オンライン</span>
              </div>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>会話を非表示</DropdownMenuItem>
              <DropdownMenuItem>ユーザーを報告</DropdownMenuItem>
              <DropdownMenuItem className="text-destructive">ブロック</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? (
          <div className="py-8">
            <LoadingProgress isLoading={true} text="メッセージを読み込み中..." />
          </div>
        ) : (
          messages.map((msg) => {
            const isOwn = !!msg.is_own
            const name = isOwn ? myName : partnerLabel
            const initial = isOwn ? (myName?.charAt(0) || '自') : partnerInitial
            return (
              <div key={msg.id} className={cn("flex items-end gap-2", isOwn ? "justify-end" : "justify-start")}> 
                {!isOwn && (
                  <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                    <span className="text-xs font-medium text-primary">{initial}</span>
                  </div>
                )}
                <div className={cn("max-w-[70%]", isOwn ? "items-end" : "items-start")}> 
                  <div className={cn("text-[11px] mb-1", isOwn ? "text-muted-foreground text-right" : "text-muted-foreground")}>{name}</div>
                  <div
                    className={cn(
                      "rounded-lg px-4 py-2",
                      isOwn ? "bg-primary text-primary-foreground" : "bg-muted text-foreground",
                    )}
                  >
                    <p className="text-sm break-words whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
                {isOwn && (
                  <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                    <span className="text-xs font-medium text-primary">{(myName?.charAt(0) || '自')}</span>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Message Input */}
      <div className="p-4 border-t border-border bg-card">
        <form onSubmit={handleSend} className="flex space-x-2">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="メッセージを入力..."
            className="flex-1"
          />
          <Button type="submit" disabled={!message.trim()}>
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  )
}
