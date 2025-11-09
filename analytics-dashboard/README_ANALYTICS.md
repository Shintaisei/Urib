# データ分析ダッシュボード（ローカル専用）

このフォルダは、運用中アプリとは独立して「最新データの取得 → 集計 → 可視化（ダッシュボード）」をローカルで実行するための専用ツール群です。既存のプロジェクトREADMEとは混ざりません。

## 機能
- Supabase（本番DB）から最新スナップショットを取得（CSV）
- 既存の集計スクリプト（backend/aggregate_exports.py）を用いて集計CSVを生成
- Streamlit で可視化（ユーザー行動、継続ログイン、掲示板・市場・授業/サークルレビュー等）

## セットアップ

1) 依存のインストール（仮想環境推奨）
```bash
cd Uriv-app/analytics-dashboard
python3 -m venv .venv
source .venv/bin/activate  # Windows: .venv\\Scripts\\activate
python -m pip install --upgrade pip
pip install -r requirements.txt
```

2) DB 接続設定
- 既存の `backend/.env` に `SUPABASE_DB_URL` を設定済みなら、そのまま利用されます。
- 別URLを使いたい場合は、実行時に環境変数で上書き可能です（例: `SUPABASE_DB_URL=... streamlit run app.py`）。

## 使い方

### A. ダッシュボードを起動（中から「最新取得」ボタンで実行）
```bash
cd Uriv-app/analytics-dashboard
source .venv/bin/activate
streamlit run app.py
```
- 画面左上の「最新データを取得して集計」ボタンを押すと、`analytics-dashboard/data_exports/latest` にCSV出力、`aggregated/` に集計結果が生成されます。

または起動用スクリプト（初回セットアップ込み）:
```bash
cd Uriv-app/analytics-dashboard
bash start_dashboard.sh
```
- 初回は自動で `.venv` を作成して依存を導入します
- Pythonが見つからない場合は表示される案内に従ってインストールしてください（macOSなら`brew install python` など）
 - DB接続URL（SUPABASE_DB_URL）は以下の優先順で参照します
   1. 実行時の環境変数 `SUPABASE_DB_URL`
   2. `analytics-dashboard/.env`（未設定なら対話で作成します）
   3. `backend/.env`
 - 対話入力をスキップしたい場合は、事前に `analytics-dashboard/.env` を作成してください
   ```bash
   echo 'SUPABASE_DB_URL="postgresql://...:...@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres"' > Uriv-app/analytics-dashboard/.env
   ```

### B. コマンドラインで取得・集計だけ行う
```bash
cd Uriv-app/analytics-dashboard
source .venv/bin/activate
python fetch_and_aggregate.py  # data_exports/latest に生成
```

## 出力場所
- 取得CSV: `analytics-dashboard/data_exports/latest/*.csv`
- 集計CSV: `analytics-dashboard/data_exports/latest/aggregated/*.csv`
  - `users_full_summary.csv`（メール軸で行動統合）
  - `pageviews_by_user.csv`（活性度・連続日数）
  - `boards_summary.csv`, `users_summary.csv`, `users_features.csv`, `user_board_engagement.csv`
  - `market_summary.csv`（市場系）

## トラブルシュート
- Streamlit 起動してもボタンで失敗する場合:
  - `backend/.env` の `SUPABASE_DB_URL` が正しいか確認してください
  - ネットワーク/SSLで弾かれる場合はリトライしてください
- macOS の Gatekeeper/権限で問題があれば、ターミナルをフルディスクアクセスに追加すると解決することがあります

## 注意
- このフォルダはローカル分析専用です。本番アプリの起動・デプロイには影響しません。


