"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Send, MoreVertical } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { DMApi, type Message } from "@/lib/dm-api"

interface ChatAreaProps { chatId: string }

export function ChatArea({ chatId }: ChatAreaProps) {
  const [message, setMessage] = useState("")
  const [messages, setMessages] = useState<Message[]>([])
  const [partnerLabel, setPartnerLabel] = useState<string>("相手")

  const fetchMessages = async () => {
    try {
      const rows = await DMApi.getMessages(chatId)
      setMessages(rows)
    } catch {
      setMessages([])
    }
  }

  useEffect(() => {
    fetchMessages()
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
        {messages.map((msg) => (
          <div key={msg.id} className={cn("flex", msg.is_own ? "justify-start" : "justify-end")}>
            <div
              className={cn(
                "max-w-[70%] rounded-lg px-4 py-2",
                msg.is_own ? "bg-primary text-primary-foreground" : "bg-muted text-foreground",
              )}
            >
              <p className="text-sm">{msg.content}</p>
              <p className={cn("text-xs mt-1", msg.is_own ? "text-primary-foreground/70" : "text-muted-foreground")}>
                {/* timestamp could be derived if needed */}
              </p>
            </div>
          </div>
        ))}
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
