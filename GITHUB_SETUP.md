# 🚀 GitHub リポジトリ作成＆デプロイ完全ガイド

## 📋 前提条件

- [x] GitHubアカウントを持っている
- [x] ローカルでアプリが動作している

---

## Part 1: GitHubリポジトリ作成

### Step 1: GitHubでリポジトリを作成

1. **https://github.com にアクセス**してログイン

2. **右上の「+」マーク → 「New repository」**

3. **リポジトリ設定**
   ```
   Repository name: uriv-app
   
   Description: 大学生限定の匿名コミュニティアプリ
   
   ◯ Private （推奨：非公開）
   
   ⚠️ 以下は全てチェックしない：
   □ Add a README file
   □ Add .gitignore
   □ Choose a license
   ```

4. **「Create repository」をクリック**

5. **リポジトリのURLをコピー**
   ```
   例: https://github.com/YOUR_USERNAME/uriv-app.git
   ```

---

### Step 2: ローカルのコードをGitHubにプッシュ

#### 2-1. .gitignoreファイルを確認

```bash
cd /Users/komatsuzakiharutoshi/Desktop/100Pro_0916/Uriv-app

# .gitignoreが正しいか確認
cat .gitignore
```

#### 2-2. Gitリポジトリを初期化（まだの場合）

```bash
# 現在の状態を確認
git status

# もし「not a git repository」と出たら
git init
```

#### 2-3. 全ファイルをステージング

```bash
# ファイルを追加
git add .

# 状態を確認
git status
```

#### 2-4. コミット

```bash
git commit -m "Initial commit: Uriv app with board and market features"
```

#### 2-5. ブランチ名を変更（必要な場合）

```bash
# 現在のブランチ名を確認
git branch

# もし master なら main に変更
git branch -M main
```

#### 2-6. リモートリポジトリを追加

```bash
# YOUR_USERNAMEを自分のGitHubユーザー名に変更
git remote add origin https://github.com/YOUR_USERNAME/uriv-app.git

# 確認
git remote -v
```

#### 2-7. プッシュ

```bash
git push -u origin main
```

**ユーザー名とパスワードを聞かれたら**:
- Username: GitHubのユーザー名
- Password: Personal Access Token（次のセクションで作成）

---

### Step 3: Personal Access Token（PAT）の作成

**パスワードの代わりにトークンが必要です**

#### 3-1. GitHubでトークンを作成

```
1. GitHub → 右上のプロフィールアイコン
2. Settings
3. 左メニューの一番下「Developer settings」
4. 「Personal access tokens」 → 「Tokens (classic)」
5. 「Generate new token」 → 「Generate new token (classic)」
```

#### 3-2. トークンの設定

```
Note: uriv-app-deploy

Expiration: 90 days（または1年）

Select scopes:
☑ repo （これだけでOK）

「Generate token」をクリック
```

#### 3-3. トークンをコピー

```
ghp_xxxxxxxxxxxxxxxxxxxx

⚠️ 画面を閉じると二度と見られない！
→ メモ帳に保存しておく
```

#### 3-4. プッシュ時にトークンを使用

```bash
git push -u origin main

Username: YOUR_GITHUB_USERNAME
Password: ghp_xxxxxxxxxxxxxxxxxxxx （トークンを貼り付け）
```

---

## Part 2: Vercel デプロイ（フロントエンド）

### Step 1: Vercelアカウント作成

1. **https://vercel.com にアクセス**

2. **「Start Deploying」または「Sign Up」**

3. **「Continue with GitHub」を選択**
   - GitHubアカウントで認証
   - Vercelがリポジトリにアクセスする権限を付与

---

### Step 2: プロジェクトをインポート

1. **Vercel Dashboard → 「Add New...」 → 「Project」**

2. **「Import Git Repository」**
   - リポジトリ一覧から「uriv-app」を選択
   - 「Import」をクリック

