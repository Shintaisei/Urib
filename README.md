# URIV - 大学生限定匿名コミュニティ

大学生向けの匿名掲示板＆マーケットプレイスアプリケーション

## 📋 概要

URIVは大学の学生向けに設計されたコミュニティプラットフォームです。学生同士で情報交換、商品の売買、無料提供、求購を行うことができます。

### 主な機能

- 📝 **匿名掲示板** - 質問や情報共有を匿名で投稿
- 💬 **コメント機能** - 投稿に返信してディスカッション
- ❤️ **いいね機能** - 気になる投稿にいいね
- 🛒 **マーケット** - 商品の出品・購入・無料提供
- 🔍 **検索・フィルター** - 商品やカテゴリで絞り込み
- 👤 **固定匿名名** - ユーザーごとに一貫した匿名ID

---

## 🛠️ 技術スタック

### フロントエンド
- **Next.js 15.2** - Reactフレームワーク
- **React 18** - UIライブラリ
- **TypeScript** - 型安全な開発
- **Tailwind CSS** - スタイリング
- **shadcn/ui** - UIコンポーネント

### バックエンド
- **FastAPI** - Python Webフレームワーク
- **SQLAlchemy** - ORM
- **SQLite** - データベース
- **Pydantic** - データバリデーション

---

## 🚀 セットアップと起動方法

### 前提条件

以下がインストールされていること：
- **Node.js** (v18以上)
- **Python** (v3.9以上)
- **npm** または **yarn**

### 1. リポジトリのクローン

```bash
cd /path/to/Uriv-app
```

### 2. バックエンドのセットアップ

```bash
# backendディレクトリに移動
cd backend

# Python仮想環境を作成
python3 -m venv venv

# 仮想環境を有効化
source venv/bin/activate

# 依存パッケージをインストール
pip install -r requirements.txt
```

### 3. フロントエンドのセットアップ

```bash
# プロジェクトルートに戻る
cd ..

# 依存パッケージをインストール
npm install
```

### 4. アプリケーションの起動

#### ターミナル1: バックエンドを起動

