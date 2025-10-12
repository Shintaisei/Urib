# 🚀 URIV デプロイガイド

## 🎯 目標

**予算: ¥0/月** で本番環境を構築

---

## 🏗️ アーキテクチャ

```
ユーザー
  ↓
Vercel (フロントエンド)
  ↓
Render (バックエンドAPI)
  ↓
Supabase (PostgreSQL)
```

---

## 📋 必要なアカウント

1. **Vercel** - https://vercel.com
   - GitHubアカウントでサインアップ
   - 無料枠: 十分

2. **Render** - https://render.com
   - GitHubアカウントでサインアップ
   - 無料枠: 750時間/月

3. **Supabase** - https://supabase.com
   - GitHubアカウントでサインアップ
   - 無料枠: 500MB

4. **GitHub** - コード管理
   - リポジトリ作成が必要

---

## 🔧 デプロイ手順

### Step 1: GitHubリポジトリ作成

```bash
cd /Users/komatsuzakiharutoshi/Desktop/100Pro_0916/Uriv-app

# Gitリポジトリ初期化（まだの場合）
git init
git add .
git commit -m "Initial commit"

# GitHubでリポジトリ作成後
git remote add origin https://github.com/YOUR_USERNAME/uriv-app.git
git branch -M main
git push -u origin main
```

---

### Step 2: Supabase（データベース）

#### 2-1. プロジェクト作成
1. https://supabase.com にアクセス
2. "New Project" をクリック
3. プロジェクト名: `uriv-production`
4. データベースパスワードを設定
5. リージョン: `Northeast Asia (Tokyo)` を選択
6. "Create Project" をクリック

#### 2-2. 接続情報を取得
1. Settings → Database
2. "Connection string" をコピー
   ```
   postgresql://postgres:[PASSWORD]@db.xxx.supabase.co:5432/postgres
   ```

#### 2-3. テーブル作成
**オプション1: SQL Editor で実行**
```sql
-- SQL Editorで以下を実行
-- users, board_posts, board_replies などのCREATE TABLE文
-- （DATABASE_DESIGN.mdを参照）
```

**オプション2: バックエンドの自動作成を利用**
- 環境変数を設定してバックエンドを起動
- 自動的にテーブルが作成される

---

### Step 3: Render（バックエンド）

#### 3-1. 新しいWeb Serviceを作成
1. https://dashboard.render.com にアクセス
2. "New +" → "Web Service"
3. GitHubリポジトリを接続
4. 設定:
   ```
   Name: uriv-backend
   Root Directory: backend
   Environment: Python 3
   Build Command: pip install -r requirements.txt
   Start Command: uvicorn main:app --host 0.0.0.0 --port $PORT
   ```

#### 3-2. 環境変数を設定
```
DATABASE_URL = postgresql://postgres:[PASSWORD]@db.xxx.supabase.co:5432/postgres
ENV = production
```

#### 3-3. デプロイ
- "Create Web Service" をクリック
- 自動的にデプロイ開始
- 完了後、URLが発行される: `https://uriv-backend.onrender.com`

---

### Step 4: Vercel（フロントエンド）

#### 4-1. プロジェクトをインポート
1. https://vercel.com にアクセス
2. "Add New..." → "Project"
3. GitHubリポジトリをインポート
4. 設定:
   ```
   Framework Preset: Next.js
   Root Directory: ./
   Build Command: npm run build
   Output Directory: .next
   ```

#### 4-2. 環境変数を設定
```
NEXT_PUBLIC_API_URL = https://uriv-backend.onrender.com
```

#### 4-3. デプロイ
- "Deploy" をクリック
- 完了後、URLが発行される: `https://uriv-app.vercel.app`

---

## ✅ デプロイ完了チェックリスト

- [ ] バックエンドが起動している
  - `https://your-backend.onrender.com/docs` にアクセス
- [ ] フロントエンドが表示される
  - `https://your-app.vercel.app` にアクセス
- [ ] データベース接続OK
  - Supabase Dashboard でテーブル確認
- [ ] 投稿が作成できる
- [ ] コメントが投稿できる
- [ ] いいねが動作する

---

## 🔧 トラブルシューティング

### Backend: "Application startup failed"

**原因**: データベース接続エラー

**解決**:
1. Renderの環境変数を確認
2. `DATABASE_URL` が正しいか確認
3. Supabaseのデータベースが起動しているか確認

### Frontend: "Failed to fetch"

