# 📊 URIV データベース設計書（本番環境用）

## 🎯 設計方針

### スケーラビリティ
- **想定ユーザー数**: 初期 100人 → 1年後 10,000人
- **想定投稿数**: 1日 100件 → 1日 1,000件
- **データ保持期間**: 無期限（削除機能あり）

### パフォーマンス目標
- **投稿取得**: 100ms以内
- **投稿作成**: 200ms以内
- **いいね処理**: 50ms以内

---

## 📋 テーブル設計

### 1. users テーブル（ユーザー情報）

```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE,              -- メールアドレス（任意）
    anonymous_name VARCHAR(100) NOT NULL,    -- 固定匿名名
    university VARCHAR(255),                 -- 大学名
    year VARCHAR(20),                        -- 学年（例: "2年"）
    department VARCHAR(100),                 -- 学部（例: "工学部"）
    is_verified BOOLEAN DEFAULT FALSE,       -- メール認証済みか
    verification_code VARCHAR(255),          -- 認証コード
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_university ON users(university);
CREATE INDEX idx_users_created_at ON users(created_at DESC);
```

**想定データ量**:
- 初期: 100ユーザー → 10KB
- 1年後: 10,000ユーザー → 1MB
- 3年後: 100,000ユーザー → 10MB

---

### 2. board_posts テーブル（掲示板投稿）

```sql
CREATE TABLE board_posts (
    id SERIAL PRIMARY KEY,
    board_id VARCHAR(50) NOT NULL,          -- 掲示板ID
    content TEXT NOT NULL,                   -- 投稿内容
    author_id INTEGER NOT NULL,
    author_name VARCHAR(100) NOT NULL,
    like_count INTEGER DEFAULT 0,
    reply_count INTEGER DEFAULT 0,
    view_count INTEGER DEFAULT 0,           -- 閲覧数
    is_deleted BOOLEAN DEFAULT FALSE,        -- 論理削除
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
);

-- インデックス（重要！）
CREATE INDEX idx_board_posts_board_id ON board_posts(board_id);
CREATE INDEX idx_board_posts_created_at ON board_posts(created_at DESC);
CREATE INDEX idx_board_posts_author_id ON board_posts(author_id);
CREATE INDEX idx_board_posts_like_count ON board_posts(like_count DESC);

-- 複合インデックス（パフォーマンス向上）
CREATE INDEX idx_board_posts_board_created ON board_posts(board_id, created_at DESC);
CREATE INDEX idx_board_posts_board_likes ON board_posts(board_id, like_count DESC);
```

**想定データ量**:
- 1日100件 × 365日 = 36,500件/年
- 3年後: 約100,000件 → 50MB

---

### 3. board_replies テーブル（返信）

```sql
CREATE TABLE board_replies (
    id SERIAL PRIMARY KEY,
    post_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    author_id INTEGER NOT NULL,
    author_name VARCHAR(100) NOT NULL,
    like_count INTEGER DEFAULT 0,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (post_id) REFERENCES board_posts(id) ON DELETE CASCADE,
    FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
);

-- インデックス
CREATE INDEX idx_board_replies_post_id ON board_replies(post_id);
CREATE INDEX idx_board_replies_created_at ON board_replies(created_at);
CREATE INDEX idx_board_replies_author_id ON board_replies(author_id);

-- 複合インデックス
CREATE INDEX idx_board_replies_post_created ON board_replies(post_id, created_at);
```

**想定データ量**:
- 1投稿あたり平均3コメント
- 年間: 約100,000件 → 30MB

---

### 4. いいねテーブル群

```sql
-- 投稿へのいいね
CREATE TABLE board_post_likes (
    id SERIAL PRIMARY KEY,
    post_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (post_id) REFERENCES board_posts(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(post_id, user_id)  -- 重複防止
);

-- 重要！複合インデックス
CREATE INDEX idx_board_post_likes_post_user ON board_post_likes(post_id, user_id);
CREATE INDEX idx_board_post_likes_user_id ON board_post_likes(user_id);

-- 返信へのいいね
CREATE TABLE board_reply_likes (
    id SERIAL PRIMARY KEY,
    reply_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (reply_id) REFERENCES board_replies(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(reply_id, user_id)  -- 重複防止
);

CREATE INDEX idx_board_reply_likes_reply_user ON board_reply_likes(reply_id, user_id);
CREATE INDEX idx_board_reply_likes_user_id ON board_reply_likes(user_id);
```

