'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useMusic } from '@/lib/music-context'
import { useEffects } from '@/lib/effects-context'
import { type Rgb, resolveGlowColors } from './music-glow'

interface Props {
  src?: string
  alt?: string
  size?: number   // 头像直径 px，默认 96
}

/* 头像光效风格预设（用于面板 UI 展示） */
export const AVATAR_STYLES: { id: AvatarStyle; label: string }[] = [
  { id: 'ring', label: '霓虹星环' },
  { id: 'rainbow', label: '彩虹流光' },
  { id: 'comet', label: '彗星扫光' },
  { id: 'pulse', label: '心跳呼吸' },
  { id: 'orbit', label: '行星轨道' },
  { id: 'rays', label: '光芒四射' },
  { id: 'flame', label: '火焰燃烧' },
  { id: 'aurora', label: '极光流动' },
  { id: 'stardust', label: '星尘环绕' },
]

type AvatarStyle = 'ring' | 'rainbow' | 'comet' | 'pulse' | 'orbit' | 'rays' | 'flame' | 'aurora' | 'stardust'

/* 彩虹七色（rainbow 风格专用） */
const RAINBOW_COLORS = ['#ff4d4d', '#ffb347', '#ffe64d', '#4dff94', '#4dc9ff', '#7a7aff', '#d67aff']

/* 颜色插值工具（平滑过渡用）：每帧向目标色逼近，避免突变 */
const lerp = (a: number, b: number, k: number) => a + (b - a) * k
const lerpRgb = (c: Rgb, t: Rgb, k: number): Rgb => ({
  r: lerp(c.r, t.r, k),
  g: lerp(c.g, t.g, k),
  b: lerp(c.b, t.b, k),
})
const nearRgb = (c: Rgb, t: Rgb) =>
  Math.abs(c.r - t.r) < 0.4 && Math.abs(c.g - t.g) < 0.4 && Math.abs(c.b - t.b) < 0.4

/**
 * 圆形音乐头像 + 可自定义光效（9 种风格，结构互不相同）：
 *   · 霓虹星环 —— 霓虹细线 + 内发光环 + 随转亮点
 *   · 彩虹流光 —— 七色环 + 彩虹外光晕
 *   · 彗星扫光 —— 白色彗核 + 长拖尾 + 暗轨道衬托
 *   · 心跳呼吸 —— 双色光晕错峰搏动 + 扩散波纹（lub-dub 双跳）
 *   · 行星轨道 —— 主副双轨道 + 3 颗发光行星公转
 *   · 光芒四射 —— 8 长 8 短交替光芒 + 中心光晕
 *   · 火焰燃烧 —— 底部火焰粒子上升飘散
 *   · 极光流动 —— 宽光带色彩缓慢漂移
 *   · 星尘环绕 —— 12 颗星尘闪烁环绕公转
 */
