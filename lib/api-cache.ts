"use client"

import { useState, useEffect, useCallback } from 'react'

// シンプルなメモリキャッシュ
class APICache {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>()
  
  set(key: string, data: any, ttl: number = 30000) { // デフォルト30秒
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    })
  }
  
  get(key: string): any | null {
    const item = this.cache.get(key)
    if (!item) return null
    
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key)
      return null
    }
    
    return item.data
  }
  
  clear() {
    this.cache.clear()
  }
  
  delete(key: string) {
    this.cache.delete(key)
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
          'Cache-Control': 'max-age=30',
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
  
  return { fetchWithCache, invalidateCache, loading }
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
