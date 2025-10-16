import os
import csv
import datetime
from typing import Optional
from sqlalchemy import MetaData, select

# 既存のSQLAlchemyエンジンを利用
from database import engine as default_engine
from sqlalchemy import create_engine


def export_all_tables(output_root: Optional[str] = None, db_url: Optional[str] = None) -> str:
    """
    全テーブルをCSVに書き出し、エクスポート先ディレクトリのパスを返す。
    output_root を省略した場合は backend/data_exports/<timestamp>/ に出力。
    """
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    base_dir = output_root or os.path.join(os.path.dirname(__file__), "data_exports", timestamp)
    os.makedirs(base_dir, exist_ok=True)

    # 接続エンジンの決定（引数のdb_url優先）
    if db_url:
        connect_args = {}
        if db_url.startswith("postgresql") and "sslmode" not in db_url:
            # Supabase向け: sslmode=require を付与
            if "?" in db_url:
                db_url = db_url + "&sslmode=require"
            else:
                db_url = db_url + "?sslmode=require"
        eng = create_engine(db_url, connect_args=connect_args)
    else:
        eng = default_engine

    metadata = MetaData()
    metadata.reflect(bind=eng)

    with eng.connect() as conn:
        for table in metadata.sorted_tables:
            out_csv = os.path.join(base_dir, f"{table.name}.csv")

            # カラム名を固定（純粋なカラム名で出力）
            column_objs = [col for col in table.columns]
            column_names = [col.name for col in column_objs]

            # ラベルを付けて列名=カラム名に固定
            labeled_columns = [col.label(col.name) for col in column_objs]
            query = select(*labeled_columns)
            result = conn.execute(query).mappings()

            with open(out_csv, "w", newline="", encoding="utf-8") as f:
                writer = csv.writer(f)
                writer.writerow(column_names)
                for row in result:
                    writer.writerow([row.get(col) for col in column_names])

    return base_dir


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Export all DB tables to CSV files")
    parser.add_argument("--out", dest="output_root", default=None, help="Output root directory (optional)")
    parser.add_argument("--db", dest="db_url", default=None, help="Database URL (optional, overrides default)")
    args = parser.parse_args()

    out_dir = export_all_tables(args.output_root, db_url=args.db_url)
    print(f"✅ Export completed: {out_dir}")


