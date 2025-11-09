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

