import os
from pathlib import Path
import pandas as pd
import streamlit as st
import altair as alt
from typing import Optional
import re
import datetime as dt

# Paths
ROOT = Path(__file__).resolve().parent
EXPORT_DIR = ROOT / "data_exports" / "latest"
AGG_DIR = EXPORT_DIR / "aggregated"

@st.cache_data(show_spinner=False)
def load_csv(path: Path) -> pd.DataFrame:
    if not path.exists():
        return pd.DataFrame()
    try:
        return pd.read_csv(path)
    except Exception:
        return pd.DataFrame()

def to_numeric(df: pd.DataFrame, cols: list[str]) -> pd.DataFrame:
    for c in cols:
        if c in df.columns:
            df[c] = pd.to_numeric(df[c], errors="coerce").fillna(0)
    return df

def bar(df: pd.DataFrame, x: str, y: str, title: str = "", top_n: Optional[int] = None):
    if df.empty or x not in df.columns or y not in df.columns:
        return None
    data = df.copy()
    data = to_numeric(data, [y])
    if top_n:
        data = data.sort_values(y, ascending=False).head(top_n)
    chart = alt.Chart(data).mark_bar().encode(
        x=alt.X(x + ":N", sort='-y', title=x),
        y=alt.Y(y + ":Q", title=y),
        tooltip=list(data.columns),
    ).properties(title=title, height=260)
    return chart

def ensure_dirs() -> None:
    EXPORT_DIR.mkdir(parents=True, exist_ok=True)
    AGG_DIR.mkdir(parents=True, exist_ok=True)

def run_fetch() -> None:
    from fetch_and_aggregate import main as fetch_main
    fetch_main()

ADMIN_EMAIL_RE = re.compile(r'^(master|mster)(00|0?[1-9]|[1-2][0-9]|30)@', re.IGNORECASE)

def is_admin_email(email: str) -> bool:
    if not isinstance(email, str):
        return False
    return ADMIN_EMAIL_RE.match(email.strip()) is not None

def normalize_email(value: str) -> str:
    """
    メールアドレスの正規化:
    - 前後空白除去、全小文字化
    - Gmail/Googlemail/icloud は +以降を除去（サブアドレス無視）
    - Gmail/Googlemail は local のドットを無視し、googlemail を gmail に統一
    """
    if not isinstance(value, str):
        return ""
    s = value.strip().lower()
    if "@" not in s:
        return s
    local, domain = s.split("@", 1)
    if domain in ("googlemail.com",):
        domain = "gmail.com"
    if domain in ("gmail.com", "googlemail.com", "icloud.com"):
        if "+" in local:
            local = local.split("+", 1)[0]
    if domain in ("gmail.com", "googlemail.com"):
        local = local.replace(".", "")
    return f"{local}@{domain}"

def admin_group(email: str) -> Optional[str]:
    """
    master/msterXX の XX を 1-10 / 11-20 / 21-30 でグループ化
    """
    if not isinstance(email, str):
        return None
    m = ADMIN_EMAIL_RE.match(email.strip())
    if not m:
        return None
    # 末尾の数字（先頭ゼロ許容）
    digits = re.findall(r'(\d+)', email)
    if not digits:
        return None
    try:
        n = int(digits[0])
    except Exception:
        return None
    if 1 <= n <= 10:
        return "1-10"
    if 11 <= n <= 20:
        return "11-20"
    if 21 <= n <= 30:
        return "21-30"
    return None

def parse_date(col: pd.Series) -> pd.Series:
    return pd.to_datetime(col, errors="coerce").dt.tz_localize(None) if str(col.dtype) == "object" else pd.to_datetime(col, errors="coerce").dt.tz_localize(None)

def last_ndays_filter(df: pd.DataFrame, date_col: str, days: int = 30) -> pd.DataFrame:
    if df.empty or date_col not in df.columns:
        return df
    d = parse_date(df[date_col])
    cutoff = pd.Timestamp.now() - pd.Timedelta(days=days)
    return df.loc[d >= cutoff].assign(**{date_col: d})

def line(df: pd.DataFrame, x: str, y: str, color: Optional[str] = None, title: str = ""):
    if df.empty or x not in df.columns or y not in df.columns:
        return None
    enc = {
        "x": alt.X(f"{x}:T", title=x),
        "y": alt.Y(f"{y}:Q", title=y),
        "tooltip": list(df.columns),
    }
    if color and color in df.columns:
        enc["color"] = alt.Color(f"{color}:N", title=color)
    chart = alt.Chart(df).mark_line(point=True).encode(**enc).properties(title=title, height=260)
    return chart

def path_category(path: str) -> str:
    if not isinstance(path, str):
        return "other"
    p = path.lower()
    if "/board" in p:
        return "board"
    if "/market" in p:
        return "market"
    if "/course" in p or "/courses" in p:
        return "course"
    if "/circle" in p or "/circles" in p:
        return "circle"
    return "other"

def compute_sessions(dfu: pd.DataFrame, threshold_minutes: int = 30) -> pd.DataFrame:
    """
    page_views の行からセッションを推定し集計を返す。
    - 連続リクエストの間隔が threshold_minutes を超えると新しいセッション
    返却カラム: email, session_id, start, end, duration_minutes, pageviews, unique_paths,
               unique_board_posts, unique_market_items, unique_course_pages, unique_circle_pages
    """
    if dfu.empty:
        return pd.DataFrame()
    dfu = dfu.copy().sort_values(["email", "created_at"])
    # セッション境界を検出
    gap_min = dfu.groupby("email")["created_at"].diff().dt.total_seconds().div(60)
    gap_min = gap_min.fillna(threshold_minutes + 1)
    new_session = (gap_min > threshold_minutes).astype(int)
    session_id = new_session.groupby(dfu["email"]).cumsum()
    dfu["session_id"] = session_id
    # 集計
    def count_unique_by_regex(paths: pd.Series, pat: str, fallback_contains: Optional[str] = None) -> int:
        s = paths.astype(str)
        ids = s.str.extract(pat, expand=False)
        n = ids.dropna().nunique()
        if n == 0 and fallback_contains:
            n = s[s.str.contains(fallback_contains, na=False)].nunique()
        return int(n)
    agg = dfu.groupby(["email", "session_id"]).agg(
        start=("created_at", "min"),
        end=("created_at", "max"),
        pageviews=("path", "count"),
        unique_paths=("path", lambda s: s.astype(str).nunique()),
        unique_board_posts=("path", lambda s: count_unique_by_regex(s, r"/board/(\\d+)", "/board")),
        unique_market_items=("path", lambda s: count_unique_by_regex(s, r"/market(?:/item)?/(\\d+)", "/market")),
        unique_course_pages=("path", lambda s: count_unique_by_regex(s, r"/course(?:s)?/(?:summary|detail)?/(\\d+)", "/course")),
        unique_circle_pages=("path", lambda s: count_unique_by_regex(s, r"/circle(?:s)?/(?:summary|detail)?/(\\d+)", "/circle")),
    ).reset_index()
    agg["duration_minutes"] = (agg["end"] - agg["start"]).dt.total_seconds().div(60).round(1)
    # 表示順に並べ替え
    agg = agg.sort_values(["email", "start"]).reset_index(drop=True)
    return agg

