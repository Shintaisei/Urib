import { Header } from "@/components/header"
import { ProfileSettings } from "@/components/profile-settings"

export default function ProfilePage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-6 max-w-2xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">プロフィール設定</h1>
          <p className="text-muted-foreground mt-2">匿名性を保ちながら、アプリの使用体験をカスタマイズできます</p>
        </div>

        <ProfileSettings />
      </main>
    </div>
  )
}
