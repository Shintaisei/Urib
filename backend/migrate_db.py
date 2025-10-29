#!/usr/bin/env python3
"""
データベースマイグレーションスクリプト
新しいフィールドを追加します
"""

import os
import sys
from sqlalchemy import create_engine, text
from sqlalchemy.exc import SQLAlchemyError

# 環境変数からデータベースURLを取得
DATABASE_URL = os.getenv('DATABASE_URL', 'sqlite:///uriv.db')

def add_new_fields():
    """新しいフィールドを追加"""
    engine = create_engine(DATABASE_URL)
    
    try:
        with engine.connect() as conn:
            # トランザクション開始
            trans = conn.begin()
            
            try:
                # CourseSummaryテーブルに新しいフィールドを追加
                print("CourseSummaryテーブルに新しいフィールドを追加中...")
                
                # grade_levelフィールドを追加
                try:
                    conn.execute(text("ALTER TABLE course_summaries ADD COLUMN grade_level VARCHAR(20)"))
                    print("✅ grade_levelフィールドを追加しました")
                except SQLAlchemyError as e:
                    if "already exists" in str(e) or "duplicate column name" in str(e):
                        print("⚠️ grade_levelフィールドは既に存在します")
                    else:
                        print(f"❌ grade_levelフィールド追加エラー: {e}")
                
                # grade_scoreフィールドを追加
                try:
                    conn.execute(text("ALTER TABLE course_summaries ADD COLUMN grade_score VARCHAR(20)"))
                    print("✅ grade_scoreフィールドを追加しました")
                except SQLAlchemyError as e:
                    if "already exists" in str(e) or "duplicate column name" in str(e):
                        print("⚠️ grade_scoreフィールドは既に存在します")
                    else:
                        print(f"❌ grade_scoreフィールド追加エラー: {e}")
                
                # difficulty_levelフィールドを追加
                try:
                    conn.execute(text("ALTER TABLE course_summaries ADD COLUMN difficulty_level VARCHAR(20)"))
                    print("✅ difficulty_levelフィールドを追加しました")
                except SQLAlchemyError as e:
                    if "already exists" in str(e) or "duplicate column name" in str(e):
                        print("⚠️ difficulty_levelフィールドは既に存在します")
                    else:
                        print(f"❌ difficulty_levelフィールド追加エラー: {e}")
                
                # インデックスを追加
                try:
                    conn.execute(text("CREATE INDEX IF NOT EXISTS idx_course_summaries_grade_level ON course_summaries(grade_level)"))
                    print("✅ grade_levelインデックスを追加しました")
                except SQLAlchemyError as e:
                    print(f"⚠️ grade_levelインデックス追加エラー: {e}")
                
                try:
                    conn.execute(text("CREATE INDEX IF NOT EXISTS idx_course_summaries_grade_score ON course_summaries(grade_score)"))
                    print("✅ grade_scoreインデックスを追加しました")
                except SQLAlchemyError as e:
                    print(f"⚠️ grade_scoreインデックス追加エラー: {e}")
                
                try:
                    conn.execute(text("CREATE INDEX IF NOT EXISTS idx_course_summaries_difficulty_level ON course_summaries(difficulty_level)"))
                    print("✅ difficulty_levelインデックスを追加しました")
                except SQLAlchemyError as e:
                    print(f"⚠️ difficulty_levelインデックス追加エラー: {e}")
                
                # CourseSummaryLikeテーブルが存在するか確認
                try:
                    conn.execute(text("SELECT 1 FROM course_summary_likes LIMIT 1"))
                    print("✅ CourseSummaryLikeテーブルが存在します")
                except SQLAlchemyError:
                    print("⚠️ CourseSummaryLikeテーブルが存在しません。作成中...")
                    conn.execute(text("""
                        CREATE TABLE course_summary_likes (
                            id SERIAL PRIMARY KEY,
                            summary_id INTEGER NOT NULL,
                            user_id INTEGER NOT NULL,
                            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                            UNIQUE(summary_id, user_id)
                        )
                    """))
                    print("✅ CourseSummaryLikeテーブルを作成しました")
                
                # トランザクションコミット
                trans.commit()
                print("✅ マイグレーション完了")
                
            except Exception as e:
                trans.rollback()
                print(f"❌ マイグレーションエラー: {e}")
                raise
                
    except Exception as e:
        print(f"❌ データベース接続エラー: {e}")
        sys.exit(1)

if __name__ == "__main__":
    print("データベースマイグレーション開始...")
    add_new_fields()
    print("マイグレーション終了")
