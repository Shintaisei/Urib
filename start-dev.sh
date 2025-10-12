#!/bin/bash

echo "🚀 URIV 開発環境起動スクリプト"
echo "================================"

# バックエンドを起動（バックグラウンド）
echo "📦 バックエンドを起動中..."
cd backend
source venv/bin/activate
uvicorn main:app --reload --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!
cd ..

# 少し待機
sleep 3

# フロントエンドを起動
echo "🎨 フロントエンドを起動中..."
echo ""
echo "✅ アクセス先:"
echo "   フロントエンド: http://localhost:3000"
echo "   バックエンドAPI: http://localhost:8000"
echo "   APIドキュメント: http://localhost:8000/docs"
echo ""
echo "⚠️  終了するには Ctrl+C を押してください"
echo ""

npm run dev

# フロントエンドが終了したらバックエンドも停止
kill $BACKEND_PID