---

### 5. market_items テーブル（マーケット商品）

```sql
CREATE TABLE market_items (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    type VARCHAR(20) NOT NULL,              -- buy/sell/free
    price INTEGER,
    condition VARCHAR(20) NOT NULL,
    category VARCHAR(100) NOT NULL,
    images TEXT,                             -- JSON配列
    author_id INTEGER NOT NULL,
    author_name VARCHAR(100) NOT NULL,
    contact_method VARCHAR(20) NOT NULL,
    is_available BOOLEAN DEFAULT TRUE,
    view_count INTEGER DEFAULT 0,
    like_count INTEGER DEFAULT 0,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
);

-- インデックス
CREATE INDEX idx_market_items_type ON market_items(type);
CREATE INDEX idx_market_items_category ON market_items(category);
CREATE INDEX idx_market_items_created_at ON market_items(created_at DESC);
CREATE INDEX idx_market_items_price ON market_items(price);
CREATE INDEX idx_market_items_author_id ON market_items(author_id);

-- 複合インデックス（検索パフォーマンス向上）
CREATE INDEX idx_market_items_type_available ON market_items(type, is_available);
CREATE INDEX idx_market_items_category_available ON market_items(category, is_available);
CREATE INDEX idx_market_items_type_created ON market_items(type, created_at DESC);

-- 全文検索用（PostgreSQL）
CREATE INDEX idx_market_items_title_gin ON market_items USING gin(to_tsvector('japanese', title));
CREATE INDEX idx_market_items_desc_gin ON market_items USING gin(to_tsvector('japanese', description));
```

---

## 🚀 スケーラビリティ対策

### 1. インデックス戦略

#### 現在の問題
```sql
-- ❌ インデックスなし
SELECT * FROM board_post_likes WHERE post_id = 1 AND user_id = 100;
→ フルスキャン（遅い）
```

#### 改善後
```sql
-- ✅ 複合インデックスあり
CREATE INDEX idx_board_post_likes_post_user ON board_post_likes(post_id, user_id);
→ インデックススキャン（速い）
```

### 2. 論理削除

物理削除ではなく論理削除を使用：
```sql
is_deleted BOOLEAN DEFAULT FALSE
```

**メリット**:
- データを復元可能
- 統計分析に使える
- トラブル時の調査が容易

### 3. パーティショニング（将来的に）

データ量が増えたら（10万件以上）：
```sql
-- 月ごとにパーティション
CREATE TABLE board_posts_2025_10 PARTITION OF board_posts
    FOR VALUES FROM ('2025-10-01') TO ('2025-11-01');
```

---

## 💾 PostgreSQL vs SQLite 比較

| 項目 | SQLite | PostgreSQL |
|-----|--------|-----------|
| 同時接続 | 制限あり | 無制限 |
| データ量 | 〜数GB | 数TB可能 |
| 全文検索 | 基本的 | 高機能 |
| レプリケーション | なし | あり |
| 本番利用 | ❌ | ✅ |
| 開発利用 | ✅ | ✅ |

**結論**: 本番は必ずPostgreSQLを使用！

---

## 🔢 データ量の試算

### ユーザー数予測
```
初期: 100人
3ヶ月: 500人
6ヶ月: 2,000人
1年: 10,000人
```

### 投稿数予測
```
1日あたり:
- 初期: 50投稿
- 3ヶ月: 200投稿
- 6ヶ月: 500投稿
- 1年: 1,000投稿

累計（1年後）:
- 投稿: 約150,000件 → 75MB
- 返信: 約300,000件 → 90MB
- いいね: 約500,000件 → 10MB
- 合計: 約200MB（余裕）
```

**結論**: PostgreSQLの無料枠（Supabase: 500MB）で十分！

---

## 🎯 本番環境への移行手順

### Phase 1: PostgreSQL対応（必須）

1. **Supabaseアカウント作成**（無料）
2. **PostgreSQLデータベース作成**
3. **環境変数を設定**
```bash
DATABASE_URL=postgresql://user:pass@host:5432/uriv_db
```
4. **マイグレーション実行**
```bash
cd backend
alembic init migrations
alembic revision --autogenerate -m "Initial migration"
alembic upgrade head
```

### Phase 2: インデックス最適化