```bash
cd backend
source venv/bin/activate
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

起動メッセージ：
```
INFO:     Uvicorn running on http://0.0.0.0:8000
データベーステーブルが正常に作成されました
デモユーザーを作成しました: demo@hokudai.ac.jp (匿名ユーザー #XXXX)
```

#### ターミナル2: フロントエンドを起動

```bash
npm run dev
```

起動メッセージ：
```
▲ Next.js 15.2.4
- Local:        http://localhost:3000
- Network:      http://192.168.3.65:3000
✓ Ready in 3.5s
```

### 5. ブラウザでアクセス

**フロントエンド**: http://localhost:3000

自動的にデモユーザーでログインされます！

---

## 📱 使い方

### 掲示板

1. **ホームページ**から掲示板を選択
2. **投稿フォーム**に内容を入力して「投稿する」
3. 投稿が一覧に表示されます

#### コメント機能
- 投稿の **💬 マーク**をクリック
- 返信フォームが展開されます
- コメントを入力して「返信する」

#### いいね機能
- 投稿の **❤️ マーク**をクリック
- いいねした投稿は赤いハートで表示

### マーケット

1. **マーケット**タブをクリック
2. **「出品する」**ボタンで商品を登録
3. フィルターで商品を絞り込み
4. 商品をクリックして詳細を表示

---

## 🎭 匿名システム

### 固定匿名名
- ユーザーごとに自動生成される匿名ID（例：`匿名ユーザー #A1B2`）
- 全ての投稿で同じ匿名名を使用
- 同じユーザーの投稿だと識別できる
- メールアドレスや本名は表示されない

### デモユーザー
- 起動時に自動作成：`demo@hokudai.ac.jp`
- 北海道大学として登録
- 自動的に匿名名が割り当てられる

---

## 📊 APIエンドポイント

### バックエンドAPI
- **URL**: http://localhost:8000
- **ドキュメント**: http://localhost:8000/docs

### 主要なエンドポイント

#### 掲示板
- `GET /board/posts/{board_id}` - 投稿一覧取得
- `POST /board/posts` - 新規投稿作成
- `POST /board/posts/{post_id}/like` - いいね切り替え
- `GET /board/posts/{post_id}/replies` - 返信一覧取得
- `POST /board/posts/{post_id}/replies` - 返信作成

#### マーケット
- `GET /market/items` - 商品一覧取得
- `POST /market/items` - 商品出品
- `GET /market/items/{item_id}` - 商品詳細取得
- `POST /market/items/{item_id}/like` - いいね切り替え

---

## 💾 データベース管理

### データベースの場所
```
backend/uriv.db
```

### データベースのリセット

データを全て削除してやり直したい場合：

```bash
# バックエンドを停止 (Ctrl+C)

# データベースファイルを削除
cd backend
rm uriv.db

# バックエンドを再起動
source venv/bin/activate
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

新しいデータベースが自動的に作成されます。

### データベースの中身を確認

```bash
cd backend
sqlite3 uriv.db

# テーブル一覧を表示
.tables

# 投稿を確認
SELECT * FROM board_posts;

# ユーザーを確認
SELECT id, email, anonymous_name, university FROM users;

# 終了
.exit
```

---

## 🔧 トラブルシューティング

### ポートが使用中の場合

```bash
# ポート8000を停止
lsof -ti:8000 | xargs kill -9

# ポート3000を停止
lsof -ti:3000 | xargs kill -9
```

### "Failed to fetch" エラー

**原因**: バックエンドが起動していない、またはデータベースのスキーマが古い

**解決方法**:
1. バックエンドが起動しているか確認
2. データベースを削除して再作成（上記参照）

### モジュールが見つからないエラー

**フロントエンド**:
```bash
rm -rf node_modules
npm install
```

**バックエンド**:
```bash
cd backend
source venv/bin/activate
pip install -r requirements.txt
```

### データベースエラー "no such column"

データベースのスキーマが古い可能性があります：

```bash
cd backend
rm uriv.db
# バックエンドを再起動
```

---

## 📁 プロジェクト構造

```
Uriv-app/
├── app/                      # Next.jsページ
│   ├── page.tsx             # トップページ（自動ログイン）
│   ├── home/                # ホームページ
│   ├── board/[id]/          # 掲示板ページ
│   ├── market/              # マーケットページ
│   └── globals.css          # グローバルスタイル
├── components/              # Reactコンポーネント
│   ├── post-form.tsx        # 投稿フォーム
│   ├── post-list.tsx        # 投稿一覧（コメント機能付き）
│   ├── market-board.tsx     # マーケット画面
│   └── ui/                  # UIコンポーネント
├── backend/                 # FastAPIバックエンド
│   ├── main.py             # メインアプリケーション
│   ├── models.py           # データベースモデル
│   ├── schemas.py          # Pydanticスキーマ
│   ├── board_routes.py     # 掲示板API
│   ├── market_routes.py    # マーケットAPI
│   ├── database.py         # データベース設定
│   ├── requirements.txt    # Python依存パッケージ
│   ├── uriv.db            # SQLiteデータベース
│   └── venv/              # Python仮想環境
├── lib/                    # ユーティリティ
│   ├── market-api.ts      # マーケットAPIクライアント
│   └── dm-api.ts          # DMAPIクライアント
├── package.json           # Node.js依存パッケージ
├── tailwind.config.ts     # Tailwind CSS設定
└── README.md             # このファイル
```

---

## 🎯 実装済み機能

### ✅ 掲示板機能
- [x] 投稿作成・表示
- [x] コメント（返信）機能
- [x] いいね機能
- [x] 投稿時刻表示（○分前）
- [x] 固定匿名名での投稿
- [x] リアルタイム更新

### ✅ マーケット機能
- [x] 商品出品
- [x] 商品一覧・詳細表示
- [x] 検索・フィルタリング
- [x] いいね機能
- [x] 閲覧数カウント
- [x] 商品編集・削除

### ✅ ユーザー機能
- [x] 自動ログイン（デモモード）
- [x] 固定匿名名の自動生成
- [x] 大学情報の管理

---

## 🔐 認証について

現在、開発を簡単にするために**認証機能をバイパス**しています。

- トップページにアクセスすると自動的にログイン
- `demo@hokudai.ac.jp`として認証される
- 認証機能の実装コードは残っているので、必要に応じて有効化可能

---

## 📝 開発メモ

### 環境
- **開発環境**: SQLite（ファイルベース）
- **本番環境**: PostgreSQL推奨

### データベースマイグレーション
現在は起動時に自動でテーブルを作成します。
本番環境ではAlembicを使用したマイグレーションを推奨。

### CORS設定
開発環境では全てのオリジンを許可しています。
本番環境では適切に制限してください。

---

## 🚧 今後の拡張予定

- [ ] 大学メール認証の有効化
- [ ] プロフィール編集機能
- [ ] 通知機能
- [ ] 画像アップロード
- [ ] DM機能の完成
- [ ] 掲示板の種類追加
- [ ] 管理者機能
- [ ] レポート機能

---

## 📄 ライセンス

MIT License

---

## 💡 Tips

### 複数ユーザーでテストしたい場合

ブラウザの開発者ツール（F12）で以下を実行：

```javascript
// 別のユーザーに切り替え
localStorage.setItem('user_email', 'test2@u-tokyo.ac.jp')
location.reload()
```

### ログの確認

**バックエンドログ**: ターミナル1に表示されます
- API呼び出し
- データベースクエリ
- エラーメッセージ

**フロントエンドログ**: ブラウザの開発者ツール（F12）→ Console

---

## 🤝 サポート

問題が発生した場合：
1. バックエンドとフロントエンドが両方起動しているか確認
2. データベースを削除して再起動
3. `node_modules`と`.next`を削除して再インストール

---

**開発を楽しんでください！** 🎉
