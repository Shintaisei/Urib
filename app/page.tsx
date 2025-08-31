import { LoginForm } from "@/components/login-form"
import { GraduationCap } from "lucide-react"

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="mx-auto w-16 h-16 bg-primary rounded-full flex items-center justify-center mb-4">
            <GraduationCap className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">Uriv</h1>
          <p className="text-muted-foreground mt-2">大学生限定の匿名コミュニティ</p>
        </div>

        <LoginForm />

        <div className="text-center text-sm text-muted-foreground">
          <p>大学のメールアドレスでログインしてください</p>
          <p className="mt-1">認証リンクをメールで送信します</p>
        </div>
      </div>
    </div>
  )
}
