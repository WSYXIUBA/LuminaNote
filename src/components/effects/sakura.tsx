'use client'

import { useEffect, useState } from 'react'
import { useEffects } from '@/lib/effects-context'

interface Petal {
  id: number
  left: string
  size: number
  duration: number
  delay: number
  type: 'sakura' | 'leaf'
  drift: number // 水平漂移距离 vw
  spin: number  // 旋转方向
}

/** 樱花 / 绿叶 / 混合 的落叶效果，类型由效果控制面板选择 */
export default function Sakura() {
  const { leafType } = useEffects()
  const [petals, setPetals] = useState<Petal[]>([])

  useEffect(() => {
    let density = 0.6
    try {
      const v = getComputedStyle(document.documentElement).getPropertyValue('--effect-density').trim()
      if (v) density = parseFloat(v)
    } catch { /* ignore */ }

    const count = Math.round(45 * density)
    const generated = Array.from({ length: count }).map((_, i) => {
      // 根据 leafType 决定类型
      let type: Petal['type'] = 'sakura'
      if (leafType === 'leaf') type = 'leaf'
      else if (leafType === 'mix') type = Math.random() > 0.5 ? 'sakura' : 'leaf'
      return {
        id: i,
        left: `${Math.random() * 100}%`,
        size: type === 'leaf' ? 9 + Math.random() * 8 : 8 + Math.random() * 12,
        duration: 6 + Math.random() * 8,
        delay: Math.random() * -15,
        type,
        drift: 8 + Math.random() * 18,
        spin: Math.random() > 0.5 ? 1 : -1,
      }
    })
    setPetals(generated)
  }, [leafType])

  return (
    <div className="fixed inset-0 w-full h-full pointer-events-none z-[2] overflow-hidden">
      <style>{`
        @keyframes leafFall {
          0% { transform: translate(0, -10vh) rotate(0deg); opacity: 0; }
          10% { opacity: 1; }
          80% { opacity: 1; }
          100% { transform: translate(var(--drift), 110vh) rotate(var(--spin-end)); opacity: 0; }
        }
      `}</style>

      {petals.map((p) => (
        <div
          key={p.id}
          className="absolute top-0"
          style={{
            left: p.left,
            width: `${p.size}px`,
            height: `${p.size * (p.type === 'leaf' ? 0.9 : 1.2)}px`,
            borderRadius: p.type === 'leaf' ? '0 100% 0 100%' : '100% 0 100% 0',
            background:
              p.type === 'leaf'
                ? 'linear-gradient(135deg, rgba(74,222,128,0.55), rgba(34,197,94,0.5))'
                : 'linear-gradient(135deg, rgba(255,182,213,0.75), rgba(251,113,133,0.6))',
            boxShadow:
              p.type === 'leaf'
                ? '0 0 5px rgba(74,222,128,0.4)'
                : '0 0 5px rgba(255,182,193,0.6)',
            ['--drift' as string]: `${p.drift}vw`,
            ['--spin-end' as string]: `${p.spin * 360}deg`,
            animation: `leafFall ${p.duration}s linear infinite`,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
    </div>
  )
}
