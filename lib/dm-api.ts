// DM（Direct Message）のAPIクライアント

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

// 開発用ヘルパー関数
export const setDevUserEmail = (email: string) => {
  localStorage.setItem('dev_user_email', email);
};

export const clearDevUserEmail = () => {
  localStorage.removeItem('dev_user_email');
};

// APIリクエストの共通ヘッダーを取得
const getHeaders = () => {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  // ユーザーのメールアドレスを取得（dev_user_emailまたはuser_email）
  const devEmail = localStorage.getItem('dev_user_email') || localStorage.getItem('user_email');
  if (devEmail) {
    headers['X-Dev-Email'] = `dev:${devEmail}`;
  }

  return headers;
};

// DM関連の型定義
export interface Conversation {
  id: string
  partner_email: string
  partner_name: string
  last_message?: string
  last_message_at?: string
  unread_count: number
  created_at: string
  updated_at: string
}

export interface Message {
  id: string
  conversation_id: string
  sender_email: string
  content: string
  created_at: string
  edited_at?: string
  is_own: boolean
}

export interface ConversationCreate {
  partner_email: string
}

export interface MessageCreate {
  conversation_id: string
  content: string
}

// 会話一覧を取得
export const getConversations = async (): Promise<Conversation[]> => {
  const response = await fetch(`${API_BASE_URL}/dm/conversations`, {
    method: 'GET',
    headers: getHeaders(),
  });

  if (!response.ok) {
    throw new Error(`会話一覧の取得に失敗しました: ${response.statusText}`);
  }

  return response.json();
};

// 特定の会話のメッセージを取得
export const getMessages = async (conversationId: string): Promise<Message[]> => {
  const response = await fetch(`${API_BASE_URL}/dm/conversations/${conversationId}/messages`, {
    method: 'GET',
    headers: getHeaders(),
  });

  if (!response.ok) {
    throw new Error(`メッセージの取得に失敗しました: ${response.statusText}`);
  }

  return response.json();
};

// 新しい会話を作成
export const createConversation = async (data: ConversationCreate): Promise<Conversation> => {
  const response = await fetch(`${API_BASE_URL}/dm/conversations`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `会話の作成に失敗しました: ${response.statusText}`);
  }

  return response.json();
};

// メッセージを送信
export const sendMessage = async (data: MessageCreate): Promise<Message> => {
  const response = await fetch(`${API_BASE_URL}/dm/messages`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `メッセージの送信に失敗しました: ${response.statusText}`);
  }

  return response.json();
};

// メッセージを既読にする
export const markAsRead = async (conversationId: string): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/dm/conversations/${conversationId}/read`, {
    method: 'POST',
    headers: getHeaders(),
  });

  if (!response.ok) {
    throw new Error(`既読の更新に失敗しました: ${response.statusText}`);
  }
};

// ユーザーをブロック
export const blockUser = async (userId: string): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/dm/block`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ user_id: userId }),
  });

  if (!response.ok) {
    throw new Error(`ユーザーのブロックに失敗しました: ${response.statusText}`);
  }
};

// メッセージを削除
export const deleteMessage = async (messageId: string): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/dm/messages/${messageId}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });

  if (!response.ok) {
    throw new Error(`メッセージの削除に失敗しました: ${response.statusText}`);
  }
};

// DM APIクライアント
export const DMApi = {
  getConversations,
  getMessages,
  createConversation,
  sendMessage,
  markAsRead,
  blockUser,
  deleteMessage,
  setDevUserEmail,
  clearDevUserEmail,
};

