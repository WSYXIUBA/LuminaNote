'use client'

import { useEffect, useRef } from 'react'
import { useMusic } from '@/lib/music-context'
import { useEffects } from '@/lib/effects-context'

interface Rgb { r: number; g: number; b: number }

export type { Rgb }

export function hexToRgb(hex: string): Rgb {
  let h = hex.trim().replace('#', '')
  if (h.length === 3) h = h.split('').map((c) => c + c).join('')
  const n = parseInt(h, 16)
  if (isNaN(n)) return { r: 139, g: 124, b: 255 }
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
}

/* 把颜色提亮 40%（用于自定义色的副光晕） */
export function lighten(c: Rgb, amt = 0.4): Rgb {
  return {
    r: Math.round(c.r + (255 - c.r) * amt),
    g: Math.round(c.g + (255 - c.g) * amt),
    b: Math.round(c.b + (255 - c.b) * amt),
  }
}

/* 光效颜色预设：主色 / 副色 */
export const GLOW_PRESETS: Record<string, [string, string]> = {
  accent: ['--accent', '--accent-2'],     // 跟随主题色
  warm: ['#ffb26b', '#ff8e53'],           // 暖橙金
  cyan: ['#4dd8ff', '#38bdf8'],           // 冰蓝
  pink: ['#ff7ab8', '#ff5c8a'],           // 樱花粉
  green: ['#6bffb2', '#38f89b'],          // 荧光绿
  white: ['#ffffff', '#dfe6ff'],          // 冷白
}

/**
 * 解析当前配置下的颜色对（模块级，供 MusicGlow / AvatarGlow 共用）
 * accent/accent2 可选传入（避免依赖 CSS 变量更新时序）
 */
export function resolveGlowColors(style: string, customColor: string, accent?: string, accent2?: string): [Rgb, Rgb] {
  const css = getComputedStyle(document.documentElement)
  if (style === 'accent') {
    const a = accent || css.getPropertyValue('--accent').trim() || '#8b7cff'
    const b = accent2 || css.getPropertyValue('--accent-2').trim() || '#45d4e4'
    return [hexToRgb(a), hexToRgb(b)]
  }
  if (style === 'custom') {
    const c = hexToRgb(customColor)
    return [c, lighten(c)]
  }
  if (style === 'random') {
    const keys = Object.keys(GLOW_PRESETS)
    const pick = keys[Math.floor(Math.random() * keys.length)]
    const [a, b] = GLOW_PRESETS[pick]
    return [hexToRgb(a), hexToRgb(b)]
  }
  const preset = GLOW_PRESETS[style]
  if (!preset) return [{ r: 139, g: 124, b: 255 }, { r: 69, g: 212, b: 228 }]
  const [a, b] = preset
  if (a.startsWith('--')) {
    return [
      hexToRgb(css.getPropertyValue(a).trim() || '#8b7cff'),
      hexToRgb(css.getPropertyValue(b).trim() || '#45d4e4'),
    ]
  }
  return [hexToRgb(a), hexToRgb(b)]
}

/**
 * 卡片边缘微光（随音乐律动）：
 * - 颜色 / 亮度 / 扩散 / 音乐联动 / 待机呼吸 全部由后台「音乐边缘光效」配置控制
 * - 放在玻璃卡片内部第一个子元素，随卡片 tilt 下压一起运动
 */