export default function AvatarGlow({ src, alt = '', size = 96 }: Props) {
  const { playing, analyserRef } = useMusic()
  const fx = useEffects()

  const ringRef = useRef<HTMLDivElement | null>(null)
  const glowRef = useRef<HTMLDivElement | null>(null)
  const haloRef = useRef<HTMLDivElement | null>(null)
  const halo2Ref = useRef<HTMLDivElement | null>(null)
  const waveRef = useRef<HTMLDivElement | null>(null)
  const orbitRef = useRef<HTMLDivElement | null>(null)
  const trackRef = useRef<HTMLDivElement | null>(null)
  const track2Ref = useRef<HTMLDivElement | null>(null)
  const cometRef = useRef<HTMLDivElement | null>(null)
  const coreRef = useRef<HTMLDivElement | null>(null)
  const flameRef = useRef<HTMLDivElement | null>(null)
  const auroraRef = useRef<HTMLDivElement | null>(null)
  const dustRef = useRef<HTMLDivElement | null>(null)
  const colorRef = useRef<[Rgb, Rgb]>(resolveGlowColors(fx.avatarColor, fx.avatarCustomColor, fx.accent, fx.accent2))
  const targetRef = useRef<[Rgb, Rgb]>(colorRef.current)   // 目标色（换色时只更新这里，由过渡循环平滑逼近）
  const [colorTick, setColorTick] = useState(0)            // 换色信号：唤醒颜色过渡循环
  const energyRef = useRef(0)
  const playingRef = useRef(playing)
  playingRef.current = playing

  const on = fx.avatarGlowOn
  const style = fx.avatarStyle
  const intensity = fx.avatarIntensity / 100
  const spread = fx.avatarSize / 100       // 光环厚度/扩散 1-100%
  const speed = fx.avatarSpeed / 100       // 动画速度 0-100%
  const music = fx.avatarMusic
  const sens = fx.avatarSens / 100

  /* 火焰粒子：随机分布（只生成一次，避免每次渲染跳动） */
  const flames = useMemo(() => Array.from({ length: 8 }, () => ({
    left: 14 + Math.random() * 72,
    delay: Math.random() * 2.2,
    dur: 1.5 + Math.random() * 1.8,
    size: 5 + Math.random() * 8,
    warm: Math.random() > 0.35,
  })), [])

  /* 星尘粒子：环形分布 + 随机大小/闪烁节奏 */
  const dust = useMemo(() => Array.from({ length: 12 }, (_, i) => {
    const deg = (i / 12) * 360 + Math.random() * 8
    return {
      deg,
      size: 2.5 + Math.random() * 4.5,
      delay: Math.random() * 2.4,
      dur: 0.9 + Math.random() * 1.6,
      white: Math.random() > 0.45,
    }
  }), [])

  /* 颜色目标：换色 / random 定时 / 主题色变化时只更新 targetRef，由过渡循环平滑逼近（不突变） */
  useEffect(() => {
    targetRef.current = resolveGlowColors(fx.avatarColor, fx.avatarCustomColor, fx.accent, fx.accent2)
    setColorTick((t) => t + 1)   // 唤醒颜色过渡循环
    let timer: ReturnType<typeof setInterval> | null = null
    if (fx.avatarColor === 'random') {
      timer = setInterval(() => {
        targetRef.current = resolveGlowColors(fx.avatarColor, fx.avatarCustomColor, fx.accent, fx.accent2)
        setColorTick((t) => t + 1)
      }, 2500)
    }
    return () => { if (timer) clearInterval(timer) }
     
  }, [fx.avatarColor, fx.avatarCustomColor, fx.accent, fx.accent2])

  /* 颜色平滑过渡循环：每帧把当前色向目标色逼近 7%，到位即停（轻量，不影响音乐循环） */
  useEffect(() => {
    if (!on) return
    let raf = 0
    const tick = () => {
      const [c1, c2] = colorRef.current
      const [t1, t2] = targetRef.current
      const k = 0.07
      const nc1 = nearRgb(c1, t1) ? t1 : lerpRgb(c1, t1, k)
      const nc2 = nearRgb(c2, t2) ? t2 : lerpRgb(c2, t2, k)
      colorRef.current = [nc1, nc2]
      const done = nc1 === t1 && nc2 === t2
      paint(energyRef.current > 0 ? energyRef.current : 0.35)
      if (done) return
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [on, colorTick, fx.avatarStyle, fx.avatarIntensity, fx.avatarSize, fx.avatarColor, fx.avatarCustomColor])

  /* 风格 / 厚度 / 亮度变化时立即重绘（当前能量或待机） */
  useEffect(() => {
    paint(energyRef.current > 0 ? energyRef.current : 0.35)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fx.avatarStyle, fx.avatarIntensity, fx.avatarSize, fx.avatarColor, fx.avatarCustomColor])

  /* 根据当前能量重绘（g: 0-1 音频能量，待机 0.35） */
  const paint = (g: number) => {
    const [a, a2] = colorRef.current
    const o = (0.5 + g * 0.5) * intensity          // 主色不透明度（随能量）
    const o2 = (0.38 + g * 0.48) * intensity       // 副色不透明度

    if (ringRef.current) {
      let bg = ''
      let blur = Math.max(1, Math.round(1 + spread * 5))
      switch (style) {
        case 'rainbow': {
          bg = `conic-gradient(from 0deg, ${RAINBOW_COLORS.map((c, i) => {
            const p = (i / RAINBOW_COLORS.length) * 100
            const next = ((i + 1) / RAINBOW_COLORS.length) * 100
            return `${c} ${p.toFixed(1)}% ${next.toFixed(1)}%`
          }).join(', ')}, ${RAINBOW_COLORS[0]} 100%)`
          ringRef.current.style.opacity = String(0.85 + g * 0.15)
          break
        }
        case 'comet': {
          // 长拖尾：从彗头（12点）向后延伸，末端渐隐
          const tailStart = (52 - g * 10).toFixed(1)
          bg =
            `conic-gradient(from 0deg, transparent 0%, transparent ${tailStart}%, ` +
            `rgba(${a.r},${a.g},${a.b},${(o * 0.3).toFixed(3)}) ${(+tailStart + 10).toFixed(1)}%, ` +
            `rgba(${a.r},${a.g},${a.b},${(o * 0.72).toFixed(3)}) ${(+tailStart + 22).toFixed(1)}%, ` +
            `rgba(${a2.r},${a2.g},${a2.b},${(o2 * 1.15).toFixed(3)}) 96%, transparent 100%)`
          ringRef.current.style.opacity = '1'
          blur = Math.max(1, Math.round(spread * 2))
          break
        }
        case 'rays': {
          // 光芒四射：8 长 8 短交替 + 白色亮心
          const seg = 100 / 16
          const parts: string[] = []
          for (let i = 0; i < 16; i++) {
            const s = i * seg
            const long = i % 2 === 0
            const w = long ? seg * 0.34 : seg * 0.24
            parts.push(`transparent ${s.toFixed(1)}%`)
            parts.push(`rgba(${a.r},${a.g},${a.b},${(o * (long ? 0.8 : 0.5)).toFixed(3)}) ${(s + w * 0.3).toFixed(1)}%`)
            parts.push(`rgba(255,255,255,${(o * 0.95).toFixed(3)}) ${(s + w * 0.45).toFixed(1)}%`)
            parts.push(`rgba(${a.r},${a.g},${a.b},${(o * (long ? 0.8 : 0.5)).toFixed(3)}) ${(s + w * 0.6).toFixed(1)}%`)
            parts.push(`transparent ${(s + w).toFixed(1)}%`)
          }
          bg = `conic-gradient(from 0deg, ${parts.join(', ')})`
          ringRef.current.style.opacity = String(0.85 + g * 0.15)
          blur = Math.max(0, Math.round(spread * 2 - 1))
          break
        }
        default: {
          // 霓虹星环：双色大弧段
          bg =
            `conic-gradient(from 0deg, transparent 0%, rgba(${a.r},${a.g},${a.b},${o.toFixed(3)}) ${(6 + spread * 4).toFixed(1)}%, ` +
            `rgba(${a.r},${a.g},${a.b},${o.toFixed(3)}) ${(24 + spread * 6).toFixed(1)}%, transparent ${(32 + spread * 6).toFixed(1)}%, ` +
            `transparent ${(50 + spread * 4).toFixed(1)}%, rgba(${a2.r},${a2.g},${a2.b},${o2.toFixed(3)}) ${(58 + spread * 4).toFixed(1)}%, ` +
            `rgba(${a2.r},${a2.g},${a2.b},${o2.toFixed(3)}) ${(76 + spread * 6).toFixed(1)}%, transparent ${(84 + spread * 6).toFixed(1)}%)`
          ringRef.current.style.opacity = String(0.85 + g * 0.15)
          break
        }
      }
      ringRef.current.style.background = bg
      ringRef.current.style.filter = `blur(${blur}px)`
    }

    /* 霓虹/彩虹外发光层 */
    if (glowRef.current) {
      glowRef.current.style.boxShadow =
        `0 0 ${(6 + g * 16).toFixed(0)}px rgba(${a.r},${a.g},${a.b},${((0.22 + g * 0.3) * intensity).toFixed(3)}), ` +
        `0 0 ${(18 + g * 26).toFixed(0)}px rgba(${a2.r},${a2.g},${a2.b},${((0.14 + g * 0.2) * intensity).toFixed(3)})`
    }

    /* 心跳主光晕 */
    if (haloRef.current) {
      haloRef.current.style.boxShadow =
        `0 0 ${(10 + g * 22).toFixed(0)}px rgba(${a.r},${a.g},${a.b},${((0.35 + g * 0.5) * intensity).toFixed(3)}), ` +
        `inset 0 0 ${Math.max(2, Math.round(4 + spread * 8))}px rgba(${a.r},${a.g},${a.b},${((0.18 + g * 0.24) * intensity).toFixed(3)})`
    }
    /* 心跳副光晕（副色，错峰） */
    if (halo2Ref.current) {
      halo2Ref.current.style.boxShadow =
        `0 0 ${(16 + g * 30).toFixed(0)}px rgba(${a2.r},${a2.g},${a2.b},${((0.22 + g * 0.32) * intensity).toFixed(3)})`
    }

    /* 行星轨道：主轨道线 + 行星辉光 */
    if (trackRef.current) {
      trackRef.current.style.borderColor = `rgba(${a.r},${a.g},${a.b},${(0.25 + g * 0.45).toFixed(3)})`
      trackRef.current.style.boxShadow = `0 0 ${(4 + g * 10).toFixed(0)}px rgba(${a.r},${a.g},${a.b},${(0.14 + g * 0.26).toFixed(3)})`
    }
    if (track2Ref.current) {
      track2Ref.current.style.borderColor = `rgba(${a2.r},${a2.g},${a2.b},${(0.16 + g * 0.3).toFixed(3)})`
    }
    if (orbitRef.current) {
      orbitRef.current.style.color = `rgb(${Math.round(a.r)}, ${Math.round(a.g)}, ${Math.round(a.b)})`
      orbitRef.current.style.filter =
        `drop-shadow(0 0 ${(3 + g * 8).toFixed(0)}px rgba(${a.r},${a.g},${a.b},${(0.7 + g * 0.3).toFixed(2)}))`
    }

    /* 光芒中心光晕 */
    if (coreRef.current) {
      coreRef.current.style.boxShadow =
        `0 0 ${(8 + g * 20).toFixed(0)}px rgba(${a.r},${a.g},${a.b},${((0.35 + g * 0.4) * intensity).toFixed(3)}), ` +
        `inset 0 0 ${Math.max(3, Math.round(6 + spread * 10))}px rgba(${a.r},${a.g},${a.b},${((0.2 + g * 0.3) * intensity).toFixed(3)})`
    }

    /* 火焰容器：整体亮度随音乐 */
    if (flameRef.current) {
      flameRef.current.style.opacity = String((0.55 + g * 0.45) * (on ? 1 : 0))
    }
    /* 极光：宽光带渐变 + 透明度随音乐 */
    if (auroraRef.current) {
      auroraRef.current.style.background =
        `conic-gradient(from 0deg, transparent 0%, ` +
        `rgba(${a.r},${a.g},${a.b},${(0.5 * intensity).toFixed(3)}) 18%, ` +
        `rgba(${a2.r},${a2.g},${a2.b},${(0.42 * intensity).toFixed(3)}) 38%, ` +
        `rgba(255,255,255,${(0.4 * intensity).toFixed(3)}) 52%, ` +
        `rgba(${a2.r},${a2.g},${a2.b},${(0.42 * intensity).toFixed(3)}) 66%, ` +
        `rgba(${a.r},${a.g},${a.b},${(0.5 * intensity).toFixed(3)}) 84%, transparent 100%)`
      auroraRef.current.style.opacity = String((0.5 + g * 0.5) * (on ? 1 : 0))
    }
    /* 星尘：辉光随音乐 + 颜色跟随插值 */
    if (dustRef.current) {
      dustRef.current.style.color = `rgb(${Math.round(a.r)}, ${Math.round(a.g)}, ${Math.round(a.b)})`
      dustRef.current.style.filter =
        `drop-shadow(0 0 ${(2 + g * 6).toFixed(0)}px rgba(${a.r},${a.g},${a.b},${(0.4 + g * 0.4).toFixed(2)}))`
    }
  }

  /* 音乐能量 → 缩放跳动（CSS 变量驱动，不重启动画，不抽动） */
  const applyBeat = (beat: number) => {
    const v = beat.toFixed(3)
    if (ringRef.current) ringRef.current.style.setProperty('--av-beat', v)
    if (cometRef.current) cometRef.current.style.setProperty('--av-beat', v)
    if (haloRef.current) haloRef.current.style.setProperty('--av-beat', v)
    if (halo2Ref.current) halo2Ref.current.style.setProperty('--av-beat', v)
    if (waveRef.current) waveRef.current.style.setProperty('--av-beat', v)
    if (orbitRef.current) orbitRef.current.style.setProperty('--av-beat', v)
    if (trackRef.current) trackRef.current.style.setProperty('--av-beat', v)
    if (track2Ref.current) track2Ref.current.style.setProperty('--av-beat', v)
    if (coreRef.current) coreRef.current.style.setProperty('--av-beat', v)
    if (flameRef.current) flameRef.current.style.setProperty('--av-beat', v)
    if (auroraRef.current) auroraRef.current.style.setProperty('--av-beat', v)
    if (dustRef.current) dustRef.current.style.setProperty('--av-beat', v)
  }

  /* 播放时随低频能量驱动：跳动缩放 + 亮度；暂停时平滑回落待机 */
  useEffect(() => {
    if (!on) return
    const beatAmp = style === 'pulse' ? 0.26 : style === 'flame' ? 0.3 : style === 'stardust' ? 0.14 : style === 'comet' ? 0.12 : 0.1
    let raf = 0
    const tick = () => {
      const active = !!(playingRef.current && music && analyserRef.current)
      if (active) {
        const analyser = analyserRef.current!
        const data = new Uint8Array(analyser.frequencyBinCount)
        analyser.getByteFrequencyData(data)
        const lowEnd = Math.max(1, Math.floor(data.length / 4))
        let sum = 0
        for (let k = 0; k < lowEnd; k++) sum += data[k]
        const raw = Math.min(1, sum / lowEnd / 255) * sens
        energyRef.current = energyRef.current * 0.7 + raw * 0.3
      } else {
        energyRef.current *= 0.85   // 暂停：能量平滑衰减
      }
      const g = active ? energyRef.current : 0.35
      applyBeat(active ? 1 + energyRef.current * beatAmp : 1)
      paint(g)
      if (!active && energyRef.current < 0.01) return  // 待机稳定，停 rAF 省电
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => { cancelAnimationFrame(raf); applyBeat(1) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, analyserRef, on, music, sens, fx.avatarIntensity, style])

  /* 动画速度：speed=0 静止；播放/暂停不变速 —— 否则 CSS 动画重启会“抽一下” */
  const dur = (base: number) => {
    if (speed <= 0.02) return 'none'
    return `${Math.max(0.5, base / speed).toFixed(1)}s`
  }

  const opacity = on ? 1 : 0

  /* 渲染层判断 */
  const showRing = style === 'ring' || style === 'rainbow' || style === 'comet' || style === 'rays'
  const showGlow = style === 'ring' || style === 'rainbow'
  const showHalo = style === 'pulse'
  const showOrbit = style === 'orbit'
  const ringBase = style === 'rays' ? 14 : style === 'comet' ? 9 : 5.5

  const ringInset = 4 + spread * 8      // 光带离头像边缘距离
  const ringThick = Math.max(3, Math.round(4 + spread * 14))  // 光带厚度
  const cometSize = Math.max(8, Math.round(8 + spread * 9))
  const planetSize = Math.max(9, Math.round(9 + spread * 8))
  const planetSize2 = Math.max(6, Math.round(7 + spread * 6))
  const orbitRadius = size / 2 + 3 + spread * 5
  const orbitRadius2 = size / 2 + 9 + spread * 7

  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      {/* 旋转主环层（霓虹 / 彩虹 / 彗星拖尾 / 光芒） */}
      {showRing && (
        <div
          ref={ringRef}
          className="absolute rounded-full pointer-events-none"
          style={{
            inset: -ringInset,
            opacity,
            transition: 'opacity 0.4s ease',
            animation: speed > 0.02 ? `avatarSpin ${dur(ringBase)} linear infinite` : 'none',
            willChange: 'transform',
            ['--av-beat' as any]: 1,
          }}
        />
      )}

      {/* 外发光层（霓虹 / 彩虹）：静止柔和辉光，增强层次 */}
      {showGlow && (
        <div
          ref={glowRef}
          className="absolute rounded-full pointer-events-none"
          style={{
            inset: -ringInset - 2,
            opacity,
            transition: 'opacity 0.4s ease',
            transform: 'scale(var(--av-beat, 1))',
            ['--av-beat' as any]: 1,
          }}
        />
      )}

      {/* 彗星核心：白色亮核 + 彩色光晕，随拖尾同速旋转 */}
      {style === 'comet' && (
        <div
          ref={cometRef}
          className="absolute rounded-full pointer-events-none"
          style={{
            inset: -ringInset,
            opacity,
            transition: 'opacity 0.4s ease',
            animation: speed > 0.02 ? `avatarSpin ${dur(ringBase)} linear infinite` : 'none',
            willChange: 'transform',
            ['--av-beat' as any]: 1,
          }}
        >
          <span
            className="absolute rounded-full"
            style={{
              left: '50%',
              top: '50%',
              width: cometSize,
              height: cometSize,
              transform: `translate(-${cometSize / 2}px, -${(ringInset + cometSize / 2).toFixed(1)}px)`,
              background: 'radial-gradient(circle, rgba(255,255,255,1) 0%, rgba(255,255,255,0.4) 45%, rgba(255,255,255,0) 72%)',
              boxShadow: `0 0 ${(6 + spread * 8).toFixed(0)}px rgba(255,255,255,0.6), 0 0 ${(14 + spread * 10).toFixed(0)}px rgba(255,255,255,0.25)`,
            }}
          />
        </div>
      )}

      {/* 心跳呼吸（pulse）：双光晕错峰搏动 + 扩散波纹（lub-dub 双跳） */}
      {showHalo && (
        <>
          <div
            ref={halo2Ref}
            className="absolute rounded-full pointer-events-none"
            style={{
              inset: -(8 + spread * 12),
              opacity,
              transition: 'opacity 0.4s ease',
              animation: speed > 0.02 ? `avatarBeat2 ${dur(1.7)} ease-in-out infinite` : 'none',
              willChange: 'transform',
              ['--av-beat' as any]: 1,
            }}
          />
          <div
            ref={haloRef}
            className="absolute rounded-full pointer-events-none"
            style={{
              inset: -(4 + spread * 10),
              opacity,
              transition: 'opacity 0.4s ease',
              animation: speed > 0.02 ? `avatarBeat ${dur(1.7)} ease-in-out infinite` : 'none',
              willChange: 'transform',
              ['--av-beat' as any]: 1,
            }}
          />
          <div
            ref={waveRef}
            className="absolute rounded-full pointer-events-none"
            style={{
              inset: -(4 + spread * 10),
              border: '2px solid rgba(255,255,255,0.55)',
              borderRadius: '50%',
              opacity,
              transition: 'opacity 0.4s ease',
              animation: speed > 0.02 ? `avatarPulseWave ${dur(1.7)} ease-out infinite` : 'none',
              willChange: 'transform, opacity',
              ['--av-beat' as any]: 1,
            }}
          />
        </>
      )}

      {/* 行星轨道（orbit）：主副双轨道 + 3 颗发光行星 */}
      {showOrbit && (
        <>
          <div
            ref={trackRef}
            className="absolute rounded-full pointer-events-none"
            style={{
              inset: -(3 + spread * 5),
              border: '1.5px solid rgba(255,255,255,0.25)',
              borderRadius: '50%',
              opacity,
              transition: 'opacity 0.4s ease, border-color 0.2s ease',
              willChange: 'transform',
              transform: 'scale(var(--av-beat, 1))',
              ['--av-beat' as any]: 1,
            }}
          />
          <div
            ref={track2Ref}
            className="absolute rounded-full pointer-events-none"
            style={{
              inset: -(10 + spread * 7),
              border: '1px dashed rgba(255,255,255,0.18)',
              borderRadius: '50%',
              opacity,
              transition: 'opacity 0.4s ease, border-color 0.2s ease',
              transform: 'scale(var(--av-beat, 1))',
              ['--av-beat' as any]: 1,
            }}
          />
          <div
            ref={orbitRef}
            className="absolute rounded-full pointer-events-none"
            style={{
              inset: -(3 + spread * 5),
              opacity,
              transition: 'opacity 0.4s ease, color 0.35s ease',
              animation: speed > 0.02 ? `avatarSpin ${dur(5)} linear infinite` : 'none',
              willChange: 'transform',
              ['--av-beat' as any]: 1,
            }}
          >
            {[0, 120, 240].map((deg, i) => {
              const ps = i === 1 ? planetSize2 : planetSize
              return (
                <span
                  key={deg}
                  className="absolute rounded-full"
                  style={{
                    width: ps,
                    height: ps,
                    left: '50%',
                    top: '50%',
                    transform: `translate(-50%, -50%) rotate(${deg}deg) translate(0, -${orbitRadius.toFixed(1)}px) scale(var(--av-beat, 1))`,
                    background: i === 1
                      ? 'radial-gradient(circle, rgba(255,255,255,0.95) 0%, currentColor 60%, rgba(255,255,255,0) 100%)'
                      : 'radial-gradient(circle, rgba(255,255,255,1) 0%, currentColor 55%, rgba(255,255,255,0) 100%)',
                    boxShadow: `0 0 ${(5 + spread * 6).toFixed(0)}px currentColor`,
                  }}
                />
              )
            })}
          </div>
          {/* 副轨道反向旋转的小星点 */}
          <div
            className="absolute rounded-full pointer-events-none"
            style={{
              inset: -(10 + spread * 7),
              opacity,
              transition: 'opacity 0.4s ease',
              animation: speed > 0.02 ? `avatarSpinRev ${dur(9)} linear infinite` : 'none',
              willChange: 'transform',
            }}
          >
            <span
              className="absolute rounded-full"
              style={{
                width: 4,
                height: 4,
                left: '50%',
                top: '50%',
                transform: `translate(-50%, -50%) translate(0, -${orbitRadius2.toFixed(1)}px)`,
                background: 'radial-gradient(circle, rgba(255,255,255,1) 0%, rgba(255,255,255,0) 70%)',
                boxShadow: '0 0 6px rgba(255,255,255,0.8)',
              }}
            />
          </div>
        </>
      )}

      {/* 光芒四射中心光晕 */}
      {style === 'rays' && (
        <div
          ref={coreRef}
          className="absolute rounded-full pointer-events-none"
          style={{
            inset: -ringInset,
            opacity,
            transition: 'opacity 0.4s ease',
            transform: 'scale(var(--av-beat, 1))',
            ['--av-beat' as any]: 1,
          }}
        />
      )}

      {/* 火焰燃烧（flame）：8 颗火焰粒子上升飘散 */}
      {style === 'flame' && (
        <div
          ref={flameRef}
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            zIndex: 15,
            transition: 'opacity 0.3s ease',
            transform: 'scale(var(--av-beat, 1))',
            ['--av-beat' as any]: 1,
          }}
        >
          {flames.map((f, i) => (
            <span
              key={i}
              className="absolute rounded-full"
              style={{
                left: `${f.left}%`,
                bottom: '10%',
                width: f.size,
                height: f.size,
                background: f.warm
                  ? 'radial-gradient(circle, rgba(255,244,200,0.95) 0%, rgba(255,170,60,0.8) 45%, rgba(255,80,40,0) 75%)'
                  : 'radial-gradient(circle, rgba(255,255,255,0.9) 0%, rgba(160,220,255,0.7) 45%, rgba(80,140,255,0) 75%)',
                boxShadow: f.warm
                  ? `0 0 ${(4 + spread * 5).toFixed(0)}px rgba(255,150,50,0.7)`
                  : `0 0 ${(4 + spread * 5).toFixed(0)}px rgba(120,180,255,0.7)`,
                animation: speed > 0.02 ? `avatarFlame ${(f.dur / Math.max(speed, 0.2)).toFixed(2)}s ease-out ${f.delay}s infinite` : 'none',
              }}
            />
          ))}
        </div>
      )}

      {/* 极光流动（aurora）：宽光带色彩缓慢漂移 */}
      {style === 'aurora' && (
        <div
          ref={auroraRef}
          className="absolute rounded-full pointer-events-none"
          style={{
            inset: -(4 + spread * 10),
            transition: 'opacity 0.4s ease',
            animation: speed > 0.02
              ? `avatarSpin ${dur(12)} linear infinite, avatarAurora ${Math.max(6, 14 / Math.max(speed, 0.2)).toFixed(1)}s linear infinite`
              : 'none',
            willChange: 'transform, filter',
            ['--av-beat' as any]: 1,
          }}
        />
      )}

      {/* 星尘环绕（stardust）：12 颗星尘闪烁公转 */}
      {style === 'stardust' && (
        <div
          ref={dustRef}
          className="absolute rounded-full pointer-events-none"
          style={{
            inset: -ringInset,
            transition: 'opacity 0.4s ease, color 0.35s ease',
            animation: speed > 0.02 ? `avatarSpin ${dur(16)} linear infinite` : 'none',
            willChange: 'transform',
            ['--av-beat' as any]: 1,
          }}
        >
          {dust.map((d, i) => {
            const rad = (d.deg * Math.PI) / 180
            const x = Math.cos(rad) * orbitRadius
            const y = Math.sin(rad) * orbitRadius
            return (
              <span
                key={i}
                className="absolute rounded-full"
                style={{
                  width: d.size,
                  height: d.size,
                  left: `calc(50% + ${x.toFixed(1)}px)`,
                  top: `calc(50% + ${y.toFixed(1)}px)`,
                  transform: 'translate(-50%, -50%)',
                  background: d.white
                    ? 'radial-gradient(circle, rgba(255,255,255,1) 0%, rgba(255,255,255,0.35) 60%, rgba(255,255,255,0) 100%)'
                    : 'radial-gradient(circle, rgba(255,255,255,1) 0%, currentColor 60%, rgba(255,255,255,0) 100%)',
                  animation: speed > 0.02 ? `avatarTwinkle ${d.dur}s ease-in-out ${d.delay}s infinite` : 'none',
                }}
              />
            )
          })}
        </div>
      )}

      {/* 头像本体：圆形裁剪，不再旋转 */}
      {src ? (
        <>
          <img
            src={src}
            alt={alt}
            className="relative z-10 w-full h-full rounded-full object-cover"
            style={{
              border: '2px solid rgba(255,255,255,0.18)',
              boxShadow: '0 2px 14px rgba(0,0,0,0.35), inset 0 0 8px rgba(0,0,0,0.18)',
            }}
            referrerPolicy="no-referrer"
          />
          <div
            className="absolute inset-0 rounded-full pointer-events-none z-20"
            style={{
              background: 'linear-gradient(145deg, rgba(255,255,255,0.28) 0%, rgba(255,255,255,0.07) 38%, transparent 52%)',
            }}
          />
        </>
      ) : (
        <>
          <div
            className="relative z-10 w-full h-full rounded-full flex items-center justify-center"
            style={{
              background: 'var(--accent-muted)',
              color: 'var(--accent)',
              border: '2px solid rgba(255,255,255,0.18)',
              boxShadow: '0 2px 14px rgba(0,0,0,0.35), inset 0 0 8px rgba(0,0,0,0.18)',
            }}
          >
            <svg className="w-2/5 h-2/5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.303z" />
            </svg>
          </div>
          <div
            className="absolute inset-0 rounded-full pointer-events-none z-20"
            style={{
              background: 'linear-gradient(145deg, rgba(255,255,255,0.28) 0%, rgba(255,255,255,0.07) 38%, transparent 52%)',
            }}
          />
        </>
      )}
      <style>{`
        @keyframes avatarSpin {
          to { transform: rotate(360deg) scale(var(--av-beat, 1)); }
        }
        @keyframes avatarSpinRev {
          from { transform: rotate(360deg); }
          to { transform: rotate(0deg); }
        }
        @keyframes avatarBeat {
          0%, 100% { transform: scale(var(--av-beat, 1)); }
          14% { transform: scale(calc(var(--av-beat, 1) * 1.18)); }
          28% { transform: scale(var(--av-beat, 1)); }
          42% { transform: scale(calc(var(--av-beat, 1) * 1.07)); }
          56% { transform: scale(var(--av-beat, 1)); }
        }
        @keyframes avatarBeat2 {
          0%, 100% { transform: scale(var(--av-beat, 1)); }
          20% { transform: scale(calc(var(--av-beat, 1) * 1.3)); }
          45% { transform: scale(var(--av-beat, 1)); }
          65% { transform: scale(calc(var(--av-beat, 1) * 1.12)); }
          80% { transform: scale(var(--av-beat, 1)); }
        }
        @keyframes avatarPulseWave {
          0% { transform: scale(var(--av-beat, 1)); opacity: 0.55; }
          70% { transform: scale(calc(var(--av-beat, 1) * 1.35)); opacity: 0; }
          100% { transform: scale(calc(var(--av-beat, 1) * 1.35)); opacity: 0; }
        }
        @keyframes avatarFlame {
          0% { transform: translate(-50%, 0) scale(1); opacity: 0.95; }
          100% { transform: translate(-50%, -78px) scale(0.3); opacity: 0; }
        }
        @keyframes avatarAurora {
          0% { filter: hue-rotate(0deg); }
          100% { filter: hue-rotate(360deg); }
        }
        @keyframes avatarTwinkle {
          0%, 100% { opacity: 0.25; transform: translate(-50%, -50%) scale(0.8); }
          50% { opacity: 1; transform: translate(-50%, -50%) scale(1.25); }
        }
      `}</style>
    </div>
  )
}
