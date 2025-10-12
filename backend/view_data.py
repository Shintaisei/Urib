#!/usr/bin/env python3
"""
データベースの内容を表示するスクリプト
使い方: python view_data.py [テーブル名]

例:
  python view_data.py users        # ユーザー一覧
  python view_data.py posts        # 投稿一覧
  python view_data.py replies      # コメント一覧
  python view_data.py stats        # 統計情報
"""

import sys
import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from tabulate import tabulate
from datetime import datetime

# 環境変数からDATABASE_URLを取得（本番環境）
DATABASE_URL = os.getenv("DATABASE_URL")

# 環境変数がない場合はローカルのSQLiteを使用
if not DATABASE_URL:
    DATABASE_URL = "sqlite:///./uriv.db"
    print(f"📍 ローカルデータベース（SQLite）を使用: {DATABASE_URL}\n")
else:
    print(f"📍 本番データベース（PostgreSQL）を使用\n")

# データベース接続
if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
else:
    engine = create_engine(DATABASE_URL)

Session = sessionmaker(bind=engine)
db = Session()

def show_users():
    """ユーザー一覧を表示"""
    print("👥 ユーザー一覧\n")
    result = db.execute(text("""
        SELECT id, email, anonymous_name, university, year, department, 
               DATE(created_at) as joined
        FROM users 
        ORDER BY created_at DESC 
        LIMIT 20
    """))
    
    rows = result.fetchall()
    if rows:
        headers = ["ID", "メール", "ニックネーム", "大学", "学年", "学部", "登録日"]
        print(tabulate(rows, headers=headers, tablefmt="grid"))
        print(f"\n📊 合計: {len(rows)}人")
    else:
        print("データがありません")

def show_posts():
    """投稿一覧を表示"""
    print("📝 投稿一覧（最新20件）\n")
    result = db.execute(text("""
        SELECT id, board_id, 
               SUBSTR(content, 1, 30) as content_preview, 
               author_name, like_count, reply_count,
               DATE(created_at) as posted
        FROM board_posts 
        ORDER BY created_at DESC 
        LIMIT 20
    """))
    
    rows = result.fetchall()
    if rows:
        headers = ["ID", "掲示板", "内容（抜粋）", "投稿者", "❤️", "💬", "投稿日"]
        print(tabulate(rows, headers=headers, tablefmt="grid"))
        print(f"\n📊 合計: {len(rows)}件")
    else:
        print("データがありません")

def show_replies():
    """コメント一覧を表示"""
    print("💬 コメント一覧（最新20件）\n")
    result = db.execute(text("""
        SELECT r.id, r.post_id, 
               SUBSTR(r.content, 1, 30) as content_preview,
               r.author_name, r.like_count,
               DATE(r.created_at) as posted
        FROM board_replies r
        ORDER BY r.created_at DESC 
        LIMIT 20
    """))
    
    rows = result.fetchall()
    if rows:
        headers = ["ID", "投稿ID", "内容（抜粋）", "投稿者", "❤️", "投稿日"]
        print(tabulate(rows, headers=headers, tablefmt="grid"))
        print(f"\n📊 合計: {len(rows)}件")
    else:
        print("データがありません")