`database.py`に追加実装：
```python
# 起動時にインデックスを作成（PostgreSQLのみ）
if not DATABASE_URL.startswith("sqlite"):
    engine.execute("""
        CREATE INDEX IF NOT EXISTS idx_board_post_likes_composite 
        ON board_post_likes(post_id, user_id);
    """)
```

### Phase 3: デプロイ

1. **Vercel** (フロントエンド)
2. **Render** (バックエンド)
3. **Supabase** (PostgreSQL)

---

## 📈 パフォーマンス最適化

### 1. N+1問題の解決

現在のコード:
```python
# ❌ N+1問題
for post in posts:
    post.author  # 各投稿ごとにクエリ発行
```

改善:
```python
# ✅ 一括取得
posts = db.query(BoardPost).options(
    joinedload(BoardPost.author)
).all()
```

### 2. ページネーション

現在: `limit/offset`方式（実装済み） ✅

大量データ向け改善案:
```python
# カーソルベースページネーション
# 最後のIDを使って次を取得
.filter(BoardPost.id < last_id).limit(20)
```

### 3. キャッシング

Redis導入（将来的に）:
```python
# 人気投稿をキャッシュ
@cache(expire=300)  # 5分間キャッシュ
def get_popular_posts():
    ...
```

---

## 🗂️ 推奨データベース構成

### 開発環境
```yaml
データベース: SQLite（backend/uriv.db）
用途: ローカル開発・テスト
```

### ステージング環境
```yaml
データベース: PostgreSQL（Supabase無料枠）
URL: postgresql://...@db.supabase.co:5432/staging
用途: 本番前の動作確認
```

### 本番環境
```yaml
データベース: PostgreSQL（Supabase有料 or AWS RDS）
URL: postgresql://...@db.supabase.co:5432/production
バックアップ: 毎日自動
レプリケーション: あり（高可用性）
```

---

## 🔐 簡易登録システムの設計

### ユーザー登録フロー（認証なし版）

```
1. アクセス
   ↓
2. プロフィール入力画面
   - 学年選択（必須）
   - 学部選択（必須）
   - 大学選択（必須）
   - メールアドレス（任意）← 将来的な認証用
   ↓
3. ランダムIDを発行
   user_id: "usr_a1b2c3d4"
   ↓
4. localStorageに保存
   ↓
5. すぐに利用開始
```

### データ構造

```javascript
// localStorage
{
  user_id: "usr_a1b2c3d4",
  anonymous_name: "匿名ユーザー #A1B2",
  year: "2年",
  department: "工学部",
  university: "北海道大学",
  created_at: "2025-10-09T14:00:00Z"
}

// データベース（users テーブル）
{
  id: 1,
  email: null,                    // 初期はnull
  anonymous_name: "匿名ユーザー #A1B2",
  year: "2年",
  department: "工学部",
  university: "北海道大学",
  is_verified: false,
  created_at: "2025-10-09T14:00:00Z"
}
```

---

## 📊 データ分析用の設計

### 分析したい指標

#### ユーザー属性
```sql
-- 学年別ユーザー数
SELECT year, COUNT(*) FROM users GROUP BY year;

-- 学部別ユーザー数
SELECT department, COUNT(*) FROM users GROUP BY department;

-- 大学別ユーザー数
SELECT university, COUNT(*) FROM users GROUP BY university;
```

#### アクティビティ
```sql
-- 学部別投稿数
SELECT u.department, COUNT(bp.id) as post_count
FROM board_posts bp
JOIN users u ON bp.author_id = u.id
GROUP BY u.department
ORDER BY post_count DESC;

-- 学年別投稿数
SELECT u.year, COUNT(bp.id) as post_count
FROM board_posts bp
JOIN users u ON bp.author_id = u.id
GROUP BY u.year;
```

### 分析用ビューの作成

```sql
-- ユーザー統計ビュー
CREATE VIEW user_stats AS
SELECT 
    university,
    year,
    department,
    COUNT(*) as user_count,
    COUNT(CASE WHEN created_at > NOW() - INTERVAL '7 days' THEN 1 END) as new_users_week
FROM users
GROUP BY university, year, department;

-- 掲示板アクティビティビュー
CREATE VIEW board_activity AS
SELECT 
    board_id,
    DATE(created_at) as date,
    COUNT(*) as post_count,
    SUM(reply_count) as total_replies,
    SUM(like_count) as total_likes
FROM board_posts
GROUP BY board_id, DATE(created_at);
```

