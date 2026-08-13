import type { Metadata } from 'next'
import { Inter, Noto_Sans_SC, Noto_Serif_SC } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'
import SiteShell from '@/components/layout/site-shell'

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-inter',
})

const notoSC = Noto_Sans_SC({
  subsets: ['latin'],
  weight: ['300', '400', '500', '700', '900'],
  display: 'swap',
  variable: '--font-noto-sc',
})

const notoSerif = Noto_Serif_SC({
  subsets: ['latin'],
  weight: ['400', '700', '900'],
  display: 'swap',
  variable: '--font-serif',
})

export const metadata: Metadata = {
  title: '肆一纸心の栖息居',
  description: '个人博客 · 相册 · 留言墙 · 毛玻璃极简设计',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN" suppressHydrationWarning className={`${inter.variable} ${notoSC.variable} ${notoSerif.variable}`}>
      <body>
        <Providers>
          {/* 背景层：流动渐变 + 大光晕 */}
          <div className="ambient-bg" aria-hidden>
            <div className="ambient-gradient" />
            <div className="ambient-glow glow-1" />
            <div className="ambient-glow glow-2" />
          </div>

          {/* 壁纸层（第 1 层背景图，由控制面板切换） */}
          <div id="wallpaper-bg" className="wallpaper-layer" aria-hidden />

          {/* 站点外壳：按路由渲染前台特效 / 后台管理布局 */}
          <SiteShell>{children}</SiteShell>
        </Providers>
      </body>
    </html>
  )
}
