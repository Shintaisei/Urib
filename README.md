# URIV - University Community App

大学コミュニティ向けのマーケットプレイスアプリケーション

## 概要

URIVは大学の学生向けに設計されたコミュニティプラットフォームです。学生同士で商品の売買、無料提供、求購を行うことができます。

## 機能

- 📧 大学メールアドレスでの認証
- 🛒 商品の出品・購入・無料提供
- 🔍 商品検索・フィルタリング
- 💬 ダイレクトメッセージ
- 🏫 大学別コミュニティ

## 技術スタック

- **Frontend**: Next.js 15, React 18, TypeScript, Tailwind CSS
- **Backend**: FastAPI, Python 3.11, SQLAlchemy
- **Database**: PostgreSQL
- **Container**: Docker, Docker Compose

## Docker での起動

### 前提条件

- Docker Desktop がインストールされていること
- ポート 3000, 8000, 5432 が使用可能であること

### 起動方法

#### Windows の場合
```bash
start-docker.bat
```

#### Linux/macOS の場合
```bash
./start-docker.sh
```

#### 手動で起動する場合
```bash
docker-compose up --build
```

### アクセス

起動後、以下のURLでアクセスできます：

- **フロントエンド**: http://localhost:3000
- **バックエンド API**: http://localhost:8000
- **API ドキュメント**: http://localhost:8000/docs

## 開発環境での起動

### フロントエンド
```bash
npm install
npm run dev
```

### バックエンド
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

## 環境変数

以下の環境変数を設定できます（オプション）：

```bash
# メール送信設定
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# データベース設定（Docker使用時は自動設定）
DATABASE_URL=postgresql://uriv_user:uriv_password@db:5432/uriv_db

# 環境設定
ENV=development
```

## プロジェクト構造

```
Uriv-app/
├── app/                 # Next.js フロントエンド
├── backend/            # FastAPI バックエンド
├── components/         # React コンポーネント
├── lib/               # ユーティリティ関数
├── public/            # 静的ファイル
├── Dockerfile.frontend # フロントエンド用 Dockerfile
├── Dockerfile.backend  # バックエンド用 Dockerfile
└── docker-compose.yml  # Docker Compose 設定
```

## ライセンス

MIT License
