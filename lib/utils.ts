import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// 管理者メール判定: master/mster 00..30 @ *.ac.jp に対応
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false
  return /^(master|mster)(00|0?[1-9]|[1-2][0-9]|30)@(?:[\w.-]+\.)?ac\.jp$/i.test(email)
}