3. **プロジェクト設定**
   ```
   Project Name: uriv-app （自動入力される）
   
   Framework Preset: Next.js （自動検出される）
   
   Root Directory: ./  （そのまま）
   
   Build and Output Settings:
   - Build Command: npm run build （自動）
   - Output Directory: .next （自動）
   - Install Command: npm install （自動）
   ```

4. **環境変数を設定**
   ```
   「Environment Variables」を展開
   
   Name: NEXT_PUBLIC_API_URL
   Value: https://uriv-backend.onrender.com （後で設定）
   
   ※今は空欄でもOK、後で追加可能
   ```

5. **「Deploy」ボタンをクリック**
   - ビルド開始（3〜5分）
   - 完了すると URL が発行される

6. **デプロイ完了！**
   ```
   https://uriv-app-xxxx.vercel.app
   
   このURLでアクセス可能！
   ```

---

## Part 3: Supabase セットアップ（データベース）

### Step 1: Supabaseアカウント作成

1. **https://supabase.com にアクセス**

2. **「Start your project」**

3. **「Continue with GitHub」**
   - GitHubアカウントで認証

---

### Step 2: プロジェクト作成

1. **「New Project」をクリック**

2. **Organization選択**
   - 自分のアカウントを選択

3. **プロジェクト設定**
   ```
   Name: uriv-production
   
   Database Password: 強力なパスワードを設定
   （例: UrivApp2025!Secure）
   ⚠️ このパスワードは後で使うのでメモ！
   
   Region: Northeast Asia (Tokyo)
   
   Pricing Plan: Free （無料）
   ```

4. **「Create new project」をクリック**
   - プロジェクト作成開始（1〜2分）

---

### Step 3: 接続情報を取得

1. **プロジェクトが作成されたら**
   - 左メニュー「Project Settings」
   - 「Database」をクリック

2. **「Connection string」セクションで**
   - 「URI」を選択
   - 接続文字列をコピー
   ```
   postgresql://postgres.xxx:[PASSWORD]@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres
   ```

3. **`[PASSWORD]`の部分を実際のパスワードに置き換え**
   ```
   例:
   postgresql://postgres.xxx:UrivApp2025!Secure@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres
   ```

---

## Part 4: Render デプロイ（バックエンド）

### Step 1: Renderアカウント作成

1. **https://render.com にアクセス**

2. **「Get Started」**

3. **「Continue with GitHub」**
   - GitHubアカウントで認証
   - リポジトリへのアクセスを許可

---

### Step 2: Web Serviceを作成

1. **Render Dashboard → 「New +」 → 「Web Service」**

2. **リポジトリを接続**
   - 「uriv-app」を選択
   - 「Connect」をクリック

3. **サービス設定**
   ```
   Name: uriv-backend
   
   Region: Oregon (US West) または Singapore
   
   Branch: main
   
   Root Directory: backend
   
   Runtime: Python 3
   
   Build Command:
   pip install -r requirements.txt
   
   Start Command:
   uvicorn main:app --host 0.0.0.0 --port $PORT
   
   Instance Type: Free
   ```

4. **環境変数を設定**
   ```
   「Environment Variables」セクションで「Add Environment Variable」
   
   Key: DATABASE_URL
   Value: postgresql://postgres.xxx:PASSWORD@...（Supabaseの接続URL）
   
   Key: ENV
   Value: production
   
   Key: ALLOWED_ORIGINS
   Value: https://uriv-app-xxxx.vercel.app （VercelのURL）
   ```

5. **「Create Web Service」をクリック**
   - ビルド開始（5〜10分）
   - 完了すると URL が発行される
   ```
   https://uriv-backend.onrender.com
   ```

---

### Step 3: VercelにバックエンドURLを設定

1. **Vercel Dashboard → uriv-app プロジェクト**

2. **「Settings」 → 「Environment Variables」**

