'use client'

import { useEffect } from 'react'
import { useEffects } from '@/lib/effects-context'

/**
 * 壁纸渲染器：将效果控制面板选择的壁纸 URL 同步到 DOM 的壁纸层
 */
export function WallpaperRenderer() {
  const { wallpaper, bgMode } = useEffects()

  useEffect(() => {
    const el = document.getElementById('wallpaper-bg')
    if (el) {
      // 空 URL → 清空壁纸层（露出底层渐变/纯色背景）
      el.style.backgroundImage = wallpaper ? `url(${wallpaper})` : ''
    }
  }, [wallpaper])

  return null
}
