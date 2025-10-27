import { MessageCircle } from "lucide-react"

export function EmptyChat() {
  return (
    <div className="flex items-center justify-center h-full bg-muted/20">
      <div className="text-center space-y-4">
        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
          <MessageCircle className="w-8 h-8 text-muted-foreground" />
        </div>
        <div>
          <h3 className="text-lg font-medium text-foreground">DMを選択してください</h3>
          <p className="text-sm text-muted-foreground">左側のリストから会話を選択するか、新しいDMを開始してください</p>
        </div>
      </div>
    </div>
  )
}