def overview_tab():
    st.subheader("概要")
    users_full = load_csv(AGG_DIR / "users_full_summary.csv")
    pv = load_csv(AGG_DIR / "pageviews_by_user.csv")
    boards = load_csv(AGG_DIR / "boards_summary.csv")
    market = load_csv(AGG_DIR / "market_summary.csv")
    # raw for trends
    posts_raw = load_csv(EXPORT_DIR / "board_posts.csv")
    replies_raw = load_csv(EXPORT_DIR / "board_replies.csv")

    # 管理者を除外したビュー
    uf_non_admin = users_full[~users_full["email"].astype(str).apply(is_admin_email)] if not users_full.empty else users_full
    pv_non_admin = pv[~pv["email"].astype(str).apply(is_admin_email)] if not pv.empty else pv
    market_non_admin = market[~market["email"].astype(str).apply(is_admin_email)] if not market.empty else market

    cols = st.columns(4)
    with cols[0]:
        st.metric("ユーザー数(集計行)", f"{len(uf_non_admin):,}")
    with cols[1]:
        total_posts = int(uf_non_admin.get("board_posts", pd.Series()).sum()) if not uf_non_admin.empty else 0
        st.metric("掲示板投稿数(総計)", f"{total_posts:,}")
    with cols[2]:
        act_30d = int(pv_non_admin.get("active_days_30d", pd.Series()).sum()) if not pv_non_admin.empty else 0
        st.metric("延アクティブ日数(30d)", f"{act_30d:,}")
    with cols[3]:
        m_items = int(market_non_admin.get("items", pd.Series()).sum()) if not market_non_admin.empty else 0
        st.metric("出品数(総計)", f"{m_items:,}")

    if not uf_non_admin.empty:
        left, right = st.columns(2)
        with left:
            st.markdown("#### 掲示板投稿 上位")
            chart = bar(uf_non_admin[["email","board_posts"]], x="email", y="board_posts", title="Top Posters", top_n=15)
            if chart is not None:
                st.altair_chart(chart, use_container_width=True)
        with right:
            st.markdown("#### 直近30日アクティブ日数 上位")
            if not pv_non_admin.empty:
                chart = bar(pv_non_admin[["email","active_days_30d"]], x="email", y="active_days_30d", title="Active Days (30d) Top", top_n=15)
                if chart is not None:
                    st.altair_chart(chart, use_container_width=True)

    # トレンド: 直近30日の投稿/返信 推移
    with st.expander("直近30日の投稿/返信トレンド", expanded=True):
        n_days = st.slider("期間(日)", 7, 90, 30, key="ov_trend_days")
        p30 = last_ndays_filter(posts_raw, "created_at", n_days)
        r30 = last_ndays_filter(replies_raw, "created_at", n_days)
        if not p30.empty or not r30.empty:
            pser = p30.assign(date=parse_date(p30["created_at"]).dt.date).groupby("date").size().reset_index(name="posts")
            rser = r30.assign(date=parse_date(r30["created_at"]).dt.date).groupby("date").size().reset_index(name="replies")
            trend = pd.merge(pser, rser, on="date", how="outer").fillna(0).sort_values("date")
            trend_long = trend.melt(id_vars=["date"], var_name="type", value_name="count")
            c = alt.Chart(trend_long).mark_line(point=True).encode(
                x=alt.X("date:T", title="日付"),
                y=alt.Y("count:Q", title="件数"),
                color=alt.Color("type:N", title="種別"),
                tooltip=list(trend_long.columns),
            ).properties(height=260)
            st.altair_chart(c, use_container_width=True)

    if not boards.empty:
        st.markdown("#### 掲示板別の活動量")
        boards = to_numeric(boards, ["post_count","reply_count","post_likes","reply_likes","unique_visitors","unique_posters"])
        tabs = st.tabs(["投稿数", "返信数", "投稿いいね", "返信いいね", "訪問者数", "投稿者数"])
        metrics = [
            ("post_count","投稿数"),
            ("reply_count","返信数"),
            ("post_likes","投稿いいね"),
            ("reply_likes","返信いいね"),
            ("unique_visitors","訪問者数"),
            ("unique_posters","投稿者数"),
        ]
        for i, (col, ttl) in enumerate(metrics):
            with tabs[i]:
                chart = alt.Chart(boards).mark_bar().encode(
                    x=alt.X("board_id:N", title="Board"),
                    y=alt.Y(f"{col}:Q", title=ttl),
                    tooltip=list(boards.columns),
                ).properties(height=260)
                st.altair_chart(chart, use_container_width=True)

def users_tab():
    st.subheader("ユーザー別 行動サマリ")
    users_full = load_csv(AGG_DIR / "users_full_summary.csv")
    pv = load_csv(AGG_DIR / "pageviews_by_user.csv")
    if users_full.empty:
        st.info("users_full_summary.csv がまだありません。「最新データを取得して集計」を実行してください。")
        return
    # 管理者除外
    users_full = users_full[~users_full["email"].astype(str).apply(is_admin_email)]
    pv = pv[~pv["email"].astype(str).apply(is_admin_email)] if not pv.empty else pv
    q = st.text_input("メールアドレスでフィルタ", "")
    df = users_full.copy()
    for c in df.columns:
        if c not in ("email",):
            try:
                df[c] = pd.to_numeric(df[c])
            except Exception:
                df[c] = pd.to_numeric(df[c], errors="coerce")
    if q:
        df = df[df["email"].astype(str).str.contains(q, case=False, na=False)]
    # 追加チャート
    st.markdown("#### 上位ユーザーの比較（棒グラフ）")
    left, right = st.columns(2)
    with left:
        chart = bar(df[["email","board_posts"]], x="email", y="board_posts", title="Board Posts Top", top_n=20)
        if chart is not None:
            st.altair_chart(chart, use_container_width=True)
    with right:
        if not pv.empty:
            chart = bar(pv[["email","active_days_30d"]], x="email", y="active_days_30d", title="Active Days (30d) Top", top_n=20)
            if chart is not None:
                st.altair_chart(chart, use_container_width=True)
    # 下部にデータ一覧
    with st.expander("データ一覧（users_full_summary）", expanded=False):
        st.dataframe(df.sort_values("board_posts", ascending=False), use_container_width=True, height=420)

def boards_tab():
    st.subheader("掲示板 集計")
    boards = load_csv(AGG_DIR / "boards_summary.csv")
    posts_raw = load_csv(EXPORT_DIR / "board_posts.csv")
    replies_raw = load_csv(EXPORT_DIR / "board_replies.csv")
    pv_raw = load_csv(EXPORT_DIR / "page_views.csv")
    if boards.empty:
        st.info("boards_summary.csv がありません。")
        return
    # スタック棒（投稿+返信）
    boards = to_numeric(boards, ["post_count", "reply_count"])
    stacked = boards.melt(id_vars=["board_id"], value_vars=["post_count","reply_count"], var_name="type", value_name="count")
    c = alt.Chart(stacked).mark_bar().encode(
        x=alt.X("board_id:N", title="Board"),
        y=alt.Y("count:Q", stack="zero", title="件数"),
        color=alt.Color("type:N", title="種別"),
        tooltip=list(stacked.columns),
    ).properties(title="投稿/返信 スタック", height=260)
    st.altair_chart(c, use_container_width=True)

    # ボード別トレンド
    with st.expander("掲示板ごとのトレンド（直近60日）", expanded=True):
        board_sel = st.text_input("対象 board_id（カンマ区切り可。空は全体）", "")
        days = st.slider("期間(日)", 7, 120, 60, key="board_trend_days")
        p = last_ndays_filter(posts_raw, "created_at", days)
        r = last_ndays_filter(replies_raw, "created_at", days)
        if board_sel.strip():
            ids = [s.strip() for s in board_sel.split(",") if s.strip()]
            p = p[p["board_id"].astype(str).isin(ids)]
            # replies は post_idからboard_idを引けないので全体傾向として表示
        p["date"] = parse_date(p["created_at"]).dt.date
        p_ser = p.groupby(["board_id","date"]).size().reset_index(name="posts")
        p_ser = p_ser.rename(columns={"board_id":"Board"})
        if not p_ser.empty:
            c2 = alt.Chart(p_ser).mark_line(point=True).encode(
                x=alt.X("date:T", title="日付"),
                y=alt.Y("posts:Q", title="投稿数"),
                color=alt.Color("Board:N", title="Board"),
                tooltip=list(p_ser.columns),
            ).properties(height=260)
            st.altair_chart(c2, use_container_width=True)
    # ボード別DAU（パスから推定）
    if not pv_raw.empty:
        with st.expander("ボード別 DAU（PageViewのpathから推定）", expanded=False):
            dfp = pv_raw.copy()
            dfp["email"] = dfp.get("email", "").astype(str).map(normalize_email)
            dfp = dfp[dfp["email"].str.contains("@", na=False)]
            dfp = dfp[~dfp["email"].apply(is_admin_email)]
            dfp["created_at"] = parse_date(dfp.get("created_at"))
            dfp = dfp.dropna(subset=["created_at"])
            # pathから /board/<id> を抽出
            dfp["path"] = dfp.get("path", "").astype(str)
            dfp["board_id"] = dfp["path"].str.extract(r"/board/(\\d+)", expand=False)
            dfp = dfp.dropna(subset=["board_id"])
            dfp = dfp.assign(day=lambda d: d["created_at"].dt.date)
            dau_b = dfp.groupby(["board_id","day"])["email"].nunique().reset_index(name="dau")
            sel = st.multiselect("対象Board", sorted(dau_b["board_id"].unique().tolist()), default=sorted(dau_b["board_id"].unique().tolist())[:3])
            if sel:
                dau_b = dau_b[dau_b["board_id"].isin(sel)]
            chart_b = alt.Chart(dau_b).mark_line(point=True).encode(
                x=alt.X("day:T", title="日付"),
                y=alt.Y("dau:Q", title="DAU"),
                color=alt.Color("board_id:N", title="Board"),
                tooltip=[alt.Tooltip("board_id:N", title="Board"),
                         alt.Tooltip("day:T", title="日付"),
                         alt.Tooltip("dau:Q", title="DAU")],
            ).properties(height=260)
            st.altair_chart(chart_b, use_container_width=True)
    # 下部にデータ一覧
    with st.expander("データ一覧（boards_summary）", expanded=False):
        st.dataframe(boards, use_container_width=True, height=420)

