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