3. **環境変数を追加**
   ```
   Name: NEXT_PUBLIC_API_URL
   Value: https://uriv-backend.onrender.com
   ```

4. **「Save」をクリック**

5. **再デプロイ**
   ```
   「Deployments」タブ
   → 最新のデプロイの右側の「...」
   → 「Redeploy」
   → 「Redeploy」を確認
   ```

---

## Part 5: 動作確認

### Step 1: バックエンドの確認

```
https://uriv-backend.onrender.com/docs にアクセス

→ Swagger UIが表示されればOK！
```

### Step 2: フロントエンドの確認

```
https://uriv-app-xxxx.vercel.app にアクセス

→ ログイン画面が表示されればOK！
```

### Step 3: 動作テスト

1. **ユーザー登録**
   - メールアドレス入力
   - プロフィール設定
   - 登録完了

2. **投稿作成**
   - 掲示板で投稿
   - 表示されることを確認

3. **別ブラウザで別ユーザー登録**
   - お互いの投稿が見えることを確認

---

## 🔧 トラブルシューティング

### エラー: "Application failed to respond"（Render）

**原因**: ポート番号の設定ミス

**解決**:
```bash
# Start Commandを確認
uvicorn main:app --host 0.0.0.0 --port $PORT

# $PORTは必須！（Renderが自動で設定）
```

---

### エラー: "Failed to fetch"（フロントエンド）

**原因**: バックエンドURLが間違っている

**解決**:
```
1. Vercelの環境変数を確認
   NEXT_PUBLIC_API_URL = https://uriv-backend.onrender.com
   
2. 末尾にスラッシュ（/）がないことを確認
```

---

### エラー: CORS エラー

**原因**: バックエンドのCORS設定

**解決**:
```python
# backend/main.py を確認
allow_origins=[
    "https://your-vercel-url.vercel.app",  # VercelのURL
    "http://localhost:3000",
]
```

---

### エラー: Database connection failed

**原因**: DATABASE_URLが間違っている

**解決**:
```
1. Renderの環境変数を確認
2. Supabaseの接続URLをコピペし直す
3. パスワード部分が正しいか確認
```

---

## 📝 .gitignoreの確認

プッシュ前に確認：

```bash
cd /Users/komatsuzakiharutoshi/Desktop/100Pro_0916/Uriv-app

# .gitignoreがあるか確認
cat .gitignore
```

**必須の除外項目**:
```
# Python
venv/
__pycache__/
*.pyc
*.db

# Node.js
node_modules/
.next/
.env
.env.local

# その他
.DS_Store
*.log
```

---

## 🎯 初回プッシュのコマンド（完全版）

```bash
# Uriv-appディレクトリに移動
cd /Users/komatsuzakiharutoshi/Desktop/100Pro_0916/Uriv-app

# Gitリポジトリ初期化（まだの場合）
git init

# 全ファイルを追加
git add .

# 状態を確認（何が追加されるか見る）
git status

# コミット
git commit -m "Initial commit: Uriv app - 大学生限定匿名コミュニティ"

# ブランチ名を確認・変更
git branch -M main

# リモートリポジトリを追加（YOUR_USERNAMEを変更）
git remote add origin https://github.com/YOUR_USERNAME/uriv-app.git

# プッシュ
git push -u origin main
```

**ユーザー名とトークンを入力**:
```
Username: YOUR_GITHUB_USERNAME
Password: ghp_xxxxxxxxxxxx （Personal Access Token）
```

---

## 🔑 Personal Access Token（PAT）の作成

### 詳細手順

1. **GitHub → 右上のプロフィールアイコン**

2. **Settings**

3. **左メニュー一番下の「Developer settings」**

4. **「Personal access tokens」 → 「Tokens (classic)」**

5. **「Generate new token」 → 「Generate new token (classic)」**