def market_tab():
    st.subheader("マーケット 集計")
    market = load_csv(AGG_DIR / "market_summary.csv")
    items_raw = load_csv(EXPORT_DIR / "market_items.csv")
    if market.empty:
        st.info("market_summary.csv がありません。")
        return
    # 管理者除外
    market = market[~market["email"].astype(str).apply(is_admin_email)]
    market = to_numeric(market, ["items","likes_given_items","likes_received_items"])
    st.markdown("#### 出品数 上位（棒グラフ）")
    chart = bar(market[["email","items"]], x="email", y="items", title="Items by User", top_n=15)
    if chart is not None:
        st.altair_chart(chart, use_container_width=True)
    # 価格分布と出品推移
    with st.expander("価格分布 / 出品推移", expanded=True):
        if not items_raw.empty:
            items_raw["price"] = pd.to_numeric(items_raw.get("price", 0), errors="coerce").fillna(0)
            items_raw["date"] = parse_date(items_raw.get("created_at"))
            col1, col2 = st.columns(2)
            with col1:
                hist = alt.Chart(items_raw).mark_bar().encode(
                    x=alt.X("price:Q", bin=alt.Bin(maxbins=40), title="価格"),
                    y=alt.Y("count()", title="件数"),
                ).properties(height=260, title="価格ヒストグラム")
                st.altair_chart(hist, use_container_width=True)
            with col2:
                daily = items_raw.dropna(subset=["date"]).assign(day=lambda d: d["date"].dt.date).groupby("day").size().reset_index(name="items")
                c3 = line(daily, x="day", y="items", title="出品数（推移）")
                if c3 is not None:
                    st.altair_chart(c3, use_container_width=True)
    # 価格帯×種別ヒートマップ
    if not items_raw.empty:
        with st.expander("価格帯 × 種別 ヒートマップ", expanded=False):
            items = items_raw.copy()
            items["type"] = items.get("type", "").fillna("unknown").astype(str)
            items["price"] = pd.to_numeric(items.get("price", 0), errors="coerce").fillna(0)
            bins = [0, 500, 1000, 2000, 5000, 10000, 20000, 9999999]
            labels = ["0-500", "500-1k", "1k-2k", "2k-5k", "5k-10k", "10k-20k", "20k+"]
            items["price_band"] = pd.cut(items["price"], bins=bins, labels=labels, include_lowest=True)
            # pandas の observed 既定値変更への対応
            cross = items.groupby(["type","price_band"], observed=False).size().reset_index(name="count")
            heat = alt.Chart(cross).mark_rect().encode(
                x=alt.X("price_band:N", title="価格帯", sort=labels),
                y=alt.Y("type:N", title="種別"),
                color=alt.Color("count:Q", title="件数"),
                tooltip=[alt.Tooltip("type:N", title="種別"),
                         alt.Tooltip("price_band:N", title="価格帯"),
                         alt.Tooltip("count:Q", title="件数")],
            ).properties(height=240)
            st.altair_chart(heat, use_container_width=True)
    # 下部にデータ一覧
    with st.expander("データ一覧（market_summary）", expanded=False):
        st.dataframe(market.sort_values("items", ascending=False), use_container_width=True, height=420)

