"use client"

import { useEffect } from "react"

export function ChunkRecovery(): React.ReactElement | null {
  useEffect(() => {
    const reloadWithBypass = (): void => {
      try {
        const url = new URL(window.location.href)
        url.searchParams.set("_r", String(Date.now()))
        window.location.replace(url.toString())
      } catch {
        window.location.reload()
      }
    }

    const onUnhandledRejection = (event: PromiseRejectionEvent): void => {
      const reason: any = event?.reason
      const message = typeof reason?.message === "string" ? reason.message : ""
      const name = typeof reason?.name === "string" ? reason.name : ""
      if (name === "ChunkLoadError" || /Loading chunk .* failed/i.test(message)) {
        reloadWithBypass()
      }
    }

    const onError = (event: ErrorEvent): void => {
      const target = event?.target as any
      if (target && target.tagName === "SCRIPT" && typeof target.src === "string") {
        if (target.src.includes("/_next/static/chunks/")) {
          reloadWithBypass()
        }
      }
    }

    window.addEventListener("unhandledrejection", onUnhandledRejection)
    window.addEventListener("error", onError, true)

    return () => {
      window.removeEventListener("unhandledrejection", onUnhandledRejection)
      window.removeEventListener("error", onError, true)
    }
  }, [])

  return null
}


