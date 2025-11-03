"use client"

import { Header } from "@/components/header"
export const dynamic = 'force-dynamic'
import { MarketBoard } from "@/components/market/market-board"
import ProtectedRoute from "@/components/ProtectedRoute"

export default function MarketPage() {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <Header />
        <MarketBoard />
      </div>
    </ProtectedRoute>
  )
}