def engagement_tab():
    st.subheader("継続ログイン (PageViews)")
    pv = load_csv(AGG_DIR / "pageviews_by_user.csv")
    pv_raw = load_csv(EXPORT_DIR / "page_views.csv")
    posts_raw = load_csv(EXPORT_DIR / "board_posts.csv")
    replies_raw = load_csv(EXPORT_DIR / "board_replies.csv")
    if pv.empty:
        st.info("pageviews_by_user.csv がありません。")
        return
    # 管理者除外
    pv = pv[~pv["email"].astype(str).apply(is_admin_email)]
    # page_views.csv からメール紐付けで再集計（信頼性向上）
    pv_user = pd.DataFrame()
    if not pv_raw.empty:
        dfu = pv_raw.copy()
        dfu["email"] = dfu.get("email", "").astype(str).map(normalize_email)
        dfu = dfu[dfu["email"].str.contains("@", na=False)]
        dfu = dfu[~dfu["email"].apply(is_admin_email)]
        dfu["created_at"] = parse_date(dfu.get("created_at"))
        dfu = dfu.dropna(subset=["created_at"])
        dfu["day"] = dfu["created_at"].dt.date
        cutoff_30 = pd.Timestamp.now().date() - pd.Timedelta(days=30)
        cutoff_7 = pd.Timestamp.now().date() - pd.Timedelta(days=7)
        # 基本集計
        base = dfu.groupby("email").agg(
            pv_total=("email", "count"),
            first_seen=("created_at", "min"),
            last_seen=("created_at", "max"),
        ).reset_index()
        days_total = dfu.groupby(["email","day"]).size().reset_index(name="pv").groupby("email")["day"].nunique().reset_index(name="active_days_total")
        days_30 = dfu[dfu["day"] >= cutoff_30].groupby(["email","day"]).size().reset_index(name="pv").groupby("email")["day"].nunique().reset_index(name="active_days_30d")
        days_7 = dfu[dfu["day"] >= cutoff_7].groupby(["email","day"]).size().reset_index(name="pv").groupby("email")["day"].nunique().reset_index(name="active_days_7d")
        pv_user = base.merge(days_total, on="email", how="left").merge(days_30, on="email", how="left").merge(days_7, on="email", how="left").fillna(0)
        # 連続日数（current / longest）
        def calc_streaks(days):
            if not len(days):
                return 0, 0
            days = sorted(set(days))
            longest = cur = 1
            for i in range(1, len(days)):
                if (days[i] - days[i-1]).days == 1:
                    cur += 1
                    longest = max(longest, cur)
                else:
                    cur = 1
            # 現在の連続（日付末尾から逆方向）
            cur_now = 1
            for i in range(len(days)-1, 0, -1):
                if (days[i] - days[i-1]).days == 1:
                    cur_now += 1
                else:
                    break
            return cur_now, longest
        def streak_metrics(s: pd.Series) -> pd.Series:
            cur, longest = calc_streaks(pd.to_datetime(s).dt.date.tolist())
            return pd.Series({"current_streak_days": cur, "longest_streak_days": longest})
        streaks = dfu.groupby("email")["day"].apply(streak_metrics).reset_index()
        pv_user = pv_user.merge(streaks, on="email", how="left")
        # 型・欠損補完
        for col in ["pv_total","active_days_total","active_days_30d","active_days_7d","current_streak_days","longest_streak_days"]:
            if col not in pv_user.columns:
                pv_user[col] = 0
        pv_user = to_numeric(pv_user, ["pv_total","active_days_total","active_days_30d","active_days_7d","current_streak_days","longest_streak_days"])
        if "first_seen" not in pv_user.columns:
            pv_user["first_seen"] = pd.NaT
        if "last_seen" not in pv_user.columns:
            pv_user["last_seen"] = pd.NaT
        # 念のため email 単位で再集約（重複行を完全排除）
        pv_user = pv_user.groupby("email", as_index=False).agg({
            "pv_total": "sum",
            "active_days_total": "max",
            "active_days_30d": "max",
            "active_days_7d": "max",
            "current_streak_days": "max",
            "longest_streak_days": "max",
            "first_seen": "min",
            "last_seen": "max",
        })
    # 分布（直近30日アクティブ日数）: 再集計に基づく
    if not pv_user.empty:
        st.markdown("#### 分布（直近30日アクティブ日数）")
        hist = alt.Chart(pv_user).mark_bar().encode(
            x=alt.X("active_days_30d:Q", bin=alt.Bin(maxbins=30), title="Active Days (30d)"),
            y=alt.Y("count()", title="Users"),
        ).properties(height=360)
        st.altair_chart(hist, use_container_width=True)
        # page_views 由来の指標（総PVに基づく）
        st.markdown("#### page_views 由来の指標")
        cols = st.columns(3)
        with cols[0]:
            st.metric("ユーザー数", f"{len(pv_user):,}")
        with cols[1]:
            st.metric("平均ログイン回数（総PV）", f"{pv_user['pv_total'].mean():.1f}")
        with cols[2]:
            st.metric("中央値（総PV）", f"{pv_user['pv_total'].median():.0f}")
        thr_max = int(max(1, pv_user["pv_total"].max()))
        thr = st.slider("しきい値（総PVが以上のユーザー）", 1, thr_max, min(10, thr_max), key="pv_total_threshold")
        cohort = pv_user[pv_user["pv_total"] >= thr].copy().sort_values("pv_total", ascending=False)
        st.write(f"該当ユーザー数: {len(cohort)} 人 / しきい値: {thr} 回以上")
        with st.expander("該当メールアドレス（コピー用）", expanded=False):
            emails_text = "\n".join(cohort["email"].astype(str).tolist())
            st.text_area("Emails", emails_text, height=180)
        with st.expander("該当ユーザー詳細", expanded=False):
            st.dataframe(cohort[["email","pv_total","active_days_total","active_days_30d","current_streak_days","longest_streak_days","first_seen","last_seen"]],
                         use_container_width=True, height=360)
    # 全体ヒートマップは非表示（要望により削除）
    # ユーザー別: 日時バケット × ユーザー ヒートマップ（縦=ユーザー, 横=時系列）
    if not pv_raw.empty:
        st.markdown("#### ユーザー × 時系列 ヒートマップ（縦=ユーザー, 横=日付時刻）")
        days_back = st.slider("対象期間（日）", 7, 180, 60, key="pv_user_time_days")
        topn = st.slider("表示ユーザー数（上位PV）", 10, 100, 40, step=5, key="pv_user_time_topn")
        res_label = st.select_slider("時間解像度", options=["15分", "30分", "1時間", "3時間", "6時間", "12時間"], value="1時間", key="pv_user_time_res")
        # pandas 2.2+ は 'H' が非推奨のため小文字へ
        freq_map = {"15分":"15min", "30分":"30min", "1時間":"1h", "3時間":"3h", "6時間":"6h", "12時間":"12h"}
        freq = freq_map.get(res_label, "1h")
        df = pv_raw.copy()
        df["email"] = df.get("email", "").astype(str).map(normalize_email)
        # 無効メール除外（admin/空/nan）
        df = df[df["email"].str.contains("@", na=False)]
        df = df[~df["email"].apply(is_admin_email)]
        df["created_at"] = parse_date(df.get("created_at"))
        df = df.dropna(subset=["created_at"])
        cutoff = pd.Timestamp.now() - pd.Timedelta(days=days_back)
        df = df[df["created_at"] >= cutoff]
        # 解像度でバケット
        df["bucket"] = df["created_at"].dt.floor(freq)
        # 上位ユーザー抽出（期間内PV上位） + 上限を実データ数に合わせる
        unique_emails = df["email"].unique().tolist()
        topn_eff = min(topn, len(unique_emails))
        tops = df.groupby("email").size().reset_index(name="pv").sort_values("pv", ascending=False).head(topn_eff)["email"]
        df = df[df["email"].isin(tops)]
        # 並び順（総PV降順）
        totals = df.groupby("email").size().sort_values(ascending=False)
        email_order = totals.index.tolist()
        # ピボット（日付時刻 × ユーザー）: presence(1/0) を色にして「色が付いていたら来訪」
        # 完全グリッド化（未訪も0で描画）
        full_buckets = pd.date_range(start=df["bucket"].min(), end=df["bucket"].max(), freq=freq)
        users_sel = pd.Index(email_order, name="email")
        grid = pd.MultiIndex.from_product([users_sel, full_buckets], names=["email","bucket"]).to_frame(index=False)
        pivot = df.groupby(["email","bucket"]).size().reset_index(name="pv")
        pivot = grid.merge(pivot, on=["email","bucket"], how="left").fillna({"pv": 0})
        pivot["present"] = (pivot["pv"] > 0).astype(int)
        # 離散ラベルで横軸を明示（連続軸で間引かれるのを防ぐ）
        pivot["bucket_str"] = pivot["bucket"].dt.strftime("%Y-%m-%d %H:%M")
        bucket_order = pivot["bucket_str"].drop_duplicates().sort_values().tolist()
        heat = alt.Chart(pivot).mark_rect(stroke=None).encode(
            x=alt.X("bucket_str:N",
                    sort=bucket_order,
                    title=f"時刻（{res_label}バケット）",
                    axis=alt.Axis(labelAngle=-45, labelOverlap=False, labelLimit=1000)),
            y=alt.Y("email:N",
                    title="ユーザー",
                    sort=email_order,
                    axis=alt.Axis(labelLimit=1000, labelOverlap=False, labelFontSize=10)),
            color=alt.Color("present:Q",
                            title="在席",
                            scale=alt.Scale(domain=[0,1], range=["#f3f4f6", "#10b981"])),
            tooltip=[alt.Tooltip("email:N", title="ユーザー"),
                     alt.Tooltip("bucket:T", title="時刻"),
                     alt.Tooltip("pv:Q", title="PV")],
        ).properties(height=max(360, len(email_order)*16))
        st.altair_chart(heat, use_container_width=True)
        st.caption(f"表示中: {len(email_order)} ユーザー（上限 {topn}） / 期間: 過去 {days_back} 日 / 解像度: {res_label}")
    # 投稿→初返信までの時間（分）の分布
    if not posts_raw.empty and not replies_raw.empty:
        with st.expander("投稿→初返信までの時間（分）", expanded=False):
            p = posts_raw[["id","created_at"]].copy()
            p["post_ts"] = parse_date(p["created_at"])
            r = replies_raw[["post_id","created_at"]].copy()
            r["reply_ts"] = parse_date(r["created_at"])
            first_r = r.sort_values("reply_ts").dropna(subset=["reply_ts"]).groupby("post_id").first().reset_index()
            merged = p.merge(first_r, left_on="id", right_on="post_id", how="inner")
            merged["mins"] = (merged["reply_ts"] - merged["post_ts"]).dt.total_seconds() / 60.0
            merged = merged[(merged["mins"] >= 0) & (merged["mins"].notna())]
            hist = alt.Chart(merged).mark_bar().encode(
                x=alt.X("mins:Q", bin=alt.Bin(maxbins=50), title="経過時間（分）"),
                y=alt.Y("count()", title="投稿数"),
                tooltip=["count()"]
            ).properties(height=240)
            st.altair_chart(hist, use_container_width=True)
    # セッション分析（page_views から推定）
    if not pv_raw.empty:
        with st.expander("セッション分析（page_views）", expanded=True):
            days = st.slider("対象期間（日）", 1, 90, 14, key="sess_days")
            gap = st.slider("セッション区切り（分）", 5, 120, 30, step=5, key="sess_gap")
            q = st.text_input("メール部分一致フィルタ（空で全体）", "", key="sess_q")
            df = pv_raw.copy()
            df["email"] = df.get("email", "").astype(str).map(normalize_email)
            df = df[df["email"].str.contains("@", na=False)]
            df = df[~df["email"].apply(is_admin_email)]
            df["created_at"] = parse_date(df.get("created_at"))
            df = df.dropna(subset=["created_at"])
            cutoff = pd.Timestamp.now() - pd.Timedelta(days=days)
            df = df[df["created_at"] >= cutoff]
            if q.strip():
                df = df[df["email"].str.contains(q.strip(), case=False, na=False)]
            sessions = compute_sessions(df[["email","created_at","path"]], threshold_minutes=gap)
            if sessions.empty:
                st.info("対象期間にセッションがありません。")
            else:
                # KPI
                col1, col2, col3 = st.columns(3)
                with col1:
                    st.metric("セッション数", f"{len(sessions):,}")
                with col2:
                    st.metric("平均滞在時間(分)", f"{sessions['duration_minutes'].mean():.1f}")
                with col3:
                    st.metric("平均PV/セッション", f"{sessions['pageviews'].mean():.1f}")
                # 分布
                c1 = alt.Chart(sessions).mark_bar().encode(
                    x=alt.X("duration_minutes:Q", bin=alt.Bin(maxbins=40), title="滞在時間(分)"),
                    y=alt.Y("count()", title="セッション数"),
                ).properties(height=260, title="滞在時間 分布")
                c2 = alt.Chart(sessions).mark_bar().encode(
                    x=alt.X("pageviews:Q", bin=alt.Bin(maxbins=30), title="PV/セッション"),
                    y=alt.Y("count()", title="セッション数"),
                ).properties(height=260, title="PV/セッション 分布")
                st.altair_chart(alt.hconcat(c1, c2).resolve_scale(y="shared"), use_container_width=True)
                # 上位セッションとユーザー別サマリ
                top_sessions = sessions.sort_values(["duration_minutes","pageviews"], ascending=False).head(50)
                user_summary = sessions.groupby("email", as_index=False).agg(
                    sessions=("session_id","count"),
                    avg_duration=("duration_minutes","mean"),
                    avg_pv=("pageviews","mean"),
                    total_pv=("pageviews","sum"),
                    board_posts_viewed=("unique_board_posts","sum"),
                    market_items_viewed=("unique_market_items","sum"),
                    course_pages_viewed=("unique_course_pages","sum"),
                    circle_pages_viewed=("unique_circle_pages","sum"),
                ).sort_values("sessions", ascending=False)
                st.markdown("#### 上位セッション（滞在時間）")
                st.dataframe(top_sessions, use_container_width=True, height=320)
                st.markdown("#### ユーザー別サマリ")
                st.dataframe(user_summary, use_container_width=True, height=360)
                # ダウンロード
                st.download_button(
                    "セッションCSVをダウンロード",
                    data=sessions.to_csv(index=False).encode("utf-8"),
                    file_name="sessions.csv",
                    mime="text/csv",
                    use_container_width=True
                )
    # 下部にデータ一覧
    with st.expander("データ一覧（page_views 由来のユーザー集計）", expanded=False):
        if not pv_user.empty:
            show_cols = ["email","pv_total","active_days_total","active_days_30d","active_days_7d","current_streak_days","longest_streak_days","first_seen","last_seen"]
            display = pv_user[show_cols].sort_values(["active_days_30d","current_streak_days","pv_total"], ascending=[False, False, False])
            st.dataframe(display, use_container_width=True, height=420)
        else:
            st.info("page_views.csv が空、または有効なメールが含まれていません。")

