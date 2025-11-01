"use client"

import { useState, useEffect, useCallback } from 'react'

// シンプルなメモリキャッシュ
type CacheEntry = { data: any; timestamp: number; ttl: number }

const LS_PREFIX = 'apiCache:'

class APICache {
  private cache = new Map<string, CacheEntry>()
  
  set(key: string, data: any, ttl: number = 30000) { // デフォルト30秒
    const entry: CacheEntry = { data, timestamp: Date.now(), ttl }
    this.cache.set(key, entry)
    try {
      if (ttl > 0) {
        localStorage.setItem(LS_PREFIX + key, JSON.stringify(entry))
      }
    } catch {}
  }
  
  get(key: string): any | null {
    let item = this.cache.get(key)
    if (!item) {
      // localStorageから復元
      try {
        const raw = localStorage.getItem(LS_PREFIX + key)
        if (raw) {
          const parsed: CacheEntry = JSON.parse(raw)
          item = parsed
          this.cache.set(key, parsed)
        }
      } catch {}
    }
    if (!item) return null
    if (Date.now() - item.timestamp > item.ttl) {
      this.delete(key)
      return null
    }
    return item.data
  }
  
  clear() {
    this.cache.clear()
  }
  
  delete(key: string) {
    this.cache.delete(key)
    try { localStorage.removeItem(LS_PREFIX + key) } catch {}
  }
}

const apiCache = new APICache()

// キャッシュ付きfetch関数
export function useCachedFetch() {
  const [loading, setLoading] = useState(false)
  
  const fetchWithCache = useCallback(async (
    url: string, 
    options: RequestInit = {}, 
    cacheKey?: string,
    ttl: number = 30000
  ) => {
    const key = cacheKey || url
    
    // キャッシュから取得を試行
    const cached = apiCache.get(key)
    if (cached) {
      return cached
    }
    
    setLoading(true)
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Cache-Control': 'no-store',
          ...options.headers
        }
      })
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      
      // キャッシュに保存
      apiCache.set(key, data, ttl)
      
      return data
    } finally {
      setLoading(false)
    }
  }, [])
  
  const getCached = useCallback((cacheKey: string) => {
    try {
      return apiCache.get(cacheKey)
    } catch {
      return null
    }
  }, [])

  const invalidateCache = useCallback((pattern?: string) => {
    if (pattern) {
      // パターンにマッチするキャッシュを削除
      for (const key of apiCache['cache'].keys()) {
        if (key.includes(pattern)) {
          apiCache.delete(key)
        }
      }
    } else {
      // 全キャッシュをクリア
      apiCache.clear()
    }
  }, [])
  
  return { fetchWithCache, getCached, invalidateCache, loading }
}

// 並列API呼び出し用のフック
export function useParallelFetch() {
  const { fetchWithCache } = useCachedFetch()
  
  const fetchMultiple = useCallback(async (requests: Array<{
    url: string
    options?: RequestInit
    cacheKey?: string
    ttl?: number
  }>) => {
    const promises = requests.map(req => 
      fetchWithCache(req.url, req.options, req.cacheKey, req.ttl)
    )
    
    return Promise.all(promises)
  }, [fetchWithCache])
  
  return { fetchMultiple }
}