**原因**: バックエンドURLが間違っている

**解決**:
1. Vercelの環境変数を確認
2. `NEXT_PUBLIC_API_URL` が正しいか確認
3. バックエンドが起動しているか確認

### CORS エラー

**解決**: backend/main.py の CORS設定を確認
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://your-app.vercel.app",  # 本番URL追加
        "http://localhost:3000",
    ],
    ...
)
```

---

## 🎯 無料枠の制限

### Render（バックエンド）
- **制限**: 15分間アクセスがないとスリープ
- **影響**: 初回アクセスが遅い（ウォームアップに10〜30秒）
- **対策**: 
  - 定期的にpingする（cron job）
  - 有料プラン: $7/月

### Supabase（データベース）
- **制限**: 500MB、2GB転送/月
- **影響**: 10,000ユーザーまで余裕
- **対策**: 
  - 画像は別サービス（Cloudinary等）
  - 有料プラン: $25/月

### Vercel（フロントエンド）
- **制限**: 100GB帯域幅/月
- **影響**: 十分な容量
- **対策**: ほぼ不要

---

## 📱 カスタムドメイン設定（オプション）

### ドメイン購入
1. お名前.com / Cloudflare でドメイン購入
   - 例: `uriv.jp` → 年間¥1,000〜

### Vercelに設定
1. Vercel Dashboard → Settings → Domains
2. "Add Domain" をクリック
3. DNS設定を更新
4. SSL自動設定

**結果**: `https://uriv.jp` でアクセス可能！

---

## 🔐 セキュリティチェックリスト

### デプロイ前
- [ ] CORS設定を本番URLに限定
- [ ] 環境変数を使用（ハードコード禁止）
- [ ] SQLインジェクション対策（実装済み）
- [ ] XSS対策（実装済み）

### デプロイ後
- [ ] HTTPSが有効
- [ ] 不要なエンドポイントを削除
- [ ] レート制限の設定（将来）
- [ ] ログ監視の設定

---

## 📊 モニタリング設定

### Render（バックエンド）
- ダッシュボードでログ確認
- メトリクス（CPU、メモリ）監視

### Vercel（フロントエンド）
- Analytics で訪問者数確認
- エラー発生を監視

### Supabase（データベース）
- Database → Statistics でクエリ確認
- ストレージ使用量を監視

---

## 🚀 デプロイ後の運用

### 日次
- [ ] エラーログ確認
- [ ] ユーザー登録数確認
- [ ] 投稿数確認

### 週次
- [ ] データベースバックアップ
- [ ] パフォーマンス確認
- [ ] ユーザーフィードバック確認

### 月次
- [ ] 利用統計分析
- [ ] コスト確認
- [ ] 機能改善計画

---

## 📈 スケーリング戦略

### 1,000ユーザーまで
- 無料枠で十分
- 特別な対応不要

### 1,000〜5,000ユーザー
- Render有料プランに移行
- データベース最適化
- CDN導入検討

### 5,000ユーザー以上
- 専用サーバー検討（AWS/GCP）
- Redis導入（キャッシング）
- マイクロサービス化検討

---

## 🎁 便利なツール

### 開発・デプロイ
- **GitHub Actions** - CI/CD自動化
- **Postman** - API テスト
- **DBeaver** - データベース管理

### モニタリング
- **Sentry** - エラー追跡（無料枠あり）
- **Google Analytics** - アクセス解析
- **Uptime Robot** - 死活監視（無料）

### パフォーマンス
- **Lighthouse** - パフォーマンス計測
- **GTmetrix** - 速度分析

---

## 💡 Tips

### Renderのスリープ対策
```bash
# 5分おきにpingして起動状態を維持
# GitHub Actionsで実行
curl https://uriv-backend.onrender.com/health
```

### 環境別の設定管理
```python
# backend/config.py
import os

ENV = os.getenv("ENV", "development")

if ENV == "production":
    DATABASE_URL = os.getenv("DATABASE_URL")
    DEBUG = False
else:
    DATABASE_URL = "sqlite:///./uriv.db"
    DEBUG = True
```

---

## 🎯 次のアクション

1. **今すぐ**: データベース設計の改善実装
2. **明日**: 簡易登録画面の実装
3. **今週末**: Vercel + Render + Supabase でデプロイ
4. **来週**: 友達10人に使ってもらう

---

**このガイドに従えば、1週間以内に本番公開できます！** 🎉