def admins_tab():
    st.subheader("管理者の担当者別アクティビティ")
    users_full = load_csv(AGG_DIR / "users_full_summary.csv")
    if users_full.empty:
        st.info("users_full_summary.csv がまだありません。")
        return
    admins = users_full[users_full["email"].astype(str).apply(is_admin_email)].copy()
    if admins.empty:
        st.info("管理者アカウントが見つかりませんでした。")
        return
    # グループ列を付与
    admins["group"] = admins["email"].astype(str).apply(admin_group)
    admins = admins.dropna(subset=["group"])
    metrics = ["board_posts","board_replies","market_items","course_summaries","circle_summaries"]
    admins = to_numeric(admins, metrics)
    grouped = admins.groupby("group", as_index=False)[metrics].sum()
    st.dataframe(grouped.sort_values("group"), use_container_width=True, height=300)
    # チャート（縦にタブで切替）
    tabs = st.tabs(["掲示板投稿","掲示板返信","マーケット出品","授業まとめ投稿","サークルまとめ投稿"])
    titles = [
        ("board_posts","掲示板投稿"),
        ("board_replies","掲示板返信"),
        ("market_items","マーケット出品"),
        ("course_summaries","授業まとめ投稿"),
        ("circle_summaries","サークルまとめ投稿"),
    ]
    for i, (col, ttl) in enumerate(titles):
        with tabs[i]:
            chart = alt.Chart(grouped).mark_bar().encode(
                x=alt.X("group:N", title="担当者グループ"),
                y=alt.Y(f"{col}:Q", title=ttl),
                tooltip=list(grouped.columns),
            ).properties(height=260)
            st.altair_chart(chart, use_container_width=True)

