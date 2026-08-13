'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTheme } from '@/lib/theme-context'

const NAV_LINKS = [
  { href: '/', label: '首页' },
  { href: '/blog', label: '博客' },
  { href: '/gallery', label: '相册' },
  { href: '/music', label: '音乐' },
  { href: '/guestbook', label: '留言' },
  { href: '/about', label: '关于' },
]

export default function Navbar() {
  const { theme, toggle } = useTheme()
  const pathname = usePathname()

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href)

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex justify-center px-4 pt-4">
      <div className="flex items-center justify-between w-full max-w-4xl h-14 px-5 rounded-full glass-nav">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2 font-bold text-[17px] tracking-tight shrink-0"
        >
          <span className="gradient-text">栖息居</span>
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--accent)' }} />
        </Link>

        {/* 导航（移动端横向滚动，桌面端完整展示） */}
        <div
          className="flex items-center gap-0.5 flex-1 justify-center overflow-x-auto mx-1"
          style={{ scrollbarWidth: 'none' }}
        >
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="relative px-3 py-2 whitespace-nowrap rounded-full text-[13.5px] font-medium transition-colors duration-200 shrink-0"
              style={{
                color: isActive(link.href) ? 'var(--accent)' : 'var(--text-secondary)',
              }}
            >
              {link.label}
              {isActive(link.href) && (
                <span
                  className="absolute inset-x-3 -bottom-0.5 h-px rounded-full"
                  style={{ background: 'var(--gradient-main)' }}
                />
              )}
            </Link>
          ))}
        </div>

        {/* 右侧操作 */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* 主题切换 */}
          <button
            onClick={toggle}
            title={theme === 'dark' ? '切换到亮色' : '切换到暗色'}
            aria-label="切换主题"
            className="nav-icon-btn"
          >
            {theme === 'dark' ? (
              <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
              </svg>
            ) : (
              <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </nav>
  )
}