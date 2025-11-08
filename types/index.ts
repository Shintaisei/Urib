export interface User {
  id: string
  email: string
  university: string
  nickname: string
  isVerified: boolean
  createdAt: Date
}

export interface Board {
  id: string
  name: string
  description: string
  category: "faculty" | "department" | "club"
  university: string
  memberCount: number
  postCount: number
  lastActivity: Date
  isActive: boolean
}

export interface Post {
  id: string
  boardId: string
  content: string
  authorId: string
  anonymousName: string
  createdAt: Date
  updatedAt: Date
  likeCount: number
  replyCount: number
  isLiked?: boolean
}

export interface DirectMessage {
  id: string
  senderId: string
  receiverId: string
  content: string
  createdAt: Date
  isRead: boolean
}

export interface Conversation {
  id: string
  participantId: string
  anonymousName: string
  lastMessage: string
  lastMessageTime: Date
  unreadCount: number
  isOnline: boolean
}

export interface LoginFormData {
  email: string
}

export interface ProfileSettings {
  nickname: string
  emailNotifications: boolean
  dmNotifications: boolean
  isPrivate: boolean
}

export type AuthState = "idle" | "loading" | "authenticated" | "unauthenticated"
export type BoardCategory = "faculty" | "department" | "club"

// Market types (for market pages/components)
export type MarketItemType = 'buy' | 'sell' | 'free'

export interface MarketItem {
  id: string
  title: string
  description: string
  type: MarketItemType
  price?: number
  condition: 'new' | 'like_new' | 'good' | 'fair' | 'poor'
  category: string
  images: string[]
  author_name: string
  university: string
  contact_method: 'dm' | 'email' | 'phone'
  is_available: boolean
  created_at: string
  updated_at: string
  view_count: number
  like_count: number
  is_liked: boolean
  comment_count?: number
  can_edit?: boolean
}

export interface MarketItemCreate {
  title: string
  description: string
  type: MarketItemType
  price?: number
  condition: 'new' | 'like_new' | 'good' | 'fair' | 'poor'
  category?: string
  images: string[]
  contact_method: 'dm' | 'email' | 'phone'
}
