'use client'

import { useEffect, useState } from 'react'

/* 全屏背景字幕 — 每行从右边进、往左边流，像电影横屏字幕
   内容可在后台「外观定制 → 字幕」中自定义（captions_config） */

interface CaptionRow {
  text: string
  size: string
  top: string
  duration: number
  weight: number
}

const DEFAULT_ROWS: CaptionRow[] = [
  { text: '肆一纸心の栖息居', size: '2.2rem', top: '8%',  duration: 42, weight: 300 },
  { text: '用文字记录时光 · 用镜头定格瞬间', size: '1.4rem', top: '22%', duration: 55, weight: 300 },
  { text: 'BLOG · GALLERY · GUESTBOOK', size: '1.1rem', top: '36%', duration: 38, weight: 400 },
  { text: '毛玻璃之下 · 极简之上', size: '1.8rem', top: '50%', duration: 48, weight: 300 },
  { text: '栖息 · 记录 · 分享', size: '1.3rem', top: '64%', duration: 35, weight: 300 },
  { text: '纸心 · WSYXIUBA', size: '1.2rem', top: '76%', duration: 50, weight: 400 },
  { text: '光影 · 文字 · 生活', size: '1.6rem', top: '88%', duration: 45, weight: 300 },
]

export default function BgCaptions() {
  const [rows, setRows] = useState<CaptionRow[]>(DEFAULT_ROWS)

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((data) => {
        const cfg = data.settings?.captions_config
        if (!cfg) return
        try {
          const parsed = JSON.parse(cfg)
          if (Array.isArray(parsed.rows) && parsed.rows.length > 0) {
            setRows(parsed.rows)
          }
        } catch { /* ignore */ }
      })
      .catch(() => {})
  }, [])

  return (
    <div className="bg-caption-layer" aria-hidden>
      {rows.map((row, i) => (
        <div
          key={i}
          className="bg-caption-row"
          style={{
            top: row.top,
            animationDuration: `${row.duration}s`,
            animationDelay: `${-((i * 7) % 30)}s`,
          }}
        >
          <span
            className="bg-caption-text"
            style={{
              fontSize: row.size,
              fontWeight: row.weight,
            }}
          >
            {row.text}
          </span>
        </div>
      ))}
    </div>
  )
}
