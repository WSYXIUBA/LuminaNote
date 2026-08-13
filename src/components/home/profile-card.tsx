'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

interface Settings {
  siteName?: string
  authorName?: string
  siteDescription?: string
  siteLogo?: string
  social_bilibili?: string
  social_email?: string
  social_github?: string
  social_qq?: string
}

interface Stats {
  postCount?: number
  totalPV?: number
  totalUV?: number
}

/* 社交图标（内联 SVG） */
const SOCIALS = [
  {
    key: 'social_bilibili',
    label: 'Bilibili',
    color: '#fb7299',
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
        <path d="M17.813 4.653h.854c1.51.054 2.769.578 3.773 1.574 1.002.995 1.511 2.34 1.527 4.033v7.784c-.016 1.69-.525 3.035-1.527 4.031-1.004.996-2.263 1.52-3.773 1.574H6.72c-1.51-.054-2.769-.578-3.773-1.574-1.002-.996-1.511-2.34-1.527-4.031V10.26c.016-1.693.525-3.038 1.527-4.033 1.004-.996 2.263-1.52 3.773-1.574h.854L9.4 2.038l.063-.054a.752.752 0 01.984.062l.07.078 2.197 2.51h2.148l2.197-2.51a.752.752 0 011.053-.14zm-4.77 4.423c-2.398 0-4.343 1.944-4.343 4.343v4.342c0 2.399 1.945 4.343 4.343 4.343 2.399 0 4.343-1.944 4.343-4.343v-4.342c0-2.399-1.944-4.343-4.343-4.343z" />
      </svg>
    ),
  },
  {
    key: 'social_github',
    label: 'GitHub',
    color: '#a3a3a3',
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
      </svg>
    ),
  },
  {
    key: 'social_email',
    label: '邮箱',
    color: '#f59e0b',
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
        <path d="M1.5 8.67v8.58a3 3 0 003 3h15a3 3 0 003-3V8.67l-8.928 5.493a3 3 0 01-3.144 0L1.5 8.67z" />
        <path d="M22.5 6.908V6.75a3 3 0 00-3-3h-15a3 3 0 00-3 3v.158l9.714 5.978a1.5 1.5 0 001.572 0L22.5 6.908z" />
      </svg>
    ),
  },
  {
    key: 'social_qq',
    label: 'QQ',
    color: '#12b7f5',
    icon: (
      <span className="w-4 h-4 flex items-center justify-center text-[9px] font-bold">
        QQ
      </span>
    ),
  },
]

export default function ProfileCard() {
  const router = useRouter()
  const [settings, setSettings] = useState<Settings>({})
  const [stats, setStats] = useState<Stats>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/settings').then((r) => r.json()),
      fetch('/api/stats/public').then((r) => r.json()).catch(() => ({})),
    ])
      .then(([settingsRes, statsRes]) => {
        setSettings(settingsRes.settings || {})
        setStats(statsRes.stats || {})
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="glass-card p-8 h-full animate-pulse">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-white/20" />
          <div className="h-4 bg-white/20 rounded w-32" />
          <div className="h-3 bg-white/20 rounded w-48" />
        </div>
      </div>
    )
  }

  const name = settings.authorName || settings.siteName || '栖息居'
  const bio = settings.siteDescription || '用文字记录时光，用镜头定格瞬间'
  const logo = settings.siteLogo
  const visibleSocials = SOCIALS.filter((s) => settings[s.key as keyof Settings])

  return (
    <div
      className="glass-card glass-card-hover relative overflow-hidden group transition-all duration-500 cursor-pointer"
      data-tilt
      onClick={() => router.push('/about')}
    >
      {/* 顶部渐变装饰线 */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2/3 h-px" style={{ background: 'var(--gradient-main)' }} />

      <div className="relative z-10 flex flex-col items-center text-center px-6 py-9">
        {/* 头像 + 名字（点击进入关于） */}
        <div className="relative mb-5">
          <div className="w-[72px] h-[72px] rounded-2xl p-[2.5px] bg-gradient-to-tr from-indigo-500 via-purple-500 to-cyan-400 shadow-lg shadow-purple-500/25 transition-transform duration-300 group-hover:scale-105">
            {logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logo} alt="avatar" className="w-full h-full rounded-[14px] object-cover bg-white" />
            ) : (
              <div className="w-full h-full rounded-[14px] flex items-center justify-center text-white text-2xl font-bold bg-gradient-to-tr from-indigo-500 to-purple-500">
                {name.charAt(0)}
              </div>
            )}
          </div>
          {/* 在线状态点 */}
          <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-400 border-2 border-white/80" style={{ boxShadow: '0 0 8px rgba(52,211,153,0.8)' }} />
        </div>

        {/* 名字 */}
        <h1 className="text-xl font-bold tracking-wide gradient-text">
          {name}
        </h1>

        {/* 简介 */}
        <p className="text-xs mt-2 leading-relaxed max-w-md" style={{ color: 'var(--text-secondary)' }}>
          {bio}
        </p>

        {/* 社交 + 统计 一行 */}
        <div className="flex items-center justify-center gap-6 mt-6 w-full">
          {/* 社交图标 */}
          {visibleSocials.length > 0 && (
            <div className="flex items-center gap-2">
              {visibleSocials.map((social) => (
                <a
                  key={social.key}
                  href={settings[social.key as keyof Settings] || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={social.label}
                  className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm glass-badge"
                  style={{ color: social.color }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {social.icon}
                </a>
              ))}
            </div>
          )}

          {/* 分隔线 */}
          <div className="w-px h-6" style={{ background: 'var(--glass-border)' }} />

          {/* 统计 */}
          <div className="flex items-center gap-5">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{stats.postCount ?? 0}</span>
              <span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>文章</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{stats.totalPV ?? 0}</span>
              <span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>访问</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{stats.totalUV ?? 0}</span>
              <span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>访客</span>
            </div>
          </div>
        </div>

        {/* 快捷入口 */}
        <div className="flex flex-wrap justify-center gap-3 mt-7" onClick={(e) => e.stopPropagation()}>
          <Link href="/blog" className="btn-primary text-xs px-5 py-2.5">
            浏览博客
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </Link>
          <Link href="/gallery" className="btn-ghost text-xs px-5 py-2.5">光影相册</Link>
          <Link href="/guestbook" className="btn-ghost text-xs px-5 py-2.5">留言墙</Link>
        </div>
      </div>
    </div>
  )
}
