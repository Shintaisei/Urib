# 大学ドメインのリスト
UNIVERSITY_DOMAINS = [
    # 国立大学
    "hokudai.ac.jp",      # 北海道大学
    "u-tokyo.ac.jp",      # 東京大学
    "kyoto-u.ac.jp",      # 京都大学
    "osaka-u.ac.jp",      # 大阪大学
    "tohoku.ac.jp",       # 東北大学
    "nagoya-u.ac.jp",     # 名古屋大学
    "kyushu-u.ac.jp",     # 九州大学
    "hokkaido.ac.jp",     # 北海道大学（別ドメイン）
    "u-tokyo.ac.jp",      # 東京大学
    "kyoto-u.ac.jp",      # 京都大学
    "osaka-u.ac.jp",      # 大阪大学
    "tohoku.ac.jp",       # 東北大学
    "nagoya-u.ac.jp",     # 名古屋大学
    "kyushu-u.ac.jp",     # 九州大学
    "tsukuba.ac.jp",      # 筑波大学
    "kobe-u.ac.jp",       # 神戸大学
    "okayama-u.ac.jp",    # 岡山大学
    "hiroshima-u.ac.jp",  # 広島大学
    "chiba-u.ac.jp",      # 千葉大学
    "niigata-u.ac.jp",    # 新潟大学
    "kanazawa-u.ac.jp",   # 金沢大学
    "kumamoto-u.ac.jp",   # 熊本大学
    "yokohama-cu.ac.jp",  # 横浜市立大学
    "gakushuin.ac.jp",    # 学習院大学
    "icu.ac.jp",          # 国際基督教大学
    
    # 私立大学
    "waseda.ac.jp",       # 早稲田大学
    "keio.ac.jp",         # 慶應義塾大学
    "sophia.ac.jp",       # 上智大学
    "meiji.ac.jp",        # 明治大学
    "chuo.ac.jp",         # 中央大学
    "hoshi.ac.jp",        # 法政大学
    "rikkyo.ac.jp",       # 立教大学
    "aoyama.ac.jp",       # 青山学院大学
    "seikei.ac.jp",       # 成蹊大学
    "tamagawa.ac.jp",     # 玉川大学
    "tcu.ac.jp",          # 東京慈恵会医科大学
    "daito.ac.jp",        # 大東文化大学
    "nij.tokushima-u.ac.jp", # 徳島大学
    "doshisha.ac.jp",     # 同志社大学
    "ritsumei.ac.jp",     # 立命館大学
    "kansai-u.ac.jp",     # 関西大学
    "kwansei.ac.jp",      # 関西学院大学
    "apu.ac.jp",          # 立命館アジア太平洋大学
    "nagasaki-u.ac.jp",   # 長崎大学
    "kagoshima-u.ac.jp",  # 鹿児島大学
]

def is_university_email(email: str) -> bool:
    """大学メールアドレスかどうかを判定"""
    if not email or "@" not in email:
        return False
    
    domain = email.split("@")[-1].lower()
    return domain in UNIVERSITY_DOMAINS