---

## 🔧 マイグレーション戦略

### SQLite → PostgreSQL 移行手順

#### 1. データエクスポート
```bash
# SQLiteからCSVにエクスポート
sqlite3 uriv.db
.mode csv
.output users.csv
SELECT * FROM users;
.output board_posts.csv
SELECT * FROM board_posts;
.quit
```

#### 2. PostgreSQLにインポート
```bash
# PostgreSQLにインポート
psql $DATABASE_URL
\copy users FROM 'users.csv' CSV HEADER;
\copy board_posts FROM 'board_posts.csv' CSV HEADER;
```

#### 3. シーケンス調整
```sql
-- IDシーケンスを調整
SELECT setval('users_id_seq', (SELECT MAX(id) FROM users));
SELECT setval('board_posts_id_seq', (SELECT MAX(id) FROM board_posts));
```

---

## 💰 コスト試算

### 無料で始める（推奨）

| サービス | プラン | 制限 | コスト |
|---------|-------|------|--------|
| Supabase PostgreSQL | 無料 | 500MB, 2GB転送/月 | ¥0 |
| Vercel | 無料 | 100GB帯域幅 | ¥0 |
| Render | 無料 | 750時間/月 | ¥0 |
| **合計** | - | - | **¥0/月** |

### スケールアップ時

| ユーザー数 | 月間コスト | 内訳 |
|-----------|-----------|------|
| 〜1,000人 | ¥0 | 無料枠内 |
| 〜5,000人 | ¥2,000 | DB ¥1,000 + サーバー ¥1,000 |
| 〜10,000人 | ¥5,000 | DB ¥2,000 + サーバー ¥3,000 |
| 10,000人〜 | ¥10,000〜 | スケール対応 |

---

## 🎯 推奨アクションプラン

### 今すぐやるべきこと（優先度：高）

#### 1. データベース設計の改善（30分）
- [ ] models.pyにインデックス追加
- [ ] UNIQUE制約追加（いいねテーブル）
- [ ] is_deleted カラム追加（論理削除）

#### 2. 簡易登録フローの実装（1時間）
- [ ] プロフィール入力画面
- [ ] 学年・学部・大学のドロップダウン
- [ ] 登録API実装

#### 3. PostgreSQL対応コードの準備（30分）
- [ ] 環境変数で切り替え可能に
- [ ] 接続プール設定
- [ ] マイグレーションスクリプト

### 公開前にやるべきこと（優先度：中）

#### 4. デプロイ準備（2時間）
- [ ] Supabaseでデータベース作成
- [ ] Vercelでフロントエンドデプロイ
- [ ] Renderでバックエンドデプロイ

#### 5. 基本的なドキュメント（1時間）
- [ ] 簡易利用規約
- [ ] プライバシーポリシー
- [ ] FAQ

---

## 📝 データベース改善の優先順位

### 必須（今すぐ）
1. ✅ **UNIQUE制約追加**（いいね重複防止）
2. ✅ **複合インデックス追加**（パフォーマンス）
3. ✅ **学年・学部カラム追加**

### 推奨（公開前）
4. 📧 **メールアドレスをNULL許可に**
5. 🗑️ **is_deleted カラム追加**
6. 📊 **view_count カラム追加**（掲示板投稿にも）

### オプション（公開後）
7. 🔍 **全文検索インデックス**（PostgreSQLのみ）
8. 📈 **パーティショニング**（10万件超えたら）
9. 💾 **レプリケーション**（高可用性）

---

## 🚀 まとめ：本番公開への道のり

### ステップ1: データベース改善（今日）
- インデックス追加
- UNIQUE制約追加
- 学年・学部カラム追加

### ステップ2: 簡易登録実装（明日）
- プロフィール入力画面
- 10秒で完了する登録フロー

### ステップ3: PostgreSQL移行（今週）
- Supabaseでデータベース作成
- 環境変数設定
- テスト

### ステップ4: デプロイ（今週末）
- Vercel + Render + Supabase
- URLを友達にシェア
- フィードバック収集

---

**この順番で進めれば、1週間以内にテスト公開できます！**

まずはどこから始めますか？
1. データベース改善（インデックス・UNIQUE制約）
2. 簡易登録画面の実装
3. PostgreSQL移行準備
