#!/usr/bin/env bash
# -----------------------------------------------
# URIV Analytics Dashboard Starter (macOS/Linux)
# -----------------------------------------------
# 1) Python を検出（python3 → python の順）
# 2) 仮想環境 .venv を自動作成
# 3) 依存インストール
# 4) Streamlit を起動
# 失敗時にはわかりやすいメッセージを表示します

set -euo pipefail
cd "$(dirname "$0")"

echo "== URIV Analytics Dashboard =="
echo "作業ディレクトリ: $(pwd)"

# 1) Python 検出
PY_BIN=""
if command -v python3 >/dev/null 2>&1; then
  PY_BIN="python3"
elif command -v python >/dev/null 2>&1; then
  PY_BIN="python"
else
  echo "エラー: Python が見つかりません。"
  echo "macOS の場合: まず Homebrew を入れて 'brew install python' を実行してください。"
  echo "その後、再度 'bash start_dashboard.sh' を実行してください。"
  exit 1
fi
echo "使用する Python: $($PY_BIN --version 2>/dev/null || echo unknown)"

# 2) 仮想環境作成・有効化
if [ ! -d ".venv" ]; then
  echo "仮想環境(.venv)を作成します..."
  $PY_BIN -m venv .venv || {
    echo "エラー: 仮想環境の作成に失敗しました。"; exit 1;
  }
fi

if [ ! -f ".venv/bin/activate" ]; then
  echo "エラー: .venv/bin/activate が見つかりません。仮想環境が壊れている可能性があります。"
  echo "一度 .venv ディレクトリを削除して、再実行してください。"
  exit 1
fi

echo "仮想環境を有効化します..."
source .venv/bin/activate

# 3) 依存導入
echo "pip / 依存関係をインストールします..."
$PY_BIN -m pip install --upgrade pip >/dev/null
pip install -r requirements.txt

# 3.5) DB 接続URLの用意（analytics-dashboard/.env または backend/.env）
if [ -z "${SUPABASE_DB_URL:-}" ]; then
  # analytics-dashboard/.env を優先的に読み込み
  if [ -f ".env" ]; then
    set -a; source ./.env; set +a
  fi
fi
if [ -z "${SUPABASE_DB_URL:-}" ] && [ -f "../backend/.env" ]; then
  # backend/.env から拾う（シェルで読みやすい形の行だけ対応）
  SUPABASE_DB_URL="$(grep -E '^SUPABASE_DB_URL=' ../backend/.env | sed -E 's/^SUPABASE_DB_URL=//; s/^[\"\\'\\']?//; s/[\"\\'\\']?$//')"
  export SUPABASE_DB_URL
fi
if [ -z "${SUPABASE_DB_URL:-}" ]; then
  echo
  echo "Supabase の接続URL(SUPABASE_DB_URL)が未設定です。"
  echo "例: postgresql://postgres.vyjpywfnjuhxcsbmxshs:Shintaisei0515%23@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres"
  read -r -p "SUPABASE_DB_URL を貼り付けてEnter: " INPUT_URL || true
  if [ -n "$INPUT_URL" ]; then
    echo "SUPABASE_DB_URL=\"$INPUT_URL\"" > .env
    set -a; source ./.env; set +a
  else
    echo "警告: DB URL が未設定のため、ローカルDBに接続され、データが空になる可能性があります。"
  fi
fi

# 4) Streamlit 起動
echo "Streamlit を起動します。ブラウザが自動で開かない場合は http://localhost:8501 を開いてください。"
exec streamlit run app.py


