# 埋め込み版ダッシュボードの使い方

このフォルダは、埋め込みのDB接続URLを使って「最新データの取得 → 集計 → 可視化」をローカルで一発起動できる専用ツールです。GitHub等にアップしないローカル運用を前提としています。

## 1. 起動（埋め込みスクリプトを使うだけ）

### macOS の場合
1) ターミナルを開く  
2) フォルダへ移動  
```bash
cd Uriv-app/analytics-dashboard
```
3) 実行  
```bash
bash start_dashboard.local.sh
```
→ 自動で Python 仮想環境を作成し、依存を入れて、ブラウザでダッシュボードが開きます（http://localhost:8501）。

### Windows（PowerShell）の場合
1) PowerShell を開く  
2) フォルダへ移動  
```powershell
cd Uriv-app/analytics-dashboard
```
3) 初回のみ、実行ポリシーを許可（管理者不要）  
```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```
4) 実行（テンプレート版をコピーして使う場合は `.example` → 実体ファイルにリネーム）  
```powershell
# テンプレートから実体を作る例:
Copy-Item .\start_dashboard.local.ps1.example .\start_dashboard.local.ps1
# start_dashboard.local.ps1 を開いて SUPABASE_DB_URL を自分のURLに変更
.\start_dashboard.local.ps1
```
→ 仮想環境の作成・依存導入後、ブラウザでダッシュボードが開きます。

※ うまくいかないとき  
- 「Python が見つからない」→ macOS は `brew install python`、Windows は https://www.python.org/downloads/ からインストールして PowerShell/ターミナルを開き直してください。  
- セキュリティでブロックされた場合は、上記の実行ポリシー設定を一度だけ実行してください。  

## 2. ダッシュボードの機能と使い方（ざっくり）

- 画面左上の「最新データを取得して集計」ボタン  
  - Supabase から最新CSVを取得 → `analytics-dashboard/data_exports/latest/` に保存  
  - 集計CSVは `analytics-dashboard/data_exports/latest/aggregated/` に生成

- タブの意味（よく使う順）
  - Overview: 主要KPIの一枚絵  
  - Users: ユーザー別の行動サマリ（投稿・返信・市場・授業/サークルなど）  
  - Boards / Market: 掲示板・マーケットの詳細（Top/分布/トレンド）  
  - Engagement: PageViews から継続ログインやユーザー×時間のヒートマップ  
  - Sessions: セッション（来訪の塊）を自動推定して滞在時間・PV/セッションなどを可視化  
  - Diagnostics: データ健全性（必須列・欠損率・重複・相互整合）をチェック  
  - AI: 集計テーブル（コンパクト）を元にマルチエージェントが分析し、統合レポートを生成  
    - デフォルトでは「生データ」は渡しません（必要ならサンプルON）

### 出力フォルダ
- 取得CSV: `analytics-dashboard/data_exports/latest/*.csv`  
- 集計CSV: `analytics-dashboard/data_exports/latest/aggregated/*.csv`

### 参考（中級者向けの起動）
通常のセットアップで起動したい場合は、下記でも起動できます（埋め込み版を使わない場合）。  
```bash
cd Uriv-app/analytics-dashboard
python3 -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
streamlit run app.py
```

## 注意
- `start_dashboard.local.sh` / `start_dashboard.local.ps1` はローカル秘密スクリプトです。第三者に共有しないでください。  
- GitHubには `.example` のみを配置し、実体ファイル（URLを埋めたもの）は `.gitignore` 済みです。  
- このフォルダはローカル分析専用で、本番アプリの挙動には影響しません。 