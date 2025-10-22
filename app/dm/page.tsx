"use client"

import { Header } from "@/components/header"
import { DMSidebar } from "@/components/dm-sidebar"
import { ChatArea } from "@/components/chat-area"
import { useState } from "react"
import { DMApi } from "@/lib/dm-api"

export default function DMPage() {
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null)
  const handleStartDM = async (userIdOrEmail: { user_id?: number; email?: string }) => {
    try {
      const conv = await DMApi.createConversation(userIdOrEmail.user_id ? { partner_email: undefined as any } : { partner_email: userIdOrEmail.email! })
      setSelectedChatId(String(conv.id))
    } catch {}
  }
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-6 max-w-6xl">
        <div className="h-[calc(100vh-140px)] border rounded bg-card grid grid-cols-[320px_1fr]">
          <DMSidebar selectedChatId={selectedChatId} onSelectChat={setSelectedChatId} />
          <div className="flex-1">
            {selectedChatId ? (
              <ChatArea chatId={selectedChatId} />
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                左のリストから会話を選択してください
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