def sessions_tab():
    st.subheader("セッション ピボット")
    pv_raw = load_csv(EXPORT_DIR / "page_views.csv")
    if pv_raw.empty:
        st.info("page_views.csv がありません。")
        return
    days = st.slider("対象期間（日）", 1, 120, 30, key="pv_pivot_days")
    gap = st.slider("セッション区切り（分）", 5, 120, 30, step=5, key="pv_pivot_gap")
    q = st.text_input("メール部分一致フィルタ（空で全体）", "", key="pv_pivot_q")
    df = pv_raw.copy()
    df["email"] = df.get("email", "").astype(str).map(normalize_email)
    df = df[df["email"].str.contains("@", na=False)]
    df = df[~df["email"].apply(is_admin_email)]
    df["created_at"] = parse_date(df.get("created_at"))
    df = df.dropna(subset=["created_at"])
    cutoff = pd.Timestamp.now() - pd.Timedelta(days=days)
    df = df[df["created_at"] >= cutoff]
    if q.strip():
        df = df[df["email"].str.contains(q.strip(), case=False, na=False)]
    # カテゴリ
    df["category"] = df.get("path", "").astype(str).map(path_category)
    # セッション
    sessions = compute_sessions(df[["email","created_at","path"]], threshold_minutes=gap)
    if sessions.empty:
        st.info("対象期間にセッションがありません。")
        return
    # Pivot 1: ユーザー×日 セッション数
    sessions["day"] = sessions["start"].dt.date
    p1 = sessions.pivot_table(index="email", columns="day", values="session_id", aggfunc="count", fill_value=0)
    st.markdown("#### ユーザー × 日 セッション数")
    st.dataframe(p1, use_container_width=True, height=320)
    heat1 = alt.Chart(p1.reset_index().melt(id_vars=["email"], var_name="day", value_name="sessions")).mark_rect().encode(
        x=alt.X("day:O", title="日付", axis=alt.Axis(format="%m/%d")),
        y=alt.Y("email:N", title="ユーザー"),
        color=alt.Color("sessions:Q", title="セッション数", scale=alt.Scale(scheme="blues")),
        tooltip=["email","day","sessions"],
    ).properties(height=max(360, len(p1.index)*14))
    st.altair_chart(heat1, use_container_width=True)
    # Pivot 2: ユーザー×日 平均滞在時間
    p2 = sessions.pivot_table(index="email", columns="day", values="duration_minutes", aggfunc="mean", fill_value=0.0)
    st.markdown("#### ユーザー × 日 平均滞在時間(分)")
    st.dataframe(p2.round(1), use_container_width=True, height=320)
    heat2 = alt.Chart(p2.reset_index().melt(id_vars=["email"], var_name="day", value_name="mins")).mark_rect().encode(
        x=alt.X("day:O", title="日付", axis=alt.Axis(format="%m/%d")),
        y=alt.Y("email:N", title="ユーザー"),
        color=alt.Color("mins:Q", title="分", scale=alt.Scale(scheme="greens")),
        tooltip=["email","day","mins"],
    ).properties(height=max(360, len(p2.index)*14))
    st.altair_chart(heat2, use_container_width=True)
    # Pivot 3: カテゴリ × 日 PV
    df["day"] = df["created_at"].dt.date
    p3 = df.pivot_table(index="category", columns="day", values="path", aggfunc="count", fill_value=0)
    st.markdown("#### カテゴリ × 日 PV")
    st.dataframe(p3, use_container_width=True, height=280)
    heat3 = alt.Chart(p3.reset_index().melt(id_vars=["category"], var_name="day", value_name="pv")).mark_rect().encode(
        x=alt.X("day:O", title="日付", axis=alt.Axis(format="%m/%d")),
        y=alt.Y("category:N", title="カテゴリ"),
        color=alt.Color("pv:Q", title="PV", scale=alt.Scale(scheme="oranges")),
        tooltip=["category","day","pv"],
    ).properties(height=220)
    st.altair_chart(heat3, use_container_width=True)
    # Top paths
    st.markdown("#### よく見られたパス（Top 50）")
    top_paths = df["path"].astype(str).value_counts().head(50).reset_index()
    top_paths.columns = ["path","pv"]
    st.dataframe(top_paths, use_container_width=True, height=280)
    st.download_button(
        "ピボット結果をCSVでダウンロード（p1: sessions, p2: duration, p3: category）",
        data=pd.concat(
            [
                p1.reset_index().melt(id_vars=["email"], var_name="day", value_name="sessions").assign(table="p1"),
                p2.reset_index().melt(id_vars=["email"], var_name="day", value_name="duration_minutes").assign(table="p2"),
                p3.reset_index().melt(id_vars=["category"], var_name="day", value_name="pv").assign(table="p3"),
            ],
            ignore_index=True
        ).to_csv(index=False).encode("utf-8"),
        file_name="pv_pivots.csv",
        mime="text/csv",
        use_container_width=True
    )

