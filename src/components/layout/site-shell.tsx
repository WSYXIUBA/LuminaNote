'use client'

import { usePathname } from 'next/navigation'
import Navbar from '@/components/layout/navbar'
import Footer from '@/components/layout/footer'
import BgCaptions from '@/components/effects/bg-captions'
import BackgroundEffects from '@/components/effects/background-effects'
import ClickEffect from '@/components/effects/click-effect'
import CursorTrail from '@/components/effects/cursor-trail'
import TiltEffect from '@/components/effects/tilt-effect'
import RainEffect from '@/components/effects/rain-effect'

/**
 * 站点外壳：根据路由决定渲染哪些层。
 * - 前台（非 /admin）：导航栏 + 字幕 + 樱花/萤火虫 + 点击涟漪 + 页脚
 * - 后台（/admin/*）：独立管理界面，不渲染前台导航/字幕/樱花/页脚，
 *   只保留环境光背景 + 毛玻璃，由 admin 自己的布局提供顶栏与侧边栏
 */
export default function SiteShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isAdmin = pathname.startsWith('/admin')

  return (
    <>
      {!isAdmin && <BgCaptions />}
      {!isAdmin && <BackgroundEffects />}
      {/* 点击特效：前后台都渲染，后台外观页可实时预览 */}
      <ClickEffect />

      {/* 雨幕特效（第 4 层）：前后台都渲染，后台外观页可实时预览 */}
      <RainEffect />

      {/* 卡片 3D 下压 + 鼠标拖尾 */}
      <TiltEffect />
      <CursorTrail />

      <div className="content-layer min-h-screen flex flex-col">
        {!isAdmin && <Navbar />}
        <main className="flex-1" style={{ paddingTop: isAdmin ? '0px' : '120px' }}>
          {children}
        </main>
        {!isAdmin && <Footer />}
      </div>
    </>
  )
}
