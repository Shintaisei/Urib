"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Send, MoreVertical } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

interface ChatAreaProps {
  chatId: string
}

const mockMessages = {
  "1": [
    {
      id: 1,
      content: "こんにちは！工学部の授業について質問があります。",
      isSent: false,
      timestamp: "14:30",
    },
    {
      id: 2,
      content: "はい、何でも聞いてください！",
      isSent: true,
      timestamp: "14:32",
    },
    {
      id: 3,
      content: "線形代数の課題、どのように解けばいいでしょうか？",
      isSent: false,
      timestamp: "14:35",
    },
    {
      id: 4,
      content: "行列の固有値を求める問題ですね。まず特性方程式を立てて...",
      isSent: true,
      timestamp: "14:37",
    },
    {
      id: 5,
      content: "ありがとうございました！",
      isSent: false,
      timestamp: "14:45",
    },
  ],
  "2": [
    {
      id: 1,
      content: "研究室配属の面接はどうでしたか？",
      isSent: false,
      timestamp: "10:15",
    },
    {
      id: 2,
      content: "思ったより緊張しました。あなたはどこを希望していますか？",
      isSent: true,
      timestamp: "10:20",
    },
    {
      id: 3,
      content: "研究室の件、どうでしたか？",
      isSent: false,
      timestamp: "15分前",
    },
  ],
}

export function ChatArea({ chatId }: ChatAreaProps) {
  const [message, setMessage] = useState("")
  const messages = mockMessages[chatId as keyof typeof mockMessages] || []
  const chatUser = `匿名ユーザー #${chatId === "1" ? "A1B2" : "C3D4"}`

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim()) return

    // In real app, send message to API
    setMessage("")
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
              <h3 className="font-medium text-foreground">{chatUser}</h3>
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
          <div key={msg.id} className={cn("flex", msg.isSent ? "justify-end" : "justify-start")}>
            <div
              className={cn(
                "max-w-[70%] rounded-lg px-4 py-2",
                msg.isSent ? "bg-primary text-primary-foreground" : "bg-muted text-foreground",
              )}
            >
              <p className="text-sm">{msg.content}</p>
              <p className={cn("text-xs mt-1", msg.isSent ? "text-primary-foreground/70" : "text-muted-foreground")}>
                {msg.timestamp}
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
