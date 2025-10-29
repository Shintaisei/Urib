#!/usr/bin/env python3
"""
データベース整合性チェックスクリプト
ユーザーごとのデータ取得と関連性を検証します
"""

import os
import sys
from sqlalchemy import create_engine, text, func
from sqlalchemy.orm import sessionmaker
from datetime import datetime, timezone, timedelta

# 環境変数からデータベースURLを取得
DATABASE_URL = os.getenv('DATABASE_URL', 'sqlite:///uriv.db')

def check_database_integrity():
    """データベース整合性をチェック"""
    engine = create_engine(DATABASE_URL)
    Session = sessionmaker(bind=engine)
    
    try:
        with Session() as session:
            print("🔍 データベース整合性チェック開始...")
            
            # 1. ユーザーテーブルの基本情報
            print("\n📊 ユーザー情報:")
            user_count = session.execute(text("SELECT COUNT(*) FROM users")).scalar()
            print(f"  総ユーザー数: {user_count}")
            
            # ユーザーごとの詳細情報
            users = session.execute(text("""
                SELECT id, email, university, year, department, anonymous_name, is_verified, created_at
                FROM users 
                ORDER BY created_at DESC 
                LIMIT 5
            """)).fetchall()
            
            for user in users:
                print(f"  ID: {user[0]}, Email: {user[1]}, 大学: {user[2]}, 学年: {user[3]}, 学部: {user[4]}, 匿名名: {user[5]}, 認証: {user[6]}")
            
            # 2. CourseSummaryの整合性チェック
            print("\n📚 授業まとめ情報:")
            course_count = session.execute(text("SELECT COUNT(*) FROM course_summaries")).scalar()
            print(f"  総授業まとめ数: {course_count}")
            
            # ユーザーごとの授業まとめ数
            course_by_user = session.execute(text("""
                SELECT u.anonymous_name, COUNT(cs.id) as summary_count
                FROM users u
                LEFT JOIN course_summaries cs ON u.id = cs.author_id
                GROUP BY u.id, u.anonymous_name
                ORDER BY summary_count DESC
                LIMIT 10
            """)).fetchall()
            
            print("  ユーザーごとの授業まとめ数:")
            for user in course_by_user:
                print(f"    {user[0]}: {user[1]}件")
            
            # 3. CircleSummaryの整合性チェック
            print("\n🎯 サークルまとめ情報:")
            circle_count = session.execute(text("SELECT COUNT(*) FROM circle_summaries")).scalar()
            print(f"  総サークルまとめ数: {circle_count}")
            
            # ユーザーごとのサークルまとめ数
            circle_by_user = session.execute(text("""
                SELECT u.anonymous_name, COUNT(cs.id) as summary_count
                FROM users u
                LEFT JOIN circle_summaries cs ON u.id = cs.author_id
                GROUP BY u.id, u.anonymous_name
                ORDER BY summary_count DESC
                LIMIT 10
            """)).fetchall()
            
            print("  ユーザーごとのサークルまとめ数:")
            for user in circle_by_user:
                print(f"    {user[0]}: {user[1]}件")
            
            # 4. 外部キー整合性チェック
            print("\n🔗 外部キー整合性チェック:")
            
            # CourseSummaryの孤立レコードチェック
            orphaned_courses = session.execute(text("""
                SELECT cs.id, cs.author_id, cs.author_name
                FROM course_summaries cs
                LEFT JOIN users u ON cs.author_id = u.id
                WHERE u.id IS NULL
            """)).fetchall()
            
            if orphaned_courses:
                print(f"  ❌ 孤立した授業まとめ: {len(orphaned_courses)}件")
                for course in orphaned_courses:
                    print(f"    ID: {course[0]}, Author ID: {course[1]}, Author Name: {course[2]}")
            else:
                print("  ✅ 授業まとめの外部キー整合性: OK")
            
            # CircleSummaryの孤立レコードチェック
            orphaned_circles = session.execute(text("""
                SELECT cs.id, cs.author_id, cs.author_name
                FROM circle_summaries cs
                LEFT JOIN users u ON cs.author_id = u.id
                WHERE u.id IS NULL
            """)).fetchall()
            
            if orphaned_circles:
                print(f"  ❌ 孤立したサークルまとめ: {len(orphaned_circles)}件")
                for circle in orphaned_circles:
                    print(f"    ID: {circle[0]}, Author ID: {circle[1]}, Author Name: {circle[2]}")
            else:
                print("  ✅ サークルまとめの外部キー整合性: OK")
            
            # 5. コメントの整合性チェック
            print("\n💬 コメント整合性チェック:")
            
            # CourseSummaryCommentの整合性
            course_comment_count = session.execute(text("SELECT COUNT(*) FROM course_summary_comments")).scalar()
            orphaned_course_comments = session.execute(text("""
                SELECT csc.id, csc.summary_id, csc.author_id
                FROM course_summary_comments csc
                LEFT JOIN course_summaries cs ON csc.summary_id = cs.id
                WHERE cs.id IS NULL
            """)).fetchall()
            
            print(f"  授業まとめコメント数: {course_comment_count}")
            if orphaned_course_comments:
                print(f"  ❌ 孤立した授業まとめコメント: {len(orphaned_course_comments)}件")
            else:
                print("  ✅ 授業まとめコメントの整合性: OK")
            
            # CircleSummaryCommentの整合性
            circle_comment_count = session.execute(text("SELECT COUNT(*) FROM circle_summary_comments")).scalar()
            orphaned_circle_comments = session.execute(text("""
                SELECT csc.id, csc.summary_id, csc.author_id
                FROM circle_summary_comments csc
                LEFT JOIN circle_summaries cs ON csc.summary_id = cs.id
                WHERE cs.id IS NULL
            """)).fetchall()
            
            print(f"  サークルまとめコメント数: {circle_comment_count}")
            if orphaned_circle_comments:
                print(f"  ❌ 孤立したサークルまとめコメント: {len(orphaned_circle_comments)}件")
            else:
                print("  ✅ サークルまとめコメントの整合性: OK")
            
            # 6. いいね機能の整合性チェック
            print("\n❤️ いいね機能整合性チェック:")
            
            # CourseSummaryLikeの整合性
            try:
                course_like_count = session.execute(text("SELECT COUNT(*) FROM course_summary_likes")).scalar()
                orphaned_course_likes = session.execute(text("""
                    SELECT csl.id, csl.summary_id, csl.user_id
                    FROM course_summary_likes csl
                    LEFT JOIN course_summaries cs ON csl.summary_id = cs.id
                    WHERE cs.id IS NULL
                """)).fetchall()
                
                print(f"  授業まとめいいね数: {course_like_count}")
                if orphaned_course_likes:
                    print(f"  ❌ 孤立した授業まとめいいね: {len(orphaned_course_likes)}件")
                else:
                    print("  ✅ 授業まとめいいねの整合性: OK")
            except Exception as e:
                print(f"  ⚠️ 授業まとめいいねテーブルが存在しません: {e}")
            
            # 7. インデックス確認
            print("\n📈 インデックス確認:")
            indexes = session.execute(text("""
                SELECT name, tbl_name, sql
                FROM sqlite_master 
                WHERE type = 'index' 
                AND tbl_name IN ('users', 'course_summaries', 'circle_summaries', 'course_summary_comments', 'circle_summary_comments', 'course_summary_likes')
                ORDER BY tbl_name, name
            """)).fetchall()
            
            for index in indexes:
                print(f"  {index[1]}.{index[0]}")
            
            print("\n✅ データベース整合性チェック完了")
            
    except Exception as e:
        print(f"❌ データベース整合性チェックエラー: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    check_database_integrity()
