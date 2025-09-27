import random
import string
import smtplib
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

def generate_code(length: int = 6) -> str:
    """認証コードを生成"""
    return ''.join(random.choices(string.digits, k=length))

def send_verification_email(email: str, code: str) -> bool:
    """認証コードをメール送信"""
    try:
        # 環境変数からメール設定を取得
        smtp_server = os.getenv("SMTP_SERVER", "smtp.gmail.com")
        smtp_port = int(os.getenv("SMTP_PORT", "587"))
        smtp_username = os.getenv("SMTP_USERNAME")
        smtp_password = os.getenv("SMTP_PASSWORD")
        
        # メール設定が不完全な場合は送信をスキップ
        if not all([smtp_username, smtp_password]):
            print(f"メール設定が不完全なため、送信をスキップします: {email}")
            return False
        
        # メール本文を作成
        subject = "URIV認証コード"
        body = f"""
URIVアプリの認証コードです。

認証コード: {code}

このコードは5分間有効です。
このコードを誰にも教えないでください。

URIVチーム
        """
        
        # メールメッセージを作成
        msg = MIMEMultipart()
        msg['From'] = smtp_username
        msg['To'] = email
        msg['Subject'] = subject
        msg.attach(MIMEText(body, 'plain', 'utf-8'))
        
        # SMTPサーバーに接続してメール送信
        server = smtplib.SMTP(smtp_server, smtp_port)
        server.starttls()
        server.login(smtp_username, smtp_password)
        server.send_message(msg)
        server.quit()
        
        print(f"認証コードを送信しました: {email}")
        return True
        
    except Exception as e:
        print(f"メール送信エラー: {e}")
        return False

