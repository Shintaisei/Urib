import os
from pathlib import Path
import pandas as pd
import streamlit as st
import altair as alt

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

def bar(df: pd.DataFrame, x: str, y: str, title: str = "", top_n: int | None = None):
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

def overview_tab():
    st.subheader("概要")
    users_full = load_csv(AGG_DIR / "users_full_summary.csv")
    pv = load_csv(AGG_DIR / "pageviews_by_user.csv")
    boards = load_csv(AGG_DIR / "boards_summary.csv")
    market = load_csv(AGG_DIR / "market_summary.csv")

    cols = st.columns(4)
    with cols[0]:
        st.metric("ユーザー数(集計行)", f"{len(users_full):,}")
    with cols[1]:
        total_posts = int(users_full.get("board_posts", pd.Series()).sum()) if not users_full.empty else 0
        st.metric("掲示板投稿数(総計)", f"{total_posts:,}")
    with cols[2]:
        act_30d = int(pv.get("active_days_30d", pd.Series()).sum()) if not pv.empty else 0
        st.metric("延アクティブ日数(30d)", f"{act_30d:,}")
    with cols[3]:
        m_items = int(market.get("items", pd.Series()).sum()) if not market.empty else 0
        st.metric("出品数(総計)", f"{m_items:,}")

    if not users_full.empty:
        left, right = st.columns(2)
        with left:
            st.markdown("#### 掲示板投稿 上位")
            chart = bar(users_full[["email","board_posts"]], x="email", y="board_posts", title="Top Posters", top_n=15)
            if chart is not None:
                st.altair_chart(chart, use_container_width=True)
        with right:
            st.markdown("#### 直近30日アクティブ日数 上位")
            if not pv.empty:
                chart = bar(pv[["email","active_days_30d"]], x="email", y="active_days_30d", title="Active Days (30d) Top", top_n=15)
                if chart is not None:
                    st.altair_chart(chart, use_container_width=True)

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
    q = st.text_input("メールアドレスでフィルタ", "")
    df = users_full.copy()
    for c in df.columns:
        if c not in ("email",):
            df[c] = pd.to_numeric(df[c], errors="ignore")
    if q:
        df = df[df["email"].astype(str).str.contains(q, case=False, na=False)]
    st.dataframe(df.sort_values("board_posts", ascending=False), use_container_width=True, height=420)
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

def boards_tab():
    st.subheader("掲示板 集計")
    boards = load_csv(AGG_DIR / "boards_summary.csv")
    if boards.empty:
        st.info("boards_summary.csv がありません。")
        return
    st.dataframe(boards, use_container_width=True, height=420)

def market_tab():
    st.subheader("マーケット 集計")
    market = load_csv(AGG_DIR / "market_summary.csv")
    if market.empty:
        st.info("market_summary.csv がありません。")
        return
    market = to_numeric(market, ["items","likes_given_items","likes_received_items"])
    st.dataframe(market.sort_values("items", ascending=False), use_container_width=True, height=420)
    st.markdown("#### 出品数 上位（棒グラフ）")
    chart = bar(market[["email","items"]], x="email", y="items", title="Items by User", top_n=15)
    if chart is not None:
        st.altair_chart(chart, use_container_width=True)

def engagement_tab():
    st.subheader("継続ログイン (PageViews)")
    pv = load_csv(AGG_DIR / "pageviews_by_user.csv")
    if pv.empty:
        st.info("pageviews_by_user.csv がありません。")
        return
    pv = to_numeric(pv, ["active_days_total","active_days_30d","active_days_7d","longest_streak_days","current_streak_days"])
    st.dataframe(
        pv.sort_values(["active_days_30d","current_streak_days"], ascending=[False, False]),
        use_container_width=True,
        height=420
    )
    st.markdown("#### 分布（直近30日アクティブ日数）")
    hist = alt.Chart(pv).mark_bar().encode(
        x=alt.X("active_days_30d:Q", bin=alt.Bin(maxbins=30), title="Active Days (30d)"),
        y=alt.Y("count()", title="Users"),
    ).properties(height=260)
    st.altair_chart(hist, use_container_width=True)

def main():
    st.set_page_config(page_title="URIV Analytics", page_icon="📊", layout="wide")
    ensure_dirs()

    st.sidebar.title("データ操作")
    if st.sidebar.button("最新データを取得して集計", type="primary", use_container_width=True):
        with st.spinner("取得・集計中..."):
            run_fetch()
        st.success("最新データに更新しました。")
        st.rerun()

    tab_names = ["Overview", "Users", "Boards", "Market", "Engagement"]
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

if __name__ == "__main__":
    main()