def ai_tab():
    st.subheader("AI 集計アシスタント")
    # OpenAI import可否
    try:
        from openai import OpenAI  # type: ignore
    except Exception:
        OpenAI = None  # type: ignore
    api_key = st.text_input("OpenAI API Key を入力", type="password", value=st.session_state.get("OPENAI_API_KEY", ""))
    if api_key:
        st.session_state["OPENAI_API_KEY"] = api_key
    if OpenAI is None:
        st.warning("openai パッケージが見つかりません。requirements.txt に openai を追加し、依存を再インストールしてください。")
        return
    if not api_key:
        st.info("API Key を入力すると分析を実行できます。")
        return
    # 利用可能なデータセット
    ds_specs = [
        ("users_full_summary.csv", AGG_DIR / "users_full_summary.csv"),
        ("boards_summary.csv", AGG_DIR / "boards_summary.csv"),
        ("market_summary.csv", AGG_DIR / "market_summary.csv"),
        ("pageviews_by_user.csv", AGG_DIR / "pageviews_by_user.csv"),
        ("board_posts.csv (raw)", EXPORT_DIR / "board_posts.csv"),
        ("board_replies.csv (raw)", EXPORT_DIR / "board_replies.csv"),
        ("board_visits.csv (raw)", EXPORT_DIR / "board_visits.csv"),
        ("market_items.csv (raw)", EXPORT_DIR / "market_items.csv"),
        ("course_summaries.csv (raw)", EXPORT_DIR / "course_summaries.csv"),
        ("circle_summaries.csv (raw)", EXPORT_DIR / "circle_summaries.csv"),
        ("page_views.csv (raw)", EXPORT_DIR / "page_views.csv"),
    ]
    st.markdown("#### 解析に渡すデータセットを選択")
    cols = st.columns(3)
    selected = []
    for i, (label, path) in enumerate(ds_specs):
        with cols[i % 3]:
            # デフォルト選択: 必須級RAW + 主要RAW + pageviews_by_user
            fname = path.name.lower()
            default_names = {
                "page_views.csv",
                "board_posts.csv",
                "board_replies.csv",
                "board_visits.csv",
                "market_items.csv",
                "course_summaries.csv",
                "circle_summaries.csv",
            }
            default_checked = (fname in default_names) or ("pageviews_by_user" in fname)
            if path.exists() and st.checkbox(label, value=default_checked, key=f"ai_ds_{i}"):
                selected.append((label, path))
    max_rows = st.slider("各データセットの最大行数（サンプル）", 50, 2000, 300, step=50)
    def df_profile_text(df: pd.DataFrame, name: str) -> str:
        # 旧: 生データを渡す。→ トークン効率のため廃止（最小限メタ情報のみ）
        if df.empty:
            return f"- {name}: 0 rows\n"
        return f"- {name}: {df.shape[0]} rows, {df.shape[1]} cols, cols={list(df.columns)}\n"

    def fmt_section(title: str, lines: list[str]) -> str:
        return "## " + title + "\n" + "\n".join([f"- {ln}" for ln in lines]) + "\n"

    def build_marketing_brief(bundles: list[tuple[str, pd.DataFrame]], topn: int, days: int, gap_min: int) -> str:
        # 可能な限り多角的なKPIとTopを凝縮したブリーフィングを生成（マーケ視点）
        # 存在判定
        dfs = {name: df for name, df in bundles}
        lines = []
        sections = []
        # 概要（ユーザー・PV）
        pv = dfs.get("page_views.csv (raw)", pd.DataFrame())
        if not pv.empty:
            tmp = pv.copy()
            tmp["email"] = tmp.get("email", "").astype(str).map(normalize_email)
            tmp = tmp[tmp["email"].str.contains("@", na=False)]
            tmp = tmp[~tmp["email"].apply(is_admin_email)]
            tmp["created_at"] = parse_date(tmp.get("created_at"))
            tmp = tmp.dropna(subset=["created_at"])
            cutoff = pd.Timestamp.now() - pd.Timedelta(days=days)
            pv_d = tmp[tmp["created_at"] >= cutoff]
            dau = pv_d.assign(day=pv_d["created_at"].dt.date).groupby("day")["email"].nunique()
            wau = pv_d.assign(week=pv_d["created_at"].dt.to_period("W")).groupby("week")["email"].nunique()
            sections.append(fmt_section("概要(KPI)",
                [
                    f"対象期間: 過去{days}日",
                    f"総PV: {len(pv_d):,}",
                    f"ユニークユーザー(期間内): {pv_d['email'].nunique():,}",
                    f"平均DAU: {dau.mean():.1f} (最近のDAU: {dau.tail(1).mean() if len(dau)>0 else 0:.0f})",
                    f"平均WAU: {wau.mean():.1f}",
                ]
            ))
            # カテゴリ別PV
            cat = pv_d["path"].astype(str).map(path_category).value_counts().to_dict()
            sections.append(fmt_section("カテゴリ別PV構成", [f"{k}: {v:,}" for k, v in cat.items()]))
            # セッション概要
            sess = compute_sessions(pv_d[["email","created_at","path"]], threshold_minutes=gap_min)
            if not sess.empty:
                sections.append(fmt_section("セッションKPI",
                    [
                        f"セッション数: {len(sess):,}",
                        f"平均滞在(分): {sess['duration_minutes'].mean():.1f} / 中央値: {sess['duration_minutes'].median():.1f}",
                        f"平均PV/セッション: {sess['pageviews'].mean():.1f}",
                        f"ユニーク投稿閲覧(合計): {int(sess['unique_board_posts'].sum())}",
                        f"ユニークMarket閲覧(合計): {int(sess['unique_market_items'].sum())}",
                    ]
                ))
        # 掲示板
        posts = dfs.get("board_posts.csv (raw)", pd.DataFrame())
        replies = dfs.get("board_replies.csv (raw)", pd.DataFrame())
        visits = dfs.get("board_visits.csv (raw)", pd.DataFrame())
        if not posts.empty:
            p = posts.copy()
            p["created_at"] = parse_date(p.get("created_at"))
            p = p.dropna(subset=["created_at"])
            p = p[p["created_at"] >= pd.Timestamp.now() - pd.Timedelta(days=days)]
            top_boards = p["board_id"].value_counts().head(topn)
            sections.append(fmt_section("掲示板(投稿)",
                [
                    f"投稿数(期間): {len(p):,}",
                    "Top Boards: " + ", ".join([f"{int(i)}({c})" for i, c in top_boards.items()]),
                ]
            ))
        if not replies.empty:
            r = replies.copy()
            r["created_at"] = parse_date(r.get("created_at"))
            r = r.dropna(subset=["created_at"])
            r = r[r["created_at"] >= pd.Timestamp.now() - pd.Timedelta(days=days)]
            sections.append(fmt_section("掲示板(返信)",
                [
                    f"返信数(期間): {len(r):,}",
                ]
            ))
            # 返信までの時間
            if not posts.empty:
                pr = posts[["id","created_at"]].copy()
                pr["post_ts"] = parse_date(pr["created_at"])
                rr = r[["post_id","created_at"]].copy()
                rr["reply_ts"] = parse_date(rr["created_at"])
                fr = rr.sort_values("reply_ts").dropna(subset=["reply_ts"]).groupby("post_id").first().reset_index()
                mg = pr.merge(fr, left_on="id", right_on="post_id", how="inner")
                mg["mins"] = (mg["reply_ts"] - mg["post_ts"]).dt.total_seconds() / 60
                if not mg.empty:
                    sections.append(fmt_section("初返信までの時間",
                        [
                            f"平均(分): {mg['mins'].mean():.1f}, 中央値: {mg['mins'].median():.1f}",
                        ]
                    ))
        # マーケット
        market = dfs.get("market_items.csv (raw)", pd.DataFrame())
        if not market.empty:
            m = market.copy()
            m["created_at"] = parse_date(m.get("created_at"))
            m = m.dropna(subset=["created_at"])
            m = m[m["created_at"] >= pd.Timestamp.now() - pd.Timedelta(days=days)]
            m["price"] = pd.to_numeric(m.get("price", 0), errors="coerce").fillna(0)
            sections.append(fmt_section("マーケット",
                [
                    f"出品数(期間): {len(m):,}",
                    f"価格中央値: {m['price'].median():.0f}, 平均: {m['price'].mean():.0f}",
                ]
            ))
            if "type" in m.columns:
                top_types = m["type"].astype(str).value_counts().head(topn)
                sections.append(fmt_section("出品種別 上位",
                    [f"{k}: {v}" for k, v in top_types.items()]
                ))
        # 授業/サークル
        course = dfs.get("course_summaries.csv (raw)", pd.DataFrame())
        circle = dfs.get("circle_summaries.csv (raw)", pd.DataFrame())
        if not course.empty:
            c = course.copy()
            if "created_at" in c.columns:
                c["created_at"] = parse_date(c["created_at"])
            else:
                c["created_at"] = pd.NaT
            c = c.dropna(subset=["created_at"])
            c = c[c["created_at"] >= pd.Timestamp.now() - pd.Timedelta(days=days)]
            sections.append(fmt_section("授業まとめ",
                [f"投稿数(期間): {len(c):,}"]
            ))
        if not circle.empty:
            cc = circle.copy()
            if "created_at" in cc.columns:
                cc["created_at"] = parse_date(cc["created_at"])
            else:
                cc["created_at"] = pd.NaT
            cc = cc.dropna(subset=["created_at"])
            cc = cc[cc["created_at"] >= pd.Timestamp.now() - pd.Timedelta(days=days)]
            sections.append(fmt_section("サークルまとめ",
                [f"投稿数(期間): {len(cc):,}"]
            ))
        # ファネル（ユーザー単位）
        if not pv.empty:
            users_pv = set(pv_d["email"].unique()) if not pv.empty else set()
            users_visit = set()
            if not visits.empty:
                vv = visits.copy()
                if "email" in vv.columns:
                    vv["email"] = vv["email"].astype(str).map(normalize_email)
                else:
                    vv["email"] = pd.Series([""] * len(vv), index=vv.index)
                vv = vv[vv["email"].str.contains("@", na=False)]
                vv = vv[~vv["email"].apply(is_admin_email)]
                if "created_at" in vv.columns:
                    vv["created_at"] = parse_date(vv["created_at"])
                else:
                    vv["created_at"] = pd.NaT
                vv = vv.dropna(subset=["created_at"])
                vv = vv[vv["created_at"] >= pd.Timestamp.now() - pd.Timedelta(days=days)]
                users_visit = set(vv["email"].unique()) if "email" in vv.columns else set()
            users_post = set()
            if not posts.empty:
                pp = posts.copy()
                if "author_email" in pp.columns:
                    base_email = pp["author_email"]
                elif "email" in pp.columns:
                    base_email = pp["email"]
                else:
                    base_email = pd.Series([""] * len(pp), index=pp.index)
                pp["email"] = base_email.astype(str).map(normalize_email)
                pp = pp[pp["email"].str.contains("@", na=False)]
                pp = pp[~pp["email"].apply(is_admin_email)]
                if "created_at" in pp.columns:
                    pp["created_at"] = parse_date(pp["created_at"])
                else:
                    pp["created_at"] = pd.NaT
                pp = pp.dropna(subset=["created_at"])
                pp = pp[pp["created_at"] >= pd.Timestamp.now() - pd.Timedelta(days=days)]
                users_post = set(pp["email"].unique()) if "email" in pp.columns else set()
            users_reply = set()
            if not replies.empty:
                rr = replies.copy()
                if "author_email" in rr.columns:
                    base_email_r = rr["author_email"]
                elif "email" in rr.columns:
                    base_email_r = rr["email"]
                else:
                    base_email_r = pd.Series([""] * len(rr), index=rr.index)
                rr["email"] = base_email_r.astype(str).map(normalize_email)
                rr = rr[rr["email"].str.contains("@", na=False)]
                rr = rr[~rr["email"].apply(is_admin_email)]
                if "created_at" in rr.columns:
                    rr["created_at"] = parse_date(rr["created_at"])
                else:
                    rr["created_at"] = pd.NaT
                rr = rr.dropna(subset=["created_at"])
                rr = rr[rr["created_at"] >= pd.Timestamp.now() - pd.Timedelta(days=days)]
                users_reply = set(rr["email"].unique()) if "email" in rr.columns else set()
            users_market = set()
            if not market.empty:
                mm = market.copy()
                if "email" in mm.columns:
                    mm["email"] = mm["email"].astype(str).map(normalize_email)
                else:
                    mm["email"] = pd.Series([""] * len(mm), index=mm.index)
                mm = mm[mm["email"].str.contains("@", na=False)]
                mm = mm[~mm["email"].apply(is_admin_email)]
                if "created_at" in mm.columns:
                    mm["created_at"] = parse_date(mm["created_at"])
                else:
                    mm["created_at"] = pd.NaT
                mm = mm.dropna(subset=["created_at"])
                mm = mm[mm["created_at"] >= pd.Timestamp.now() - pd.Timedelta(days=days)]
                users_market = set(mm["email"].unique()) if "email" in mm.columns else set()
            def rate(a, b):
                return 0 if b == 0 else 100.0 * a / b
            sections.append(fmt_section("ユーザーファネル(期間内一度以上)",
                [
                    f"PVユーザー: {len(users_pv)}",
                    f"→ Board閲覧: {len(users_visit)} ({rate(len(users_visit), len(users_pv)):.1f}%)",
                    f"→ 投稿: {len(users_post)} ({rate(len(users_post), len(users_visit)):.1f}%)",
                    f"→ 返信: {len(users_reply)} ({rate(len(users_reply), len(users_post)):.1f}%)",
                    f"→ Market出品: {len(users_market)} ({rate(len(users_market), len(users_pv)):.1f}%)",
                ]
            ))
        # Topセグメント（メールはそのまま出す想定）
        if not posts.empty:
            posters = posts.get("author_email", posts.get("email", pd.Series(dtype=str))).astype(str).map(normalize_email).value_counts().head(topn)
            sections.append(fmt_section("Top投稿者", [f"{k}: {v}" for k, v in posters.items()]))
        if not market.empty:
            sellers = market.get("email", pd.Series(dtype=str)).astype(str).map(normalize_email).value_counts().head(topn)
            sections.append(fmt_section("Top出品者", [f"{k}: {v}" for k, v in sellers.items()]))
        # 最後に、データセットのメタ概要
        meta = "### datasets\n" + "".join([df_profile_text(df, name) for name, df in bundles])
        return "\n".join(sections) + "\n" + meta
    # データを読み込み
    bundles = []
    for label, path in selected:
        df = load_csv(path)
        if "email" in df.columns:
            df["email"] = df["email"].astype(str).map(normalize_email)
        if "created_at" in df.columns:
            df["created_at"] = parse_date(df["created_at"])
        bundles.append((label, df))
    # 役割ごとの指示
    roles = [
        ("データ品質監査官", "欠損・外れ値・重複・整合性・偏り・サンプルサイズの妥当性を確認し、改善提案を出して。"),
        ("エンゲージメント分析官", "活性ユーザーの特徴、継続・休眠の傾向、時間帯や曜日の傾向を特定して。"),
        ("掲示板分析官", "投稿/返信/訪問の関係、ボード別の偏り、反応を生む要素を特定し、改善提案を。"),
        ("マーケット分析官", "価格帯やカテゴリの分布、反応しやすい出品、潜在ニーズを推定し、施策を提案。"),
        ("授業/サークル分析官", "レビュー/サマリの傾向、活用シナリオ、追加すべきコンテンツを提案。"),
        ("グロース責任者", "上記全てを統合し、具体的アクションプラン（KPI・フェーズ・優先度）を箇条書きで提示。"),
    ]
    # 実行
    st.markdown("#### ブリーフィング設定")
    colb1, colb2, colb3 = st.columns(3)
    with colb1:
        brief_days = st.slider("分析対象期間(日)", 7, 180, 60, key="ai_brief_days")
    with colb2:
        brief_topn = st.slider("TopN", 3, 30, 10, key="ai_brief_topn")
    with colb3:
        brief_gap = st.slider("セッション区切り(分)", 5, 120, 30, step=5, key="ai_brief_gap")
    if st.button("AI分析を実行", type="primary", use_container_width=True):
        client = OpenAI(api_key=api_key)  # type: ignore
        # マーケ向けブリーフィングを構築して渡す（生データは渡さない）
        context = build_marketing_brief(bundles, topn=brief_topn, days=brief_days, gap_min=brief_gap)
        outputs = []
        progress = st.progress(0.0, text="分析中…")
        for idx, (role, instruction) in enumerate(roles, start=1):
            prompt = f"""あなたは {role} です。以下のマーケティング・ブリーフィングを読み、{instruction}
制約:
- 根拠（KPI名・指標・具体値）を明示
- 見出し＋箇条書きで、できるだけ簡潔に（最大600〜900日本語トークン）
- 最後に「即実行(1週間)」「短期(1ヶ月)」「中期(1-3ヶ月)」のアクションを箇条書きで列挙

マーケティング・ブリーフィング（KPI/Top/ファネル/期間={brief_days}日, TopN={brief_topn}）:
{context}
"""
            try:
                resp = client.chat.completions.create(  # type: ignore
                    model="gpt-4o-mini",
                    messages=[
                        {"role": "system", "content": "あなたは冷静で厳密なデータアナリストです。"},
                        {"role": "user", "content": prompt},
                    ],
                    temperature=0.3,
                )
                text = resp.choices[0].message.content if resp and resp.choices else "(no response)"
            except Exception as e:
                text = f"(error) {e}"
            outputs.append((role, text))
            progress.progress(idx / len(roles))
        progress.empty()
        # 2ndパス: 総合レポート（マルチエージェントの統合と優先順位付け）
        synthesis_prompt = f"""あなたはチーフ・アナリストです。以下の複数アナリストの所見を統合し、
- 5つのキーハイライト
- KPIサマリ（重要指標と現状、過去{brief_days}日の要点）
- 優先アクション: 即実行/短期/中期（最大5件ずつ、担当/難易度/期待効果を括弧に）
- 実験案バックログ（仮説・測定指標・成功基準）
- リスク/留意点（データ品質/倫理/運用）
を日本語で簡潔に作成してください。

マーケティング・ブリーフィング:
{context}

各アナリスト所見:
""" + "\n\n".join([f"### {r}\n{text}" for r, text in outputs])
        try:
            synth = client.chat.completions.create(  # type: ignore
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": "あなたは厳密で行動志向のチーフ・アナリストです。"},
                    {"role": "user", "content": synthesis_prompt},
                ],
                temperature=0.25,
            )
            synthesis_text = synth.choices[0].message.content if synth and synth.choices else "(no synthesis)"
        except Exception as e:
            synthesis_text = f"(synthesis error) {e}"
        # 表示
        for role, text in outputs:
            st.markdown(f"### {role}")
            st.markdown(text or "")
        st.markdown("### エグゼクティブ統合レポート")
        st.markdown(synthesis_text or "")
        # ダウンロード
        md_agents = "\n\n".join([f"## {r}\n\n{text}" for r, text in outputs])
        md_full = "# エグゼクティブ統合レポート\n\n" + (synthesis_text or "") + "\n\n---\n\n" + md_agents
        st.download_button("統合レポート(Markdown)をダウンロード", data=md_full.encode("utf-8"), file_name="ai_report.md", mime="text/markdown", use_container_width=True)
        st.download_button("エージェント別結果(Markdown)をダウンロード", data=md_agents.encode("utf-8"), file_name="ai_agents.md", mime="text/markdown", use_container_width=True)

def main():
    st.set_page_config(page_title="URIV Analytics", page_icon="📊", layout="wide")
    ensure_dirs()

    st.sidebar.title("データ操作")
    if st.sidebar.button("最新データを取得して集計", type="primary", use_container_width=True):
        with st.spinner("取得・集計中..."):
            run_fetch()
        st.success("最新データに更新しました。")
        st.rerun()

    tab_names = ["Overview", "Users", "Boards", "Market", "Engagement", "Sessions", "AI", "Admins"]
    tabs = st.tabs(tab_names)
    with tabs[0]:
        overview_tab()
    with tabs[1]:
        users_tab()
    with tabs[2]:
        boards_tab()
    with tabs[3]:
        market_tab()
    with tabs[4]:
        engagement_tab()
    with tabs[5]:
        sessions_tab()
    with tabs[6]:
        ai_tab()
    with tabs[7]:
        admins_tab()

if __name__ == "__main__":
    main()

