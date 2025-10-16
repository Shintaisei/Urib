import os
import csv
import sys
from collections import defaultdict
from typing import Dict, List, Any, Optional


def read_csv_map(path: str) -> List[Dict[str, Any]]:
    # 大きなフィールドにも対応
    try:
        csv.field_size_limit(sys.maxsize)
    except Exception:
        pass
    if not os.path.exists(path):
        return []
    with open(path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        return [dict(row) for row in reader]


def write_csv(path: str, headers: List[str], rows: List[List[Any]]):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(headers)
        for r in rows:
            w.writerow(r)


def to_int(v: Any) -> Optional[int]:
    try:
        return int(v) if v not in (None, "", "None") else None
    except Exception:
        return None


def aggregate(export_dir: str, out_dir: Optional[str] = None) -> str:
    out_root = out_dir or os.path.join(export_dir, "aggregated")
    os.makedirs(out_root, exist_ok=True)

    # Load datasets if present
    users = read_csv_map(os.path.join(export_dir, "users.csv"))
    posts = read_csv_map(os.path.join(export_dir, "board_posts.csv"))
    replies = read_csv_map(os.path.join(export_dir, "board_replies.csv"))
    post_likes = read_csv_map(os.path.join(export_dir, "board_post_likes.csv"))
    reply_likes = read_csv_map(os.path.join(export_dir, "board_reply_likes.csv"))
    visits = read_csv_map(os.path.join(export_dir, "board_visits.csv"))

    market_items = read_csv_map(os.path.join(export_dir, "market_items.csv"))
    market_item_likes = read_csv_map(os.path.join(export_dir, "market_item_likes.csv"))

    # Indexes
    post_id_to_board: Dict[int, str] = {}
    post_id_to_author: Dict[int, Optional[int]] = {}
    for p in posts:
        pid = to_int(p.get("id"))
        if pid is None:
            continue
        post_id_to_board[pid] = p.get("board_id") or ""
        post_id_to_author[pid] = to_int(p.get("author_id"))

    reply_id_to_post: Dict[int, Optional[int]] = {}
    reply_id_to_author: Dict[int, Optional[int]] = {}
    for r in replies:
        rid = to_int(r.get("id"))
        if rid is None:
            continue
        reply_id_to_post[rid] = to_int(r.get("post_id"))
        reply_id_to_author[rid] = to_int(r.get("author_id"))

    # boards_summary
    board_post_count: Dict[str, int] = defaultdict(int)
    board_reply_count: Dict[str, int] = defaultdict(int)
    board_post_like_count: Dict[str, int] = defaultdict(int)
    board_reply_like_count: Dict[str, int] = defaultdict(int)
    board_unique_visitors: Dict[str, set] = defaultdict(set)
    board_unique_posters: Dict[str, set] = defaultdict(set)
    board_latest_post_time: Dict[str, str] = {}

    for p in posts:
        b = p.get("board_id") or ""
        board_post_count[b] += 1
        aid = to_int(p.get("author_id"))
        if aid is not None:
            board_unique_posters[b].add(aid)
        created = p.get("created_at") or ""
        if b not in board_latest_post_time or (created and created > board_latest_post_time[b]):
            board_latest_post_time[b] = created

    for r in replies:
        pid = to_int(r.get("post_id"))
        if pid is None:
            continue
        b = post_id_to_board.get(pid, "")
        board_reply_count[b] += 1

    for pl in post_likes:
        pid = to_int(pl.get("post_id"))
        if pid is None:
            continue
        b = post_id_to_board.get(pid, "")
        board_post_like_count[b] += 1

    for rl in reply_likes:
        rid = to_int(rl.get("reply_id"))
        if rid is None:
            continue
        pid = reply_id_to_post.get(rid)
        b = post_id_to_board.get(pid or -1, "")
        board_reply_like_count[b] += 1

    for v in visits:
        b = v.get("board_id") or ""
        uid = to_int(v.get("user_id"))
        if uid is not None:
            board_unique_visitors[b].add(uid)

    boards_rows: List[List[Any]] = []
    all_boards = set(board_post_count.keys()) | set(board_reply_count.keys()) | set(board_unique_visitors.keys())
    for b in sorted(all_boards, key=lambda x: (len(x), x)):
        boards_rows.append([
            b,
            board_post_count.get(b, 0),
            board_reply_count.get(b, 0),
            board_post_like_count.get(b, 0),
            board_reply_like_count.get(b, 0),
            len(board_unique_visitors.get(b, set())),
            len(board_unique_posters.get(b, set())),
            board_latest_post_time.get(b, ""),
        ])
    write_csv(
        os.path.join(out_root, "boards_summary.csv"),
        ["board_id", "post_count", "reply_count", "post_likes", "reply_likes", "unique_visitors", "unique_posters", "latest_post"],
        boards_rows,
    )

    # users_summary
    user_id_to_email: Dict[int, str] = {}
    for u in users:
        uid = to_int(u.get("id"))
        if uid is None:
            continue
        user_id_to_email[uid] = u.get("email") or ""

    posts_by_user: Dict[int, int] = defaultdict(int)
    for p in posts:
        aid = to_int(p.get("author_id"))
        if aid is not None:
            posts_by_user[aid] += 1

    replies_by_user: Dict[int, int] = defaultdict(int)
    for r in replies:
        aid = to_int(r.get("author_id"))
        if aid is not None:
            replies_by_user[aid] += 1

    likes_given_posts: Dict[int, int] = defaultdict(int)
    for pl in post_likes:
        uid = to_int(pl.get("user_id"))
        if uid is not None:
            likes_given_posts[uid] += 1

    likes_given_replies: Dict[int, int] = defaultdict(int)
    for rl in reply_likes:
        uid = to_int(rl.get("user_id"))
        if uid is not None:
            likes_given_replies[uid] += 1

    likes_received_posts: Dict[int, int] = defaultdict(int)
    for pl in post_likes:
        pid = to_int(pl.get("post_id"))
        author = post_id_to_author.get(pid or -1)
        if author is not None:
            likes_received_posts[author] += 1

    likes_received_replies: Dict[int, int] = defaultdict(int)
    for rl in reply_likes:
        rid = to_int(rl.get("reply_id"))
        author = reply_id_to_author.get(rid or -1)
        if author is not None:
            likes_received_replies[author] += 1

    user_ids = (
        set(user_id_to_email.keys())
        | set(posts_by_user.keys())
        | set(replies_by_user.keys())
        | set(likes_given_posts.keys())
        | set(likes_given_replies.keys())
        | set(likes_received_posts.keys())
        | set(likes_received_replies.keys())
    )
    users_rows: List[List[Any]] = []
    for uid in sorted(user_ids):
        users_rows.append([
            uid,
            user_id_to_email.get(uid, ""),
            posts_by_user.get(uid, 0),
            replies_by_user.get(uid, 0),
            likes_given_posts.get(uid, 0),
            likes_given_replies.get(uid, 0),
            likes_received_posts.get(uid, 0),
            likes_received_replies.get(uid, 0),
        ])
    write_csv(
        os.path.join(out_root, "users_summary.csv"),
        ["user_id", "email", "posts", "replies", "likes_given_posts", "likes_given_replies", "likes_received_posts", "likes_received_replies"],
        users_rows,
    )

    # market_summary (optional)
    if market_items:
        item_author: Dict[int, Optional[int]] = {}
        for it in market_items:
            iid = to_int(it.get("id"))
            if iid is None:
                continue
            item_author[iid] = to_int(it.get("author_id"))

        items_by_user: Dict[int, int] = defaultdict(int)
        for it in market_items:
            aid = to_int(it.get("author_id"))
            if aid is not None:
                items_by_user[aid] += 1

        market_likes_given: Dict[int, int] = defaultdict(int)
        for ml in market_item_likes:
            uid = to_int(ml.get("user_id"))
            if uid is not None:
                market_likes_given[uid] += 1

        market_likes_received: Dict[int, int] = defaultdict(int)
        for ml in market_item_likes:
            iid = to_int(ml.get("item_id"))
            aid = item_author.get(iid or -1)
            if aid is not None:
                market_likes_received[aid] += 1

        mids = set(items_by_user.keys()) | set(market_likes_given.keys()) | set(market_likes_received.keys())
        market_rows: List[List[Any]] = []
        for uid in sorted(mids):
            market_rows.append([
                uid,
                user_id_to_email.get(uid, ""),
                items_by_user.get(uid, 0),
                market_likes_given.get(uid, 0),
                market_likes_received.get(uid, 0),
            ])
        write_csv(
            os.path.join(out_root, "market_summary.csv"),
            ["user_id", "email", "items", "likes_given_items", "likes_received_items"],
            market_rows,
        )

    # users_features: ユーザー属性 + テキスト長などの特徴量
    # 平均投稿文字数・平均返信文字数
    post_len_by_user: Dict[int, List[int]] = defaultdict(list)
    reply_len_by_user: Dict[int, List[int]] = defaultdict(list)
    for p in posts:
        aid = to_int(p.get("author_id"))
        if aid is not None:
            content = (p.get("content") or "").strip()
            post_len_by_user[aid].append(len(content))
    for r in replies:
        aid = to_int(r.get("author_id"))
        if aid is not None:
            content = (r.get("content") or "").strip()
            reply_len_by_user[aid].append(len(content))

    def avg(lst: List[int]) -> float:
        return round(sum(lst) / len(lst), 2) if lst else 0.0

    users_features_rows: List[List[Any]] = []
    for uid in sorted(user_ids):
        # ユーザー属性
        # 対応カラム: email, university, year, department がある前提
        urow = next((u for u in users if to_int(u.get("id")) == uid), None)
        email = (urow or {}).get("email") if urow else ""
        university = (urow or {}).get("university") if urow else ""
        year = (urow or {}).get("year") if urow else ""
        department = (urow or {}).get("department") if urow else ""

        users_features_rows.append([
            uid,
            email or "",
            university or "",
            year or "",
            department or "",
            posts_by_user.get(uid, 0),
            replies_by_user.get(uid, 0),
            likes_given_posts.get(uid, 0),
            likes_given_replies.get(uid, 0),
            likes_received_posts.get(uid, 0),
            likes_received_replies.get(uid, 0),
            avg(post_len_by_user.get(uid, [])),
            avg(reply_len_by_user.get(uid, [])),
        ])
    write_csv(
        os.path.join(out_root, "users_features.csv"),
        [
            "user_id",
            "email",
            "university",
            "year",
            "department",
            "posts",
            "replies",
            "likes_given_posts",
            "likes_given_replies",
            "likes_received_posts",
            "likes_received_replies",
            "avg_post_length",
            "avg_reply_length",
        ],
        users_features_rows,
    )

    # user_board_engagement: ユーザー×掲示板の関与行列
    # posts/replies/likes_given_(posts,replies)/likes_received_(posts,replies) をboard_id別に集計
    ub_posts: Dict[tuple, int] = defaultdict(int)
    ub_replies: Dict[tuple, int] = defaultdict(int)
    ub_likes_given_posts: Dict[tuple, int] = defaultdict(int)
    ub_likes_given_replies: Dict[tuple, int] = defaultdict(int)
    ub_likes_received_posts: Dict[tuple, int] = defaultdict(int)
    ub_likes_received_replies: Dict[tuple, int] = defaultdict(int)

    for p in posts:
        uid = to_int(p.get("author_id"))
        b = p.get("board_id") or ""
        if uid is not None:
            ub_posts[(uid, b)] += 1
    for r in replies:
        uid = to_int(r.get("author_id"))
        pid = to_int(r.get("post_id"))
        b = post_id_to_board.get(pid or -1, "")
        if uid is not None:
            ub_replies[(uid, b)] += 1
    for pl in post_likes:
        uid = to_int(pl.get("user_id"))
        pid = to_int(pl.get("post_id"))
        b = post_id_to_board.get(pid or -1, "")
        if uid is not None:
            ub_likes_given_posts[(uid, b)] += 1
        # 受領側
        author = post_id_to_author.get(pid or -1)
        if author is not None:
            ub_likes_received_posts[(author, b)] += 1
    for rl in reply_likes:
        uid = to_int(rl.get("user_id"))
        rid = to_int(rl.get("reply_id"))
        pid = reply_id_to_post.get(rid or -1)
        b = post_id_to_board.get(pid or -1, "")
        if uid is not None:
            ub_likes_given_replies[(uid, b)] += 1
        author = reply_id_to_author.get(rid or -1)
        if author is not None:
            ub_likes_received_replies[(author, b)] += 1

    # 行データ生成
    ub_rows: List[List[Any]] = []
    # 全ての (uid, board) のキーを集める
    keys = (
        set(ub_posts.keys())
        | set(ub_replies.keys())
        | set(ub_likes_given_posts.keys())
        | set(ub_likes_given_replies.keys())
        | set(ub_likes_received_posts.keys())
        | set(ub_likes_received_replies.keys())
    )
    for (uid, b) in sorted(keys, key=lambda x: (x[0], x[1])):
        ub_rows.append([
            uid,
            user_id_to_email.get(uid, ""),
            b,
            ub_posts.get((uid, b), 0),
            ub_replies.get((uid, b), 0),
            ub_likes_given_posts.get((uid, b), 0),
            ub_likes_given_replies.get((uid, b), 0),
            ub_likes_received_posts.get((uid, b), 0),
            ub_likes_received_replies.get((uid, b), 0),
        ])
    write_csv(
        os.path.join(out_root, "user_board_engagement.csv"),
        [
            "user_id",
            "email",
            "board_id",
            "posts",
            "replies",
            "likes_given_posts",
            "likes_given_replies",
            "likes_received_posts",
            "likes_received_replies",
        ],
        ub_rows,
    )

    return out_root


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Aggregate exported CSVs into summaries")
    parser.add_argument("export_dir", help="Path to export directory (data_exports/<timestamp>)")
    parser.add_argument("--out", dest="out_dir", default=None, help="Output directory for summaries")
    args = parser.parse_args()
    out = aggregate(args.export_dir, args.out_dir)
    print(f"✅ Aggregation completed: {out}")