export default function MusicGlow() {
  const { playing, analyserRef } = useMusic()
  const fx = useEffects()
  const glowRef = useRef<HTMLDivElement | null>(null)
  const glowEnergy = useRef(0)
  const colorRef = useRef<[Rgb, Rgb]>([{ r: 139, g: 124, b: 255 }, { r: 69, g: 212, b: 228 }])
  /* 供 random 定时器判断当前是否处于音乐联动播放中 */
  const playingRef = useRef(playing)
  playingRef.current = playing

  /* 初始化：解析颜色 → 应用待机微光（或关闭）；random 模式每 2.5s 实时换色 */
  useEffect(() => {
    colorRef.current = resolveGlowColors(fx.glowStyle, fx.glowCustomColor, fx.accent, fx.accent2)
    const apply = () => {
      if (glowRef.current) {
        glowRef.current.style.boxShadow = fx.glowOn ? buildIdle() : '0 0 0 rgba(0,0,0,0)'
      }
    }
    apply()

    let timer: ReturnType<typeof setInterval> | null = null
    if (fx.glowStyle === 'random') {
      timer = setInterval(() => {
        colorRef.current = resolveGlowColors(fx.glowStyle, fx.glowCustomColor, fx.accent, fx.accent2)
        /* 不在音乐联动播放中 → 立即刷新待机光效；播放中由 RAF 循环自动取新颜色 */
        if (!fx.glowMusic || !playingRef.current) apply()
      }, 2500)
    }
    return () => { if (timer) clearInterval(timer) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fx.glowOn, fx.glowStyle, fx.glowCustomColor, fx.glowIntensity, fx.glowSpread, fx.accent, fx.accent2])

  /* 根据配置生成待机微光 */
  const buildIdle = (): string => {
    const [a, a2] = colorRef.current
    const i = fx.glowIntensity / 100          // 亮度 0.2-1
    const s = fx.glowSpread / 100             // 扩散 0.2-1
    const r1 = 10 + s * 16                    // 内圈扩散半径
    const r2 = 22 + s * 38                    // 外圈弥散半径
    const r3 = 6 + s * 16                     // 内发光
    return (
      `0 0 ${r1.toFixed(0)}px 0 rgba(${a.r},${a.g},${a.b},${(0.14 * i).toFixed(3)}), ` +
      `0 0 ${r2.toFixed(0)}px -6px rgba(${a2.r},${a2.g},${a2.b},${(0.18 * i).toFixed(3)}), ` +
      `inset 0 0 ${r3.toFixed(0)}px rgba(${a.r},${a.g},${a.b},${(0.08 * i).toFixed(3)})`
    )
  }

  /* 播放时随音频能量驱动光晕 */
  useEffect(() => {
    if (!fx.glowOn) return
    if (!fx.glowMusic || !playing) {
      // 不联动或暂停：待机微光（呼吸由 CSS 动画控制）
      if (glowRef.current) glowRef.current.style.boxShadow = buildIdle()
      return
    }

    let raf = 0
    const tick = () => {
      const analyser = analyserRef.current
      if (analyser) {
        const data = new Uint8Array(analyser.frequencyBinCount)
        analyser.getByteFrequencyData(data)

        /* 低频（鼓点/贝斯）加权能量 → 光晕强度/扩散 */
        const lowEnd = Math.max(1, Math.floor(data.length / 4))
        let sum = 0
        for (let k = 0; k < lowEnd; k++) sum += data[k]
        const raw = Math.min(1, sum / lowEnd / 255)
        const smooth = 0.9 - (fx.glowSens / 100) * 0.55   // 灵敏度越高越跟手
        glowEnergy.current = glowEnergy.current * smooth + raw * (1 - smooth)
        const g = glowEnergy.current

        const [a, a2] = colorRef.current
        const i = fx.glowIntensity / 100
        const s = fx.glowSpread / 100
        const r1 = 6 + g * (8 + s * 22)
        const r2 = 14 + g * (16 + s * 46)
        const r3 = g * (6 + s * 12)
        glowRef.current!.style.boxShadow =
          `0 0 ${r1.toFixed(0)}px 0 rgba(${a.r},${a.g},${a.b},${(0.12 * i + g * 0.55 * i).toFixed(3)}), ` +
          `0 0 ${r2.toFixed(0)}px -6px rgba(${a2.r},${a2.g},${a2.b},${(0.15 * i + g * 0.5 * i).toFixed(3)}), ` +
          `inset 0 0 ${r3.toFixed(0)}px rgba(${a.r},${a.g},${a.b},${(0.04 * i + g * 0.26 * i).toFixed(3)})`
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [playing, analyserRef, fx.glowOn, fx.glowMusic, fx.glowSens, fx.glowIntensity, fx.glowSpread])

  return (
    <div
      ref={glowRef}
      className="absolute inset-0 pointer-events-none"
      style={{
        borderRadius: 'inherit',
        transition: 'box-shadow 0.15s ease',
        boxShadow: '0 0 0 rgba(0,0,0,0)',
        /* 待机呼吸：缓慢放大缩小 + 明暗起伏 */
        animation: fx.glowOn && fx.glowBreathe && (!fx.glowMusic || !playing)
          ? `glowBreathe ${3.2 + (1 - fx.glowIntensity / 100) * 2}s ease-in-out infinite`
          : 'none',
      }}
    >
      <style>{`
        @keyframes glowBreathe {
          0%, 100% { opacity: 0.55; transform: scale(0.988); }
          50% { opacity: 1; transform: scale(1.012); }
        }
      `}</style>
    </div>
  )
}
