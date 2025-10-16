import os
import csv
import datetime
from sqlalchemy import MetaData, select

# 既存のSQLAlchemyエンジンを利用
from database import engine


def export_all_tables(output_root: str | None = None) -> str:
    """
    全テーブルをCSVに書き出し、エクスポート先ディレクトリのパスを返す。
    output_root を省略した場合は backend/data_exports/<timestamp>/ に出力。
    """
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    base_dir = output_root or os.path.join(os.path.dirname(__file__), "data_exports", timestamp)
    os.makedirs(base_dir, exist_ok=True)

    metadata = MetaData()
    metadata.reflect(bind=engine)

    with engine.connect() as conn:
        for table in metadata.sorted_tables:
            out_csv = os.path.join(base_dir, f"{table.name}.csv")
            result = conn.execute(select(table))
            columns = result.keys()

            with open(out_csv, "w", newline="", encoding="utf-8") as f:
                writer = csv.writer(f)
                writer.writerow(columns)
                for row in result:
                    writer.writerow([row[col] for col in columns])

    return base_dir


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Export all DB tables to CSV files")
    parser.add_argument("--out", dest="output_root", default=None, help="Output root directory (optional)")
    args = parser.parse_args()

    out_dir = export_all_tables(args.output_root)
    print(f"✅ Export completed: {out_dir}")


