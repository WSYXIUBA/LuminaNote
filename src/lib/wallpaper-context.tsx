'use client'

import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'

// 预设壁纸（本地路径，可替换）
const DEFAULT_WALLPAPERS = [
  '/wallpapers/default-dark.jpg',
  '/wallpapers/default-light.jpg',
]

// 按时间推荐的壁纸索引
function getTimeBasedIndex(): number {
  const h = new Date().getHours()
  if (h >= 6 && h < 12) return 0  // 早晨
  if (h >= 12 && h < 18) return 1  // 下午
  return 2                          // 夜晚
}

type WallpaperMode = 'auto' | 'time' | 'random' | 'gallery' | 'fixed'

interface WallpaperContextType {
  wallpaper: string
  mode: WallpaperMode
  setMode: (m: WallpaperMode) => void
  setCustomWallpaper: (url: string) => void
  nextWallpaper: () => void
}

const WallpaperContext = createContext<WallpaperContextType>({
  wallpaper: '',
  mode: 'auto',
  setMode: () => {},
  setCustomWallpaper: () => {},
  nextWallpaper: () => {},
})

export function WallpaperProvider({ children }: { children: React.ReactNode }) {
  const [wallpaper, setWallpaper] = useState('')
  const [mode, setModeState] = useState<WallpaperMode>('auto')
  const [customWallpapers, setCustomWallpapers] = useState<string[]>([])
  const [randomIndex, setRandomIndex] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // 初始化
  useEffect(() => {
    const stored = localStorage.getItem('wallpaperMode') as WallpaperMode | null
    if (stored) setModeState(stored)
    // 默认无壁纸（使用环境光渐变背景），用户上传壁纸后自动启用
  }, [])

  // 根据模式更新壁纸
  const updateWallpaper = useCallback((m: WallpaperMode, customList: string[] = customWallpapers) => {
    switch (m) {
      case 'time':
        // 简单分时
        const idx = getTimeBasedIndex()
        setWallpaper(DEFAULT_WALLPAPERS[idx % DEFAULT_WALLPAPERS.length])
        break
      case 'random':
        setRandomIndex(prev => (prev + 1) % Math.max(DEFAULT_WALLPAPERS.length, 1))
        setWallpaper(DEFAULT_WALLPAPERS[Math.floor(Math.random() * DEFAULT_WALLPAPERS.length)])
        break
      case 'gallery':
        if (customList.length > 0) {
          setWallpaper(customList[Math.floor(Math.random() * customList.length)])
        }
        break
      case 'fixed':
        // 固定用当前壁纸不动
        break
      case 'auto':
      default:
        // 自动混合：白天随机，夜晚固定暗色
        const h = new Date().getHours()
        if (h >= 6 && h < 18) {
          setWallpaper(DEFAULT_WALLPAPERS[Math.floor(Math.random() * DEFAULT_WALLPAPERS.length)])
        } else {
          setWallpaper(DEFAULT_WALLPAPERS[0])
        }
        break
    }
  }, [customWallpapers])

  // 模式切换
  const setMode = useCallback((m: WallpaperMode) => {
    setModeState(m)
    localStorage.setItem('wallpaperMode', m)
    updateWallpaper(m)
  }, [updateWallpaper])

  // 自定义壁纸列表
  const setCustomWallpaper = useCallback((url: string) => {
    setCustomWallpapers(prev => {
      const next = [...prev, url]
      updateWallpaper(mode, next)
      return next
    })
  }, [mode, updateWallpaper])

  // 下一张
  const nextWallpaper = useCallback(() => {
    updateWallpaper(mode)
  }, [mode, updateWallpaper])

  // 自动轮换（仅 random/auto 模式）
  useEffect(() => {
    if (mode === 'random' || mode === 'auto') {
      intervalRef.current = setInterval(() => {
        updateWallpaper(mode)
      }, 60000) // 每分钟换一次
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [mode, updateWallpaper])

  return (
    <WallpaperContext.Provider value={{ wallpaper, mode, setMode, setCustomWallpaper, nextWallpaper }}>
      {children}
    </WallpaperContext.Provider>
  )
}

export const useWallpaper = () => useContext(WallpaperContext)