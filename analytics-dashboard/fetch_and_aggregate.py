import os
import sys
from pathlib import Path


def main() -> None:
    repo_root = Path(__file__).resolve().parents[1]  # Uriv-app/
    backend_dir = repo_root / "backend"
    out_dir = Path(__file__).resolve().parent / "data_exports" / "latest"
    out_dir.mkdir(parents=True, exist_ok=True)

    # backend のスクリプトを import できるようにパス追加
    sys.path.insert(0, str(backend_dir))

    # backend/export_csv.py を利用して最新スナップショットを取得
    from export_csv import export_all_tables  # type: ignore
    print(f"🔄 Exporting all tables to: {out_dir}")
    export_dir = export_all_tables(output_root=str(out_dir), db_url=os.getenv("SUPABASE_DB_URL"))

    # backend/aggregate_exports.py で集計
    from aggregate_exports import aggregate  # type: ignore
    print("📊 Aggregating exported CSVs...")
    agg_dir = aggregate(export_dir)

    print("✅ Done")
    print(f"Raw CSV:      {export_dir}")
    print(f"Aggregated:   {agg_dir}")


if __name__ == "__main__":
    main()