def show_stats():
    """統計情報を表示"""
    print("📊 データベース統計\n")
    
    # ユーザー数
    user_count = db.execute(text("SELECT COUNT(*) FROM users")).scalar()
    
    # 投稿数
    post_count = db.execute(text("SELECT COUNT(*) FROM board_posts")).scalar()
    
    # コメント数
    reply_count = db.execute(text("SELECT COUNT(*) FROM board_replies")).scalar()
    
    # いいね数（投稿）
    post_likes = db.execute(text("SELECT COUNT(*) FROM board_post_likes")).scalar()
    
    # いいね数（コメント）
    reply_likes = db.execute(text("SELECT COUNT(*) FROM board_reply_likes")).scalar()
    
    # 大学別ユーザー数
    print("📈 全体統計:")
    stats = [
        ["総ユーザー数", f"{user_count}人"],
        ["総投稿数", f"{post_count}件"],
        ["総コメント数", f"{reply_count}件"],
        ["投稿へのいいね", f"{post_likes}件"],
        ["コメントへのいいね", f"{reply_likes}件"],
    ]
    print(tabulate(stats, tablefmt="simple"))
    
    print("\n\n🏫 大学別ユーザー数:")
    result = db.execute(text("""
        SELECT university, COUNT(*) as count
        FROM users
        WHERE university IS NOT NULL
        GROUP BY university
        ORDER BY count DESC
        LIMIT 10
    """))
    rows = result.fetchall()
    if rows:
        print(tabulate(rows, headers=["大学", "ユーザー数"], tablefmt="grid"))
    
    print("\n\n📚 学部別ユーザー数:")
    result = db.execute(text("""
        SELECT department, COUNT(*) as count
        FROM users
        WHERE department IS NOT NULL
        GROUP BY department
        ORDER BY count DESC
        LIMIT 10
    """))
    rows = result.fetchall()
    if rows:
        print(tabulate(rows, headers=["学部", "ユーザー数"], tablefmt="grid"))
    
    print("\n\n🔥 掲示板別投稿数:")
    board_names = {
        "1": "全体掲示板",
        "2": "授業・履修",
        "3": "サークル・部活",
        "4": "バイト・就活",
        "5": "雑談・交流",
        "6": "恋愛・相談"
    }
    result = db.execute(text("""
        SELECT board_id, COUNT(*) as posts,
               SUM(like_count) as total_likes,
               SUM(reply_count) as total_replies
        FROM board_posts
        GROUP BY board_id
        ORDER BY posts DESC
    """))
    rows = result.fetchall()
    if rows:
        formatted_rows = [
            [board_names.get(row[0], row[0]), row[1], row[2] or 0, row[3] or 0]
            for row in rows
        ]
        print(tabulate(formatted_rows, headers=["掲示板", "投稿数", "いいね", "コメント"], tablefmt="grid"))

def show_search(keyword):
    """キーワードで検索"""
    print(f"🔍 '{keyword}' の検索結果\n")
    
    result = db.execute(text("""
        SELECT id, board_id, 
               SUBSTR(content, 1, 50) as content_preview,
               author_name, like_count, reply_count
        FROM board_posts 
        WHERE content LIKE :keyword
        ORDER BY created_at DESC 
        LIMIT 20
    """), {"keyword": f"%{keyword}%"})
    
    rows = result.fetchall()
    if rows:
        headers = ["ID", "掲示板", "内容（抜粋）", "投稿者", "❤️", "💬"]
        print(tabulate(rows, headers=headers, tablefmt="grid"))
        print(f"\n📊 {len(rows)}件の投稿が見つかりました")
    else:
        print("該当する投稿が見つかりませんでした")

def show_help():
    """ヘルプを表示"""
    print("""
📖 使い方:

  python view_data.py [コマンド]

📋 利用可能なコマンド:

  users      - ユーザー一覧を表示
  posts      - 投稿一覧を表示（最新20件）
  replies    - コメント一覧を表示（最新20件）
  stats      - 統計情報を表示
  search キーワード - キーワードで投稿を検索

💡 例:

  python view_data.py users
  python view_data.py posts
  python view_data.py stats
  python view_data.py search 試験
  python view_data.py search バイト

🔧 本番環境のデータを見る場合:

  export DATABASE_URL="postgresql://postgres.vyjpywfnjuhxcsbmxshs:Shintaisei0515%23@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres"
  python view_data.py users
""")

if __name__ == "__main__":
    try:
        if len(sys.argv) < 2:
            show_help()
        elif sys.argv[1] == "users":
            show_users()
        elif sys.argv[1] == "posts":
            show_posts()
        elif sys.argv[1] == "replies":
            show_replies()
        elif sys.argv[1] == "stats":
            show_stats()
        elif sys.argv[1] == "search":
            if len(sys.argv) < 3:
                print("❌ エラー: 検索キーワードを指定してください")
                print("例: python view_data.py search 試験")
            else:
                show_search(sys.argv[2])
        else:
            print(f"❌ エラー: 不明なコマンド '{sys.argv[1]}'")
            show_help()
    except Exception as e:
        print(f"❌ エラーが発生しました: {e}")
    finally:
        db.close()

