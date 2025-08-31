"use client"

import { useState } from "react"
import { Header } from "@/components/header"
import { DMSidebar } from "@/components/dm-sidebar"
import { ChatArea } from "@/components/chat-area"
import { EmptyChat } from "@/components/empty-chat"

export default function DMPage() {
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null)

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="flex h-[calc(100vh-73px)]">
        <DMSidebar selectedChatId={selectedChatId} onSelectChat={setSelectedChatId} />

        <div className="flex-1 border-l border-border">
          {selectedChatId ? <ChatArea chatId={selectedChatId} /> : <EmptyChat />}
        </div>
      </div>
    </div>
  )
}
