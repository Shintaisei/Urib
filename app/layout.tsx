import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import { AuthProvider } from '@/contexts/AuthContext'
import { ChunkRecovery } from '@/components/chunk-recovery'
import { FloatingPostButton } from '@/components/ui/forms/floating-post-button'
import './globals.css'

export const metadata: Metadata = {
  title: 'Uriv - 大学掲示板',
  description: '大学専用の掲示板・マーケット・DMアプリ',
  generator: 'Next.js',
  icons: {
    icon: '/favicon.svg',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable}`}>
        <AuthProvider>
          <ChunkRecovery />
          {children}
          <FloatingPostButton />
        </AuthProvider>
      </body>
    </html>
  )
}
