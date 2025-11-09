#!/usr/bin/env bash
set -euo pipefail

# このスクリプトは analytics-dashboard をローカルで起動します
# 1) venv 作成 2) 依存導入 3) Streamlit 起動

cd "$(dirname "$0")"

if [ ! -d ".venv" ]; then
  python3 -m venv .venv
fi

source .venv/bin/activate
python -m pip install --upgrade pip
pip install -r requirements.txt

exec streamlit run app.py


