import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// 管理者メール判定: master1..master30@ac.jp
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false
  return /^master([1-9]|[1-2][0-9]|30)@ac\.jp$/i.test(email)
}