6. **トークン設定**
   ```
   Note: uriv-app-deployment
   
   Expiration: 90 days （または No expiration）
   
   Select scopes:
   ☑ repo （これだけチェック）
     ☑ repo:status
     ☑ repo_deployment
     ☑ public_repo
     ☑ repo:invite
     ☑ security_events
   ```

7. **「Generate token」をクリック**

8. **トークンをコピー**
   ```
   ghp_xxxxxxxxxxxxxxxxxxxx
   
   ⚠️ この画面を閉じると二度と見られない！
   → メモ帳に保存
   ```

---

## 🔄 2回目以降のプッシュ（日常的な作業）

```bash
# コードを修正したら

# 1. 変更を確認
git status

# 2. 変更をステージング
git add .

# 3. コミット
git commit -m "投稿機能を改善"

# 4. プッシュ
git push

# → Vercel/Renderが自動的にデプロイ！
```

**超簡単！**

---

## 📱 URLの確認方法

### Vercel（フロントエンド）

```
Vercel Dashboard
  ↓
プロジェクト「uriv-app」をクリック
  ↓
上部に表示されるURL
例: https://uriv-app-abc123.vercel.app
```

### Render（バックエンド）

```
Render Dashboard
  ↓
サービス「uriv-backend」をクリック
  ↓
上部に表示されるURL
例: https://uriv-backend.onrender.com
```

---

## 🎨 カスタムドメイン（オプション）

### 独自ドメインを使いたい場合

#### Step 1: ドメイン購入
```
お名前.com / Cloudflare
例: uriv.jp → 年間¥1,000程度
```

#### Step 2: Vercelに設定
```
Vercel Dashboard
  ↓
Settings → Domains
  ↓
「Add」をクリック
  ↓
uriv.jp を入力
  ↓
DNS設定の指示が表示される
  ↓
お名前.comで設定
  ↓
完了！ https://uriv.jp でアクセス可能
```

---

## 📊 デプロイ後の確認チェックリスト

### フロントエンド（Vercel）
- [ ] URLにアクセスできる
- [ ] ログイン画面が表示される
- [ ] CSSが適用されている
- [ ] 画像が表示される

### バックエンド（Render）
- [ ] /docs にアクセスできる
- [ ] API仕様が表示される
- [ ] データベースに接続できている

### データベース（Supabase）
- [ ] Dashboardでテーブルが見える
- [ ] データが保存される
- [ ] クエリが実行できる

### 統合テスト
- [ ] ユーザー登録ができる
- [ ] 投稿ができる
- [ ] コメントができる
- [ ] いいねができる
- [ ] 別ブラウザで別ユーザーとして使える

---

## 🔄 修正の流れ（実例）

### 例：「投稿ボタンの色を変えたい」

```bash
# 1. ローカルで修正
vim components/post-form.tsx
# 色を変更

# 2. ローカルで確認
# localhost:3000 で確認

# 3. GitHubにプッシュ
git add components/post-form.tsx
git commit -m "投稿ボタンの色を青に変更"
git push

# 4. 自動デプロイ（待つだけ）
# Vercel: 3分後に本番反映
# → https://uriv-app.vercel.app で確認

# 完了！
```

---

## 🎯 次のアクション

1. **GitHubでリポジトリ作成**（3分）
2. **Personal Access Token作成**（3分）
3. **ローカルからプッシュ**（5分）
4. **Vercelでデプロイ**（10分）
5. **Supabaseでデータベース作成**（5分）
6. **Renderでバックエンドデプロイ**（10分）

**合計: 約40分で本番環境完成！**

---

## 💡 困ったら

### GitHubプッシュでエラー
```bash
# リモートを削除して再設定
git remote remove origin
git remote add origin https://github.com/YOUR_USERNAME/uriv-app.git
git push -u origin main
```

### Personal Access Tokenを忘れた
```
新しいトークンを作成すればOK
（古いトークンは無効になるが問題なし）
```

---

**準備できたら、実際にやってみましょうか？**

わからないことがあれば、各ステップで質問してください！

