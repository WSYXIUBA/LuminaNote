'use client'

import { useEffect } from 'react'
import { useEffects } from '@/lib/effects-context'

/**
 * 卡片 3D 下压效果（tilt）：
 * 鼠标进入带 data-tilt 的卡片时，根据鼠标在卡片内的位置，
 * 实时计算 rotateX / rotateY —— 鼠标指向哪一角，哪一角就下压。
 * 由效果控制面板开关（tiltOn）。
 */
export default function TiltEffect() {
  const { tiltOn } = useEffects()

  useEffect(() => {
    if (!tiltOn) return

    let current: Element | null = null

    const applyTilt = (el: Element, e: MouseEvent) => {
      const r = el.getBoundingClientRect()
      const px = (e.clientX - r.left) / r.width   // 0=左 1=右
      const py = (e.clientY - r.top) / r.height   // 0=上 1=下
      // 鼠标在上方 → 上方翘起（下方下压）；鼠标在左边 → 左翘右压
      const rx = (0.5 - py) * 8   // 绕 X 轴：上下压
      const ry = (px - 0.5) * 10  // 绕 Y 轴：左右压
      ;(el as HTMLElement).style.setProperty('--tilt-x', `${rx.toFixed(2)}deg`)
      ;(el as HTMLElement).style.setProperty('--tilt-y', `${ry.toFixed(2)}deg`)
      el.classList.add('tilt-active')
    }

    const onOver = (e: MouseEvent) => {
      const el = (e.target as Element).closest?.('[data-tilt]')
      if (el && el !== current) {
        if (current) current.classList.remove('tilt-active')
        current = el
        applyTilt(el, e)
      }
    }

    const onMove = (e: MouseEvent) => {
      if (current) applyTilt(current, e)
    }

    const onOut = (e: MouseEvent) => {
      const el = (e.target as Element).closest?.('[data-tilt]')
      if (el && el === current && !el.contains(e.relatedTarget as Node | null)) {
        el.classList.remove('tilt-active')
        current = null
      }
    }

    document.addEventListener('mouseover', onOver)
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseout', onOut)
    return () => {
      document.removeEventListener('mouseover', onOver)
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseout', onOut)
    }
  }, [tiltOn])

  return null
}
