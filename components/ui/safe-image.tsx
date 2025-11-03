"use client"

import React, { useMemo, useState } from "react"

export interface SafeImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallbackSrc?: string
}

export function SafeImage(props: SafeImageProps) {
  const { src, alt, fallbackSrc = "/placeholder.jpg", onError, loading, decoding, ...rest } = props
  const [hasError, setHasError] = useState(false)

  const effectiveSrc = useMemo(() => {
    if (hasError || !src) return fallbackSrc
    return src
  }, [hasError, src, fallbackSrc])

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={effectiveSrc as string}
      alt={alt || "image"}
      loading={loading || "lazy"}
      decoding={decoding || "async"}
      referrerPolicy="no-referrer"
      onError={(e) => {
        setHasError(true)
        if (onError) onError(e)
      }}
      {...rest}
    />
  )
}

export default SafeImage


