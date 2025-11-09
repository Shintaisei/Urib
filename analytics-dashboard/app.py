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
    # 下部にデータ一覧
    with st.expander("データ一覧（market_summary）", expanded=False):
        st.dataframe(market.sort_values("items", ascending=False), use_container_width=True, height=420)

def engagement_tab():
    st.subheader("継続ログイン (PageViews)")
    pv = load_csv(AGG_DIR / "pageviews_by_user.csv")
    pv_raw = load_csv(EXPORT_DIR / "page_views.csv")
    if pv.empty:
        st.info("pageviews_by_user.csv がありません。")
        return
    # 管理者除外
    pv = pv[~pv["email"].astype(str).apply(is_admin_email)]
    pv = to_numeric(pv, ["active_days_total","active_days_30d","active_days_7d","longest_streak_days","current_streak_days"])
    st.markdown("#### 分布（直近30日アクティブ日数）")
    hist = alt.Chart(pv).mark_bar().encode(
        x=alt.X("active_days_30d:Q", bin=alt.Bin(maxbins=30), title="Active Days (30d)"),
        y=alt.Y("count()", title="Users"),
    ).properties(height=260)
    st.altair_chart(hist, use_container_width=True)
    # 全体: 日付 × 時間 帯のヒートマップ（周期性の把握）
    if not pv_raw.empty:
        st.markdown("#### 全体の周期性（日付 × 時間帯 ヒートマップ）")
        days_cal = st.slider("期間(日)", 7, 180, 90, key="pv_calendar_days")
        df_cal = pv_raw.copy()
        df_cal["email"] = df_cal.get("email", "").astype(str)
        df_cal = df_cal[~df_cal["email"].apply(is_admin_email)]
        df_cal["created_at"] = parse_date(df_cal.get("created_at"))
        df_cal = df_cal.dropna(subset=["created_at"])
        cutoff_cal = pd.Timestamp.now() - pd.Timedelta(days=days_cal)
        df_cal = df_cal[df_cal["created_at"] >= cutoff_cal]
        df_cal["date"] = df_cal["created_at"].dt.date
        df_cal["hour"] = df_cal["created_at"].dt.hour
        cal = df_cal.groupby(["date","hour"]).size().reset_index(name="pv")
        heat_cal = alt.Chart(cal).mark_rect().encode(
            x=alt.X("date:T", title="日付"),
            y=alt.Y("hour:O", title="時間帯(0-23)", sort=list(range(24))),
            color=alt.Color("pv:Q", title="PV", scale=alt.Scale(scheme="greens")),
            tooltip=list(cal.columns),
        ).properties(height=320)
        st.altair_chart(heat_cal, use_container_width=True)
    # ユーザー × 時間帯のヒートマップ（見やすさ重視）
    if not pv_raw.empty:
        st.markdown("#### ユーザー × 時間帯 ヒートマップ（PV頻度）")
        days = st.slider("期間(日)", 7, 120, 60, key="pv_heat_days_hour")
        topn = st.slider("表示ユーザー数（上位PV）", 10, 100, 40, step=5, key="pv_heat_topn_hour")
        df = pv_raw.copy()
        df["email"] = df.get("email", "").astype(str)
        df = df[~df["email"].apply(is_admin_email)]
        df["created_at"] = parse_date(df.get("created_at"))
        df = df.dropna(subset=["created_at"])
        cutoff = pd.Timestamp.now() - pd.Timedelta(days=days)
        df = df[df["created_at"] >= cutoff]
        df["hour"] = df["created_at"].dt.hour
        # 上位ユーザー抽出（期間内PV上位）
        tops = df.groupby("email").size().reset_index(name="pv").sort_values("pv", ascending=False).head(topn)["email"]
        df = df[df["email"].isin(tops)]
        # y軸を「総PV順」に整列
        totals = df.groupby("email").size().sort_values(ascending=False)
        email_order = totals.index.tolist()
        pivot = df.groupby(["email","hour"]).size().reset_index(name="pv")
        heat = alt.Chart(pivot).mark_rect().encode(
            x=alt.X("hour:O", title="時間帯(0-23)", sort=list(range(24))),
            y=alt.Y("email:N", title="ユーザー", sort=email_order),
            color=alt.Color("pv:Q", title="PV", scale=alt.Scale(scheme="blues")),
            tooltip=list(pivot.columns),
        ).properties(height=max(220, topn*10))
        st.altair_chart(heat, use_container_width=True)
        st.caption(f"表示中: {len(email_order)} ユーザー（要求上限 {topn}）")
        # 全体の時間帯分布（棒）
        total_per_hour = df.groupby("hour").size().reset_index(name="pv")
        bar_hour = alt.Chart(total_per_hour).mark_bar().encode(
            x=alt.X("hour:O", title="時間帯(0-23)", sort=list(range(24))),
            y=alt.Y("pv:Q", title="PV"),
            tooltip=list(total_per_hour.columns),
        ).properties(height=220, title="全体の時間帯分布")
        st.altair_chart(bar_hour, use_container_width=True)
    # 下部にデータ一覧
    with st.expander("データ一覧（pageviews_by_user）", expanded=False):
        st.dataframe(
            pv.sort_values(["active_days_30d","current_streak_days"], ascending=[False, False]),
            use_container_width=True,
            height=420
        )

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

def main():
    st.set_page_config(page_title="URIV Analytics", page_icon="📊", layout="wide")
    ensure_dirs()

    st.sidebar.title("データ操作")
    if st.sidebar.button("最新データを取得して集計", type="primary", use_container_width=True):
        with st.spinner("取得・集計中..."):
            run_fetch()
        st.success("最新データに更新しました。")
        st.rerun()

    tab_names = ["Overview", "Users", "Boards", "Market", "Engagement", "Admins"]
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
        admins_tab()

if __name__ == "__main__":
    main()

