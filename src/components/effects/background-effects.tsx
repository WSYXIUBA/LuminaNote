'use client'

import { useTheme } from '@/lib/theme-context'
import { useEffects } from '@/lib/effects-context'
import Fireflies from './fireflies'
import Sakura from './sakura'

/**
 * 主题联动背景特效：
 * - 暗色模式 → 萤火虫发光漂浮
 * - 亮色模式 → 樱花飘落
 * 可由效果控制面板开关（data-effects='off' 时隐藏）
 */
export default function BackgroundEffects() {
  const { theme } = useTheme()
  const { effectsOn } = useEffects()
  const isDark = theme === 'dark'

  if (!effectsOn) return null

  return (
    <>
      <div data-ripple-layer="fireflies" className={`transition-opacity duration-1000 ${isDark ? 'opacity-100' : 'opacity-0'}`}>
        <Fireflies />
      </div>
      <div data-ripple-layer="sakura" className={`transition-opacity duration-1000 ${isDark ? 'opacity-0' : 'opacity-100'}`}>
        <Sakura />
      </div>
    </>
  )
}