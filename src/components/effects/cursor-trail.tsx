'use client'

import { useEffect, useRef } from 'react'
import { useEffects } from '@/lib/effects-context'

/**
 * 高级鼠标拖尾引擎（canvas）
 * 5 种风格：dots 光点链 / ribbon 发光丝带 / sparkle 星尘 / comet 彗星 / neon 霓虹
 * 4 种颜色：accent 跟随主色 / gradient 主色渐变 / custom 自定义取色 / random 随机彩色
 * 参数：长度、大小、透明度、发光强度 —— 全部实时可调
 */

type TrailStyle = 'dots' | 'ribbon' | 'sparkle' | 'comet' | 'neon'
type TrailColor = 'accent' | 'gradient' | 'custom' | 'random'

interface Cfg {
  length: number
  size: number
  style: TrailStyle
  color: TrailColor
  custom: string
  opacity: number
  glow: number
}

type RGB = [number, number, number]

function hexToRgb(hex: string): RGB {
  let m = hex.replace('#', '').trim()
  if (m.length === 3) m = m.split('').map((c) => c + c).join('')
  const n = parseInt(m, 16)
  if (Number.isNaN(n)) return [139, 124, 255]
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function rgba(c: RGB, a: number): string {
  return `rgba(${c[0]},${c[1]},${c[2]},${Math.max(0, Math.min(1, a))})`
}

function mix(c1: RGB, c2: RGB, t: number): RGB {
  const k = Math.max(0, Math.min(1, t))
  return [c1[0] + (c2[0] - c1[0]) * k, c1[1] + (c2[1] - c1[1]) * k, c1[2] + (c2[2] - c1[2]) * k]
}

interface Particle {
  x: number; y: number
  vx: number; vy: number
  life: number; maxLife: number
  size: number
  seed: number
}

export default function CursorTrail() {
  const { trailOn, trailLength, trailSize, trailStyle, trailColor, trailCustomColor, trailOpacity, trailGlow } = useEffects()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const cfgRef = useRef<Cfg>({ length: trailLength, size: trailSize, style: trailStyle, color: trailColor, custom: trailCustomColor, opacity: trailOpacity, glow: trailGlow })
  cfgRef.current = { length: trailLength, size: trailSize, style: trailStyle, color: trailColor, custom: trailCustomColor, opacity: trailOpacity, glow: trailGlow }

  useEffect(() => {
    if (!trailOn) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const resize = () => {
      canvas.width = window.innerWidth * dpr
      canvas.height = window.innerHeight * dpr
      canvas.style.width = `${window.innerWidth}px`
      canvas.style.height = `${window.innerHeight}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    window.addEventListener('resize', resize)

    /* 每帧读取 CSS 变量中的当前主色/辅色/自定义色 */
    const readColors = (): { c1: RGB; c2: RGB; custom: RGB } => {
      let a = '#8b7cff', b = '#45d4e4', c = '#ff6b9d'
      try {
        const st = getComputedStyle(document.documentElement)
        a = st.getPropertyValue('--accent').trim() || a
        b = st.getPropertyValue('--accent-2').trim() || b
        c = st.getPropertyValue('--trail-custom-color').trim() || c
      } catch { /* ignore */ }
      return { c1: hexToRgb(a), c2: hexToRgb(b), custom: hexToRgb(c) }
    }

    /* 粒子链（dots / ribbon 共用） */
    const chain = Array.from({ length: Math.max(5, cfgRef.current.length) }, () => ({
      x: window.innerWidth / 2, y: window.innerHeight / 2,
    }))
    let mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2, vx: 0, vy: 0 }

    /* 通用粒子池（sparkle / comet / neon 共用） */
    const particles: Particle[] = []
    let lastSpawn = 0

    let raf = 0

    const onMove = (e: MouseEvent) => {
      mouse = { x: e.clientX, y: e.clientY, vx: e.clientX - mouse.x, vy: e.clientY - mouse.y }
    }
    window.addEventListener('mousemove', onMove)

    const tick = (t: number) => {
      raf = requestAnimationFrame(tick)
      const { length: len, size: sz, style, color, custom, opacity, glow } = cfgRef.current
      const { c1, c2, custom: cc } = readColors()
      const alphaBase = opacity / 100
      const W = window.innerWidth, H = window.innerHeight
      ctx.clearRect(0, 0, W, H)
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'

      /* 取色：tt 0=头 1=尾，seed 粒子随机种子（random 模式用），t 时间（流动色相） */
      const colStr = (tt: number, seed: number, tNow: number, a: number): string => {
        if (color === 'random') return `hsla(${(seed * 137.508 + tt * 90 + tNow * 0.02) % 360}, 88%, 62%, ${Math.max(0, Math.min(1, a))})`
        if (color === 'gradient') return rgba(mix(c1, c2, tt), a)
        if (color === 'custom') return rgba(cc || c1, a)
        return rgba(c1, a)
      }
      /* 火焰已移除，无需专用取色 */

      /* ---- 链式风格：更新粒子链 ---- */
      const count = Math.max(5, len)
      while (chain.length < count) chain.push({ x: mouse.x, y: mouse.y })
      while (chain.length > count) chain.pop()
      chain[0].x += (mouse.x - chain[0].x) * 0.5
      chain[0].y += (mouse.y - chain[0].y) * 0.5
      for (let i = 1; i < chain.length; i++) {
        const p = chain[i], prev = chain[i - 1]
        p.x += (prev.x - p.x) * 0.3
        p.y += (prev.y - p.y) * 0.3
      }

      const speed = Math.hypot(mouse.vx, mouse.vy)

      if (style === 'ribbon') {
        /* 发光丝带：分段渐变描边，圆头衔接成连续绸带 */
        const n = chain.length
        for (let i = 0; i < n - 1; i++) {
          const p1 = chain[i], p2 = chain[i + 1]
          const tt = i / (n - 1)
          const col = colStr(tt, i * 1.3, t, alphaBase * (1 - tt * 0.75))
          ctx.beginPath()
          ctx.moveTo(p1.x, p1.y)
          ctx.lineTo(p2.x, p2.y)
          ctx.strokeStyle = col
          ctx.lineWidth = Math.max(1, sz * (1 - tt * 0.45))
          ctx.shadowColor = col
          ctx.shadowBlur = glow
          ctx.stroke()
        }
        const head = chain[0]
        ctx.beginPath()
        ctx.arc(head.x, head.y, Math.max(2, sz * 0.95), 0, Math.PI * 2)
        ctx.fillStyle = colStr(0, 0, t, alphaBase)
        ctx.shadowColor = colStr(0, 0, t, alphaBase)
        ctx.shadowBlur = glow * 1.4
        ctx.fill()
      } else if (style === 'dots') {
        /* 光点链：大小/透明度渐变，带发光 */
        const n = chain.length
        for (let i = n - 1; i >= 0; i--) {
          const p = chain[i]
          const tt = (n - 1 - i) / (n - 1)
          const a = alphaBase * (1 - tt * 0.85)
          if (a <= 0.015) continue
          const r = Math.max(0.6, sz * (1 - tt * 0.72))
          const col = colStr(tt, i * 0.7, t, a)
          ctx.beginPath()
          ctx.arc(p.x, p.y, r, 0, Math.PI * 2)
          ctx.fillStyle = col
          ctx.shadowColor = col
          ctx.shadowBlur = glow
          ctx.fill()
        }
      } else {
        /* ---- 粒子类风格 ---- */

        /* 按风格生成粒子 */
        if (style === 'sparkle') {
          const spawnInterval = Math.max(50, 130 - speed * 6)
          if (t - lastSpawn > spawnInterval) {
            lastSpawn = t
            const n = 1 + Math.floor(speed / 10)
            for (let k = 0; k < n; k++) {
              const ang = Math.random() * Math.PI * 2
              const sp = 0.4 + Math.random() * (0.9 + speed * 0.04)
              particles.push({
                x: mouse.x, y: mouse.y,
                vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp,
                life: 0, maxLife: 40 + Math.random() * 50,
                size: 1 + Math.random() * Math.max(1, sz * 0.55),
                seed: Math.random() * 1000,
              })
            }
          }
        } else if (style === 'comet') {
          /* 彗星：鼠标移动时拖出带尾巴的彗星粒子 */
          if (speed > 2.5 && t - lastSpawn > 22) {
            lastSpawn = t
            particles.push({
              x: mouse.x, y: mouse.y,
              vx: -mouse.vx * 0.45 + (Math.random() - 0.5) * 0.8,
              vy: -mouse.vy * 0.45 + (Math.random() - 0.5) * 0.8,
              life: 0, maxLife: 30 + Math.random() * 22,
              size: Math.max(1.5, sz * (0.8 + Math.random() * 0.6)),
              seed: Math.random() * 1000,
            })
          }
        } else if (style === 'neon') {
          /* 霓虹：大发光光球跟随鼠标漂移，重叠成霓虹光带 */
          if (t - lastSpawn > 45) {
            lastSpawn = t
            particles.push({
              x: mouse.x, y: mouse.y,
              vx: 0, vy: 0,
              life: 0, maxLife: 90 + Math.random() * 60,
              size: sz * (1.8 + Math.random() * 1.6),
              seed: Math.random() * 1000,
            })
          }
        }

        /* 粒子池上限（随拖尾长度缩放） */
        const cap = Math.max(60, len * 22)
        if (particles.length > cap) particles.splice(0, particles.length - cap)

        /* 更新 + 绘制 */
        for (let i = particles.length - 1; i >= 0; i--) {
          const p = particles[i]
          p.life++

          if (style === 'neon') {
            /* 光球缓动跟随鼠标，微漂移 */
            p.x += (mouse.x - p.x) * 0.045 + (Math.random() - 0.5) * 0.7
            p.y += (mouse.y - p.y) * 0.045 + (Math.random() - 0.5) * 0.7
          } else {
            p.x += p.vx
            p.y += p.vy
            p.vx *= 0.972
            p.vy *= 0.972
          }

          const lifeT = p.life / p.maxLife
          if (lifeT >= 1) { particles.splice(i, 1); continue }

          if (style === 'sparkle') {
            const tw = 0.55 + 0.45 * Math.sin(p.seed + p.life * 0.45)
            const a = alphaBase * (1 - lifeT) * tw
            const col = colStr(lifeT, p.seed, t, a)
            ctx.beginPath()
            ctx.arc(p.x, p.y, p.size * (1 - lifeT * 0.5), 0, Math.PI * 2)
            ctx.fillStyle = col
            ctx.shadowColor = col
            ctx.shadowBlur = glow * 0.8
            ctx.fill()
            if (p.size > 1.5) {
              const l = p.size * (1.3 + lifeT) * 2.4
              ctx.beginPath()
              ctx.moveTo(p.x - l, p.y)
              ctx.lineTo(p.x + l, p.y)
              ctx.moveTo(p.x, p.y - l)
              ctx.lineTo(p.x, p.y + l)
              ctx.strokeStyle = col
              ctx.lineWidth = 0.8
              ctx.shadowBlur = 0
              ctx.stroke()
            }
          } else if (style === 'comet') {
            /* 彗星：头部亮核 + 沿速度反方向拉长的渐变尾 */
            const a = alphaBase * (1 - lifeT * 0.92)
            const col = colStr(lifeT, p.seed, t, a)
            const tailLen = p.size * (7 - lifeT * 3)
            const tx = p.x - p.vx * tailLen * 0.28
            const ty = p.y - p.vy * tailLen * 0.28
            const grad = ctx.createLinearGradient(p.x, p.y, tx, ty)
            grad.addColorStop(0, col)
            grad.addColorStop(1, rgba([0, 0, 0], 0))
            ctx.beginPath()
            ctx.moveTo(p.x, p.y)
            ctx.lineTo(tx, ty)
            ctx.strokeStyle = grad
            ctx.lineWidth = Math.max(0.5, p.size * (1 - lifeT * 0.6))
            ctx.shadowColor = col
            ctx.shadowBlur = glow * 1.1
            ctx.stroke()
            /* 亮核 */
            const core = Math.max(1.2, p.size * 0.55 * (1 - lifeT * 0.4))
            ctx.beginPath()
            ctx.arc(p.x, p.y, core, 0, Math.PI * 2)
            ctx.fillStyle = color === 'custom' || color === 'random' ? col : rgba(mix([255, 255, 255], c1, 0.35), a)
            ctx.shadowBlur = glow * 1.8
            ctx.fill()
          } else if (style === 'neon') {
            /* 霓虹光球：大光晕，缓慢渐隐 */
            const a = alphaBase * (1 - lifeT) * 0.85
            const col = colStr(lifeT, p.seed, t, a)
            ctx.beginPath()
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
            ctx.fillStyle = col
            ctx.shadowColor = col
            ctx.shadowBlur = Math.max(6, glow * 2.2)
            ctx.fill()
            /* 内芯更亮 */
            ctx.beginPath()
            ctx.arc(p.x, p.y, p.size * 0.45, 0, Math.PI * 2)
            ctx.fillStyle = color === 'custom' || color === 'random' ? col : rgba(mix([255, 255, 255], c1, 0.4), a * 0.85)
            ctx.fill()
          }
        }
      }

      ctx.shadowBlur = 0
    }
    tick(performance.now())

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('resize', resize)
    }
  }, [trailOn])

  if (!trailOn) return null

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-[60]"
      aria-hidden
    />
  )
}
