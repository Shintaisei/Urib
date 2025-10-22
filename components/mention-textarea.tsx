"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Textarea } from "@/components/ui/textarea"

type MentionUser = { id: number; anonymous_name: string; email?: string | null }

interface MentionTextareaProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  maxLength?: number
  className?: string
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export function MentionTextarea({ value, onChange, placeholder, maxLength, className }: MentionTextareaProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [items, setItems] = useState<MentionUser[]>([])
  const [activeIndex, setActiveIndex] = useState(0)
  const taRef = useRef<HTMLTextAreaElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const debounceRef = useRef<number | undefined>(undefined)

  const extractQuery = useCallback(() => {
    const ta = taRef.current
    if (!ta) return { q: "", start: -1, end: -1 }
    const pos = ta.selectionStart
    const text = value
    // 探索: 直前の空白/改行/行頭まで戻って先頭トークンを取り出す
    let start = pos - 1
    while (start >= 0) {
      const ch = text[start]
      if (ch === "\n" || ch === "\t" || ch === " ") break
      start--
    }
    start = start + 1
    const token = text.slice(start, pos)
    if (token.startsWith("@") && token.length >= 2) {
      return { q: token.slice(1), start, end: pos }
    }
    return { q: "", start: -1, end: -1 }
  }, [value])

  const runSearch = useCallback(async (namePrefix: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/users/search?name_prefix=${encodeURIComponent(namePrefix)}&limit=8`, { cache: 'no-store' })
      const data = await res.json()
      setItems(Array.isArray(data) ? data : [])
      setActiveIndex(0)
      setOpen(true)
    } catch {
      setItems([])
      setOpen(false)
    }
  }, [])

  useEffect(() => {
    const { q } = extractQuery()
    setQuery(q)
    window.clearTimeout(debounceRef.current)
    if (q) {
      debounceRef.current = window.setTimeout(() => runSearch(q), 200)
    } else {
      setOpen(false)
      setItems([])
    }
    return () => {
      window.clearTimeout(debounceRef.current)
    }
  }, [value, extractQuery, runSearch])

  const applySelection = useCallback((name: string) => {
    const ta = taRef.current
    if (!ta) return
    const { start, end } = extractQuery()
    if (start < 0 || end < 0) return
    const before = value.slice(0, start)
    const after = value.slice(end)
    const inserted = `@${name} `
    const next = before + inserted + after
    onChange(next)
    // キャレット位置を調整
    requestAnimationFrame(() => {
      const pos = (before + inserted).length
      ta.setSelectionRange(pos, pos)
      ta.focus()
    })
    setOpen(false)
  }, [extractQuery, onChange, value])

  const onKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!open || items.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((idx) => (idx + 1) % items.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((idx) => (idx - 1 + items.length) % items.length)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const choice = items[activeIndex]
      if (choice) applySelection(choice.anonymous_name)
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }, [open, items, activeIndex, applySelection])

  return (
    <div ref={containerRef} className="relative">
      <Textarea
        ref={taRef as any}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        className={className}
        maxLength={maxLength}
      />
      {open && items.length > 0 && (
        <div className="absolute z-50 mt-1 w-full max-h-56 overflow-auto rounded-md border bg-popover text-popover-foreground shadow-md">
          {items.map((u, i) => (
            <button
              key={u.id}
              type="button"
              className={`w-full text-left px-3 py-2 text-sm ${i === activeIndex ? 'bg-accent text-accent-foreground' : ''}`}
              onMouseDown={(e) => { e.preventDefault(); applySelection(u.anonymous_name) }}
            >
              @{u.anonymous_name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}


