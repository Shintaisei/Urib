// 市場掲示板のAPIクライアント

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

// 市場商品の型定義
import type { MarketItem, MarketItemCreateRequest } from '../types';
export interface MarketItemUpdate {
  title?: string
  description?: string
  price?: number
  condition?: 'new' | 'like_new' | 'good' | 'fair' | 'poor'
  category?: string
  images?: string[]
  contact_method?: 'dm' | 'email' | 'phone'
  is_available?: boolean
}

export interface MarketFilter {
  type?: 'buy' | 'sell' | 'free'
  category?: string
  min_price?: number
  max_price?: number
  condition?: string
  university?: string
  search?: string
  limit?: number
  offset?: number
}

export interface MarketStats {
  total_items: number
  buy_items: number
  sell_items: number
  free_items: number
  categories: { [key: string]: number }
}

// 市場商品一覧を取得
export const getMarketItems = async (filter: MarketFilter = {}): Promise<MarketItem[]> => {
  const params = new URLSearchParams();
  
  // フィルターパラメータを追加
  if (filter.type) params.append('type', filter.type);
  if (filter.category) params.append('category', filter.category);
  if (filter.min_price !== undefined) params.append('min_price', filter.min_price.toString());
  if (filter.max_price !== undefined) params.append('max_price', filter.max_price.toString());
  if (filter.condition) params.append('condition', filter.condition);
  if (filter.university) params.append('university', filter.university);
  if (filter.search) params.append('search', filter.search);
  if (filter.limit) params.append('limit', filter.limit.toString());
  if (filter.offset) params.append('offset', filter.offset.toString());

  const response = await fetch(`${API_BASE_URL}/market/items?${params.toString()}`, {
    method: 'GET',
    headers: getHeaders(),
  });

  if (!response.ok) {
    throw new Error(`商品一覧の取得に失敗しました: ${response.statusText}`);
  }

  return response.json();
};

// 特定の市場商品を取得
export const getMarketItem = async (itemId: string): Promise<MarketItem> => {
  const response = await fetch(`${API_BASE_URL}/market/items/${itemId}`, {
    method: 'GET',
    headers: getHeaders(),
  });

  if (!response.ok) {
    throw new Error(`商品の取得に失敗しました: ${response.statusText}`);
  }

  return response.json();
};

// 新しい市場商品を作成
export const createMarketItem = async (itemData: MarketItemCreate): Promise<MarketItem> => {
  const response = await fetch(`${API_BASE_URL}/market/items`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(itemData),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `商品の作成に失敗しました: ${response.statusText}`);
  }

  return response.json();
};

// 市場商品を更新
export const updateMarketItem = async (itemId: string, itemData: MarketItemUpdate): Promise<MarketItem> => {
  const response = await fetch(`${API_BASE_URL}/market/items/${itemId}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(itemData),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `商品の更新に失敗しました: ${response.statusText}`);
  }

  return response.json();
};

// 市場商品を削除
export const deleteMarketItem = async (itemId: string): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/market/items/${itemId}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `商品の削除に失敗しました: ${response.statusText}`);
  }
};

// 商品のいいねを切り替え
export const toggleLike = async (itemId: string): Promise<{ is_liked: boolean; like_count: number }> => {
  const response = await fetch(`${API_BASE_URL}/market/items/${itemId}/like`, {
    method: 'POST',
    headers: getHeaders(),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `いいねの更新に失敗しました: ${response.statusText}`);
  }

  return response.json();
};

// 市場の統計情報を取得
export const getMarketStats = async (): Promise<MarketStats> => {
  const response = await fetch(`${API_BASE_URL}/market/stats`, {
    method: 'GET',
    headers: getHeaders(),
  });

  if (!response.ok) {
    throw new Error(`統計情報の取得に失敗しました: ${response.statusText}`);
  }

  return response.json();
};

// 市場掲示板のAPIクライアント
export const MarketApi = {
  getItems: getMarketItems,
  getItem: getMarketItem,
  createItem: createMarketItem,
  updateItem: updateMarketItem,
  deleteItem: deleteMarketItem,
  toggleLike: toggleLike,
  getStats: getMarketStats,
  setDevUserEmail,
  clearDevUserEmail,
};

