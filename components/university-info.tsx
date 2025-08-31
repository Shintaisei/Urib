import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { School } from "lucide-react"

export function UniversityInfo() {
  return (
    <Card className="bg-primary/5 border-primary/20">
      <CardContent className="p-6">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
            <School className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">東京大学</h2>
            <p className="text-sm text-muted-foreground">user@s.u-tokyo.ac.jp でログイン中</p>
          </div>
          <div className="ml-auto">
            <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
              認証済み
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
