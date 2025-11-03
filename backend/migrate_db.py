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
    """新しいフィールドを追加（各DDLを個別トランザクションで実行し、失敗しても他に影響させない）"""
    engine = create_engine(DATABASE_URL)

    def exec_tx(conn, sql: str, ok_msg: str, warn_match: tuple[str, ...] = ("already exists", "duplicate column name")):
        try:
            with conn.begin():
                conn.execute(text(sql))
            print(ok_msg)
            return True
        except SQLAlchemyError as e:
            msg = str(e)
            if any(w in msg for w in warn_match):
                print(f"⚠️ {ok_msg.replace('✅ ', '')}（既に存在）")
                return False
            print(f"❌ 実行エラー: {e}")
            return False

    def column_exists(conn, table: str, column: str) -> bool:
        res = conn.execute(text(
            """
            SELECT 1 FROM information_schema.columns
            WHERE table_name=:t AND column_name=:c
            """
        ), {"t": table, "c": column}).fetchone()
        return res is not None

    try:
        with engine.connect() as conn:
            print("CourseSummaryテーブルに新しいフィールドを追加中...")

            # grade_level
            if not column_exists(conn, 'course_summaries', 'grade_level'):
                exec_tx(conn, "ALTER TABLE course_summaries ADD COLUMN grade_level VARCHAR(20)", "✅ grade_levelフィールドを追加しました")
            else:
                print("⚠️ grade_levelフィールドは既に存在します")

            # grade_score
            if not column_exists(conn, 'course_summaries', 'grade_score'):
                exec_tx(conn, "ALTER TABLE course_summaries ADD COLUMN grade_score VARCHAR(20)", "✅ grade_scoreフィールドを追加しました")
            else:
                print("⚠️ grade_scoreフィールドは既に存在します")

            # difficulty_level
            if not column_exists(conn, 'course_summaries', 'difficulty_level'):
                exec_tx(conn, "ALTER TABLE course_summaries ADD COLUMN difficulty_level VARCHAR(20)", "✅ difficulty_levelフィールドを追加しました")
            else:
                print("⚠️ difficulty_levelフィールドは既に存在します")

            # indexes (IF NOT EXISTSは冪等)
            exec_tx(conn, "CREATE INDEX IF NOT EXISTS idx_course_summaries_grade_level ON course_summaries(grade_level)", "✅ grade_levelインデックスを追加しました", warn_match=("already exists",))
            exec_tx(conn, "CREATE INDEX IF NOT EXISTS idx_course_summaries_grade_score ON course_summaries(grade_score)", "✅ grade_scoreインデックスを追加しました", warn_match=("already exists",))
            exec_tx(conn, "CREATE INDEX IF NOT EXISTS idx_course_summaries_difficulty_level ON course_summaries(difficulty_level)", "✅ difficulty_levelインデックスを追加しました", warn_match=("already exists",))

            # likes table
            created = exec_tx(conn, (
                """
                CREATE TABLE IF NOT EXISTS course_summary_likes (
                    id SERIAL PRIMARY KEY,
                    summary_id INTEGER NOT NULL,
                    user_id INTEGER NOT NULL,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    UNIQUE(summary_id, user_id)
                )
                """
            ), "✅ CourseSummaryLikeテーブルを作成（または既存）")
            if not created:
                # 最低限、存在チェック
                try:
                    with conn.begin():
                        conn.execute(text("SELECT 1 FROM course_summary_likes LIMIT 1"))
                    print("✅ CourseSummaryLikeテーブルが存在します")
                except SQLAlchemyError as e:
                    print(f"❌ CourseSummaryLikeテーブル確認エラー: {e}")

            print("✅ マイグレーション完了")

    except Exception as e:
        print(f"❌ データベース接続エラー: {e}")
        sys.exit(1)

if __name__ == "__main__":
    print("データベースマイグレーション開始...")
    add_new_fields()
    print("マイグレーション終了")
