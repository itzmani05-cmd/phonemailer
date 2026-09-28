import { lightColors, webFontStack } from '@shared/theme'
import { useCallback, useEffect, useRef, useState } from 'react'

function emailDocument(html: string) {
  return `<!doctype html><html><head><meta charset="utf-8"><base target="_blank">
<meta http-equiv="Content-Security-Policy" content="script-src 'none'">
<style>html,body{margin:0;padding:0;background:${lightColors.emailCanvas};color:${lightColors.emailText};
font-family:${webFontStack};font-size:14px;line-height:1.6;word-wrap:break-word}
img{max-width:100%;height:auto}table{max-width:100%}</style></head><body>${html}</body></html>`
}

export function EmailFrame({ html }: { html: string }) {
  const ref = useRef<HTMLIFrameElement>(null)
  const [height, setHeight] = useState(120)

  const measure = useCallback(() => {
    const doc = ref.current?.contentDocument
    if (doc?.documentElement) setHeight(doc.documentElement.scrollHeight)
  }, [])

  useEffect(() => {
    const frame = ref.current
    if (!frame) return
    let observer: ResizeObserver | undefined
    const onLoad = () => {
      measure()
      const body = frame.contentDocument?.body
      if (body) {
        observer = new ResizeObserver(measure)
        observer.observe(body)
      }
    }
    frame.addEventListener('load', onLoad)
    return () => {
      frame.removeEventListener('load', onLoad)
      observer?.disconnect()
    }
  }, [html, measure])

  return (
    <iframe
      ref={ref}
      className="email-frame"
      title="Message body"
      sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
      srcDoc={emailDocument(html)}
      style={{ height }}
    />
  )
}
