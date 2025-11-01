"use client"

import { Header } from "@/components/header"
import { DMSidebar } from "@/components/dm/dm-sidebar"
import { ChatArea } from "@/components/dm/chat-area"
import { useEffect, useState } from "react"
import { DMApi } from "@/lib/dm-api"

export default function DMPage() {
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null)
  useEffect(() => {
    // DMページを開いたら通知を既読化（DM通知を含め一括）
    const markAll = async () => {
      try {
        const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
        const userId = typeof window !== 'undefined' ? localStorage.getItem('user_id') : null
        const email = typeof window !== 'undefined' ? localStorage.getItem('user_email') : null
        await fetch(`${API_BASE_URL}/market/notifications/mark-all-read`, {
          method: 'POST',
          headers: {
            ...(userId ? { 'X-User-Id': userId } : {}),
            ...(email ? { 'X-Dev-Email': email } : {}),
          }
        })
      } catch {}
    }
    markAll()
  }, [])
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
