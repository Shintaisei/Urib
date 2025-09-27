"use client"

import { Header } from "@/components/header"
import { MarketBoard } from "@/components/market-board"
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

