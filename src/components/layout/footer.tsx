'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

/* 备案默认值：未在后台设置时使用（默认 0000 占位，链接预填工信部备案查询） */
const DEFAULT_ICP_NO = '0000'
const DEFAULT_ICP_LINK = 'https://beian.miit.gov.cn/'

export default function Footer() {
  const [icpNo, setIcpNo] = useState(DEFAULT_ICP_NO)
  const [icpLink, setIcpLink] = useState(DEFAULT_ICP_LINK)

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((d) => {
        if (d.settings?.icpNo) setIcpNo(d.settings.icpNo)
        if (d.settings?.icpLink) setIcpLink(d.settings.icpLink)
      })
      .catch(() => { /* 保持默认值 */ })
  }, [])

  return (
    <footer className="mt-auto py-10">
      <div className="content-container">
        {/* 渐变细线 */}
        <div className="gradient-hairline mb-8" />
        <div className="flex flex-col items-center justify-center gap-2 text-center">
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            © {new Date().getFullYear()}{' '}
            <Link
              href="https://github.com/WSYXIUBA"
              className="font-medium transition-colors hover:text-[color:var(--accent)]"
              style={{ color: 'var(--text-primary)' }}
              target="_blank"
            >
              纸心
            </Link>
            <span className="mx-2 opacity-40">·</span>
            <span className="gradient-text font-medium">肆一纸心の栖息居</span>
          </p>
          {/* 备案号：可点击跳转（后台「网站设置 → 备案信息」可改编号与链接） */}
          {icpNo && (
            <a
              href={icpLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs transition-colors hover:text-[color:var(--accent)]"
              style={{ color: 'var(--text-secondary)', opacity: 0.7 }}
            >
              {icpNo}
            </a>
          )}
        </div>
      </div>
    </footer>
  )
}
