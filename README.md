# 🎓 URIV - 大学コミュニティプラットフォーム

大学内の学生向けコミュニティプラットフォームです。匿名での投稿、DM、書籍売買、授業・サークル情報共有ができます。

## ✨ 主な機能

- **📝 掲示板**: 匿名での投稿・コメント・いいね
- **💬 DM機能**: 学生同士の直接メッセージ
- **📚 書籍売買**: 教科書や参考書の売買
- **🎓 授業まとめ**: 授業情報・レビューの共有
- **🏃 サークルまとめ**: サークル情報の共有
- **🔔 通知システム**: メンション・DM通知
- **👤 プロフィール管理**: 匿名名・大学情報設定

## 🚀 クイックスタート

### 1. リポジトリのクローン
```bash
git clone https://github.com/Shintaisei/Urib.git
cd Uriv-app
```

### 2. バックエンド起動
```bash
cd backend
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### 3. フロントエンド起動
```bash
npm install
npm run dev
```

### 4. アクセス
- **アプリ**: http://localhost:3000
- **API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs

## 📁 プロジェクト構造

```
Uriv-app/
├── app/                    # Next.js App Router
│   ├── api/               # API Routes
│   ├── home/              # ホームページ
│   ├── dm/                # DM機能
│   ├── market/            # 書籍売買
│   └── profile/           # プロフィール
├── components/            # Reactコンポーネント
│   ├── auth/              # 認証関連
│   ├── board/             # 掲示板関連
│   ├── dm/                # DM関連
│   ├── market/            # マーケット関連
│   ├── ui/                # UIコンポーネント
│   │   ├── forms/         # フォーム関連
│   │   └── ...            # 基本UI
│   └── ...                # その他
├── backend/               # FastAPIバックエンド
│   ├── models.py          # データベースモデル
│   ├── schemas.py         # Pydanticスキーマ
│   ├── main.py            # メインアプリ
│   └── *_routes.py        # ルーター
├── lib/                   # ユーティリティ
└── types/                 # TypeScript型定義
```

## 🛠️ 技術スタック

### フロントエンド
- **Next.js 14** (App Router)
- **React 18** + **TypeScript**
- **Tailwind CSS** + **Shadcn/ui**
- **Radix UI** (アクセシブルUI)

### バックエンド
- **FastAPI** (Python)
- **SQLAlchemy** (ORM)
- **Pydantic** (バリデーション)
- **SQLite** (データベース)

### インフラ
- **Vercel** (フロントエンド)
- **Render** (バックエンド)
- **GitHub** (バージョン管理)

## 📖 詳細ドキュメント

- [クイックスタートガイド](./QUICK_START.md)
- [デプロイメントガイド](./DEPLOYMENT.md)
- [データベース設計](./DATABASE_DESIGN.md)
- [GitHub設定](./GITHUB_SETUP.md)

## 🔧 開発

### 環境変数
```bash
# backend/.env
SUPABASE_DB_URL="your_database_url"
```

### データベース
```bash
# データベースリセット
rm backend/uriv.db
# バックエンド再起動で自動再作成
```

### テスト
```bash
# フロントエンド
npm run build
npm run lint

# バックエンド
cd backend
python -m pytest
```

## 📄 ライセンス

MIT License

## 🤝 コントリビューション

プルリクエストやイシューの報告を歓迎します！

---

**開発者**: Shintaisei  
**最終更新**: 2025年1月