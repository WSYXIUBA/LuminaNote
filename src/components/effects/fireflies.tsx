'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useEffects } from '@/lib/effects-context'
import { useMusic } from '@/lib/music-context'

interface Firefly {
  id: number
  top: string
  left: string
  size: number
  breatheDuration: number
  breatheDelay: number
  floatDuration: number
  floatDelay: number
  floatPath: string
  rgb: string        // 主色（空格分隔，用于 rgb() 空格语法）
  glowRgb: string    // 光晕色
}

/* 萤火虫配色（青绿 / 暖黄 / 冰蓝 / 纯白） */
const PALETTES: Record<string, { main: string; glow: string }> = {
  green: { main: '200 255 210', glow: '80 255 140' },
  warm: { main: '255 222 160', glow: '255 170 80' },
  cyan: { main: '170 235 255', glow: '70 200 255' },
  white: { main: '235 240 255', glow: '170 190 255' },
}

export default function Fireflies() {
  const {
    effectDensity, fireflySize, fireflyBrightness,
    fireflyColor, fireflyMusic, fireflyMusicSens,
  } = useEffects()
  const { playing, analyserRef } = useMusic()

  const [flies, setFlies] = useState<Firefly[]>([])
  const refs = useRef<(HTMLDivElement | null)[]>([])

  /* 颜色模式解析：random 时每次随机选一套 */
  const paletteKey = useMemo(() => {
    if (fireflyColor === 'random') {
      const keys = Object.keys(PALETTES)
      return keys[Math.floor(Math.random() * keys.length)]
    }
    return fireflyColor
  }, [fireflyColor])

  /* 生成萤火虫（密度 / 大小 / 颜色变化时重建） */
  useEffect(() => {
    const count = Math.round(60 * (effectDensity / 100))
    const p = PALETTES[paletteKey]
    const generated: Firefly[] = Array.from({ length: count }).map((_, i) => ({
      id: i,
      top: `${Math.random() * 100}%`,
      left: `${Math.random() * 100}%`,
      size: Math.max(2, fireflySize * (0.75 + Math.random())),
      breatheDuration: 3 + Math.random() * 5,
      breatheDelay: Math.random() * -10,
      floatDuration: 15 + Math.random() * 20,
      floatDelay: Math.random() * -20,
      floatPath: `float${Math.floor(Math.random() * 4) + 1}`,
      rgb: p.main,
      glowRgb: p.glow,
    }))
    refs.current = []
    setFlies(generated)
  }, [effectDensity, fireflySize, paletteKey])

  /* 音乐频闪联动：播放时按音频能量控制整体亮度 + 闪烁速度 */
  useEffect(() => {
    if (!fireflyMusic) return
    let raf = 0
    let last = 0
    const loop = (t: number) => {
      raf = requestAnimationFrame(loop)
      if (t - last < 100) return
      last = t
      const analyser = analyserRef.current
      if (!analyser) return
      const data = new Uint8Array(analyser.frequencyBinCount)
      analyser.getByteFrequencyData(data)
      let sum = 0
      for (let i = 0; i < data.length; i++) sum += data[i]
      const level = playing ? sum / data.length / 255 : 0
      const sens = fireflyMusicSens / 100
      // 亮度：鼓点/人声强时整体更亮（封顶 1.6 倍）
      const glow = Math.min(1.6, 0.18 + level * 1.5 * sens)
      document.documentElement.style.setProperty('--fly-glow', String(glow))
      // 速度：能量越高闪得越快
      refs.current.forEach((el, i) => {
        if (!el) return
        const base = flies[i]?.breatheDuration || 4
        const dur = base * (1.5 - level * 1.0 * sens)
        el.style.animationDuration = `${Math.max(0.4, dur)}s`
      })
    }
    raf = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(raf)
      document.documentElement.style.removeProperty('--fly-glow')
    }
  }, [fireflyMusic, fireflyMusicSens, playing, analyserRef, flies])

  return (
    <div className="fixed inset-0 w-full h-full pointer-events-none overflow-hidden mix-blend-screen z-[3]">
      <style>{`
        @keyframes fireflyBreathe {
          0%, 100% { opacity: calc(var(--fly-glow, 1) * 0.12); transform: scale(0.3); }
          50% { opacity: var(--fly-glow, 1); transform: scale(1.2); box-shadow: 0 0 10px 3px rgb(var(--fly-rgb) / calc(0.8 * var(--fly-glow, 1))), 0 0 20px 6px rgb(var(--fly-glow-rgb) / calc(0.35 * var(--fly-glow, 1))); }
        }
        @keyframes float1 { 0%,100% { transform: translate(0,0); } 33% { transform: translate(10vw,-15vh); } 66% { transform: translate(-5vw,-20vh); } }
        @keyframes float2 { 0%,100% { transform: translate(0,0); } 33% { transform: translate(-12vw,10vh); } 66% { transform: translate(8vw,15vh); } }
        @keyframes float3 { 0%,100% { transform: translate(0,0); } 33% { transform: translate(15vw,15vh); } 66% { transform: translate(-10vw,5vh); } }
        @keyframes float4 { 0%,100% { transform: translate(0,0); } 33% { transform: translate(-15vw,-10vh); } 66% { transform: translate(10vw,-15vh); } }
      `}</style>

      {flies.map((fly) => (
        <div
          key={fly.id}
          className="absolute"
          style={{
            top: fly.top,
            left: fly.left,
            animation: `${fly.floatPath} ${fly.floatDuration}s ease-in-out infinite`,
            animationDelay: `${fly.floatDelay}s`,
          }}
        >
          <div
            ref={(el) => { refs.current[fly.id] = el }}
            className="rounded-full"
            style={{
              width: `${fly.size}px`,
              height: `${fly.size}px`,
              backgroundColor: `rgb(${fly.rgb} / 0.9)`,
              ['--fly-rgb' as string]: fly.rgb,
              ['--fly-glow-rgb' as string]: fly.glowRgb,
              animation: `fireflyBreathe ${fly.breatheDuration}s ease-in-out infinite`,
              animationDelay: `${fly.breatheDelay}s`,
              filter: `brightness(${fireflyBrightness / 100})`,
            }}
          />
        </div>
      ))}
    </div>
  )
}
