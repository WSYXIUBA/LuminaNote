'use client'

import { useState, useEffect, useCallback } from 'react'

export interface LightboxProps {
  /** 图片 URL 数组 */
  images: string[]
  /** 当前显示的图片索引 */
  index: number
  /** 关闭灯箱 */
  onClose: () => void
  /** 切换图片，参数为新的索引 */
  onNavigate: (newIndex: number) => void
}

/**
 * 全屏灯箱组件
 *
 * - 键盘：← → 切换，ESC 关闭
 * - 点击背景/关闭按钮关闭
 * - 底部显示计数器
 */
export default function Lightbox({
  images,
  index,
  onClose,
  onNavigate,
}: LightboxProps) {
  const [loaded, setLoaded] = useState(false)

  // 切换图片时重置加载状态
  useEffect(() => {
    setLoaded(false)
    const timer = setTimeout(() => setLoaded(true), 50)
    return () => clearTimeout(timer)
  }, [index])

  // 键盘事件
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          onClose()
          break
        case 'ArrowLeft':
          if (index > 0) onNavigate(index - 1)
          break
        case 'ArrowRight':
          if (index < images.length - 1) onNavigate(index + 1)
          break
      }
    },
    [index, images.length, onClose, onNavigate]
  )

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [handleKeyDown])

  // 点击背景关闭
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      style={{
        background: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(8px)',
      }}
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-label="图片灯箱"
    >
      {/* 关闭按钮 */}
      <button
        onClick={onClose}
        className="fixed top-6 right-6 z-[101] flex items-center justify-center w-10 h-10 rounded-full transition-opacity duration-200 hover:opacity-80"
        style={{ background: 'rgba(255,255,255,0.1)', color: '#fff' }}
        aria-label="关闭"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>

      {/* 上一张 */}
      {index > 0 && (
        <button
          onClick={() => onNavigate(index - 1)}
          className="fixed left-6 top-1/2 -translate-y-1/2 z-[101] flex items-center justify-center w-12 h-12 rounded-full transition-all duration-200 hover:scale-110"
          style={{ background: 'rgba(255,255,255,0.1)', color: '#fff' }}
          aria-label="上一张"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.75 19.5L8.25 12l7.5-7.5"
            />
          </svg>
        </button>
      )}

      {/* 图片主体 */}
      <div
        className="relative transition-all duration-300 ease-out"
        style={{
          opacity: loaded ? 1 : 0,
          transform: loaded ? 'scale(1)' : 'scale(0.95)',
          maxWidth: '90vw',
          maxHeight: '85vh',
        }}
      >
        <img
          src={images[index]}
          alt={`图片 ${index + 1}`}
          className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg shadow-2xl"
          onLoad={() => setLoaded(true)}
        />
      </div>

      {/* 下一张 */}
      {index < images.length - 1 && (
        <button
          onClick={() => onNavigate(index + 1)}
          className="fixed right-6 top-1/2 -translate-y-1/2 z-[101] flex items-center justify-center w-12 h-12 rounded-full transition-all duration-200 hover:scale-110"
          style={{ background: 'rgba(255,255,255,0.1)', color: '#fff' }}
          aria-label="下一张"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8.25 4.5l7.5 7.5-7.5 7.5"
            />
          </svg>
        </button>
      )}

      {/* 底部计数器 */}
      <div
        className="fixed bottom-8 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full text-sm"
        style={{
          background: 'rgba(0,0,0,0.5)',
          color: '#fff',
        }}
      >
        {index + 1} / {images.length}
      </div>
    </div>
  )
}