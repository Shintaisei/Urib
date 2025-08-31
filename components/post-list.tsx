import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Heart, MessageCircle, Share, MoreHorizontal } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

const mockPosts = [
  {
    id: 1,
    author: "匿名ユーザー #A1B2",
    content: "来週の期末試験の情報共有しませんか？特に線形代数の範囲について知りたいです。",
    timestamp: "2分前",
    likes: 12,
    replies: 3,
  },
  {
    id: 2,
    author: "匿名ユーザー #C3D4",
    content: "研究室配属の面接が終わりました。みなさんはどこの研究室を希望していますか？",
    timestamp: "15分前",
    likes: 8,
    replies: 7,
  },
  {
    id: 3,
    author: "匿名ユーザー #E5F6",
    content: "学食の新メニュー美味しかったです！おすすめです。",
    timestamp: "1時間前",
    likes: 24,
    replies: 5,
  },
  {
    id: 4,
    author: "匿名ユーザー #G7H8",
    content: "プログラミングの課題で詰まっています。Pythonのリスト操作について教えてもらえる方いませんか？",
    timestamp: "2時間前",
    likes: 6,
    replies: 12,
  },
  {
    id: 5,
    author: "匿名ユーザー #I9J0",
    content: "図書館の席が全然空いてないですね...みなさんはどこで勉強していますか？",
    timestamp: "3時間前",
    likes: 18,
    replies: 9,
  },
]

export function PostList() {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-foreground">最新の投稿</h2>

      {mockPosts.map((post) => (
        <Card key={post.id} className="bg-card border-border hover:shadow-sm transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                  <span className="text-xs font-medium text-primary">匿</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{post.author}</p>
                  <p className="text-xs text-muted-foreground">{post.timestamp}</p>
                </div>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>報告する</DropdownMenuItem>
                  <DropdownMenuItem>非表示にする</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <p className="text-foreground mb-4 leading-relaxed">{post.content}</p>

            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-red-500">
                <Heart className="w-4 h-4 mr-1" />
                {post.likes}
              </Button>

              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary">
                <MessageCircle className="w-4 h-4 mr-1" />
                {post.replies}
              </Button>

              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                <Share className="w-4 h-4 mr-1" />
                共有
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
