# 🚀 URIV クイックスタートガイド

## 最速で起動する方法

### ステップ1: バックエンド起動（ターミナル1）

```bash
cd /Users/komatsuzakiharutoshi/Desktop/100Pro_0916/Uriv-app/backend
source venv/bin/activate
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

✅ 起動完了のサイン：
```
INFO:     Uvicorn running on http://0.0.0.0:8000
データベーステーブルが正常に作成されました
デモユーザーを作成しました: demo@hokudai.ac.jp (匿名ユーザー #XXXX)
```

### ステップ2: フロントエンド起動（ターミナル2）

```bash
cd /Users/komatsuzakiharutoshi/Desktop/100Pro_0916/Uriv-app
npm run dev
```

✅ 起動完了のサイン：
```
▲ Next.js 15.2.4
- Local:        http://localhost:3000
✓ Ready in 3.5s
```

### ステップ3: ブラウザでアクセス

**URL**: http://localhost:3000

自動的にログインされてホームページが表示されます！

---

## 📍 アクセス先まとめ

| サービス | URL | 説明 |
|---------|-----|------|
| フロントエンド | http://localhost:3000 | メインアプリ |
| バックエンドAPI | http://localhost:8000 | REST API |
| APIドキュメント | http://localhost:8000/docs | Swagger UI |

---

## 🎯 できること

### 1. 掲示板で投稿
- ホーム → 掲示板を選択
- 投稿フォームに入力
- 「投稿する」をクリック

### 2. コメントを書く
- 投稿の💬マークをクリック
- コメント欄が表示される
- コメントを入力して「返信する」

### 3. いいねする
- ❤️マークをクリック
- もう一度クリックで取り消し

### 4. マーケットで出品
- マーケットタブ → 「出品する」
- 商品情報を入力
- 「出品する」をクリック

---

## ⚠️ トラブルシューティング

### エラー: "Failed to fetch"

**原因**: バックエンドが起動していない

**解決方法**: ターミナル1でバックエンドを起動

---

### エラー: "Port 8000 is already in use"

**解決方法**:
```bash
lsof -ti:8000 | xargs kill -9
```

---

### エラー: "Port 3000 is already in use"

**解決方法**:
```bash
lsof -ti:3000 | xargs kill -9
```
または、自動的にポート3001で起動されます。

---

### データベースエラー

**解決方法**: データベースを削除して再作成
```bash
cd backend
rm uriv.db
# バックエンドを再起動
```

---

## 🔄 再起動が必要な場合

### バックエンドの再起動
```bash
# ターミナル1で Ctrl+C で停止
# 再度起動
cd backend
source venv/bin/activate
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### フロントエンドの再起動
```bash
# ターミナル2で Ctrl+C で停止
# 再度起動
npm run dev
```

---

## 💾 データのバックアップ

投稿データをバックアップしたい場合：

```bash
# データベースをコピー
cp backend/uriv.db backend/uriv.db.backup

# リストア
cp backend/uriv.db.backup backend/uriv.db
```

---

## 👥 複数ユーザーでテストする方法

### 方法1: 別のブラウザを使う
- Chrome、Safari、Firefoxなど別のブラウザで開く
- 各ブラウザで異なるユーザーになる

### 方法2: シークレットモード
- 通常モードとシークレットモードで別ユーザー

### 方法3: 開発者ツールで切り替え
1. F12で開発者ツールを開く
2. Consoleタブで実行：
```javascript
localStorage.setItem('user_email', 'user2@keio.ac.jp')
location.reload()
```

---

## 📈 現在の実装状況

### ✅ 完成している機能
- 掲示板の投稿・閲覧
- コメント機能
- いいね機能
- マーケット出品・閲覧
- 固定匿名名システム
- リアルタイム更新

### 🚧 一部実装の機能
- DM（Direct Message）- 基本実装あり
- プロフィール設定 - UI準備済み

### ⏳ 未実装の機能
- メール認証（コードはあるが無効化中）
- 画像アップロード
- 通知機能

---

**これで今すぐ使えます！** 🎊


