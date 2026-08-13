'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface GalleryImage {
  id: number
  albumId: number
  filename: string
  thumbnail?: string | null
  sortOrder: number
  createdAt: string
}

interface AlbumDetail {
  id: number
  title: string
  cover?: string | null
  sortOrder: number
  createdAt: string
  images: GalleryImage[]
}

export default function AlbumPage({ params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const [album, setAlbum] = useState<AlbumDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const [id, setId] = useState('')

  useEffect(() => {
    paramsPromise.then(p => setId(p.id))
  }, [paramsPromise])

  useEffect(() => {
    if (!id) return

    setLoading(true)
    setNotFound(false)

    fetch(`/api/albums/${id}`)
      .then(res => {
        if (res.status === 404) {
          setNotFound(true)
          return null
        }
        if (!res.ok) throw new Error('获取相册失败')
        return res.json()
      })
      .then(data => {
        if (data && data.album) setAlbum(data.album)
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [id])

  const closeLightbox = () => setLightboxIndex(null)

  const prevImage = () => {
    if (lightboxIndex === null || !album) return
    setLightboxIndex(lightboxIndex > 0 ? lightboxIndex - 1 : album.images.length - 1)
  }

  const nextImage = () => {
    if (lightboxIndex === null || !album) return
    setLightboxIndex(lightboxIndex < album.images.length - 1 ? lightboxIndex + 1 : 0)
  }

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (lightboxIndex === null) return
      if (e.key === 'Escape') closeLightbox()
      if (e.key === 'ArrowLeft') prevImage()
      if (e.key === 'ArrowRight') nextImage()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [lightboxIndex, album])

  const getImageUrl = (img: GalleryImage) => {
    return img.thumbnail || `/uploads/gallery/${img.filename}`
  }

  if (!id || loading) {
    return (
      <div className="w-full py-12">
        <div className="content-container">
          <div className="max-w-6xl mx-auto">
            <Link href="/gallery" className="inline-flex items-center gap-1 text-sm mb-8 hover:underline" style={{ color: 'var(--accent)' }}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
              </svg>
              返回相册
            </Link>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5">
              {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                <div key={i} className="glass-card overflow-hidden animate-pulse aspect-square">
                  <div className="w-full h-full bg-white/10" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (notFound || !album) {
    return (
      <div className="w-full py-12">
        <div className="content-container">
          <div className="max-w-6xl mx-auto">
            <Link href="/gallery" className="inline-flex items-center gap-1 text-sm mb-8 hover:underline" style={{ color: 'var(--accent)' }}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
              </svg>
              返回相册
            </Link>

            <div className="glass-card p-16 text-center">
              <div className="w-20 h-20 mx-auto mb-6 rounded-2xl flex items-center justify-center" style={{ background: 'var(--glass-bg)', color: 'var(--accent)' }}>
                <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
                相册不存在
              </h2>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                可能已被删除或链接有误
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full py-12">
      <div className="content-container">
        <div className="max-w-6xl mx-auto">
          <Link href="/gallery" className="inline-flex items-center gap-1 text-sm mb-8 hover:underline" style={{ color: 'var(--accent)' }}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            返回相册
          </Link>

          <div className="mb-10">
            <h1 className="text-3xl sm:text-4xl font-bold" style={{ color: 'var(--text-primary)' }}>
              {album.title}
            </h1>
            <p className="text-sm mt-2" style={{ color: 'var(--text-secondary)' }}>
              {album.images.length} 张照片
            </p>
          </div>

          {album.images.length === 0 ? (
            <div className="glass-card p-16 text-center">
              <p className="text-lg" style={{ color: 'var(--text-secondary)' }}>
                这个相册还没有照片
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5">
              {album.images.map((img, index) => (
                <button
                  key={img.id}
                  onClick={() => setLightboxIndex(index)}
                  className="glass-card overflow-hidden group cursor-pointer aspect-square p-0 border-0"
                >
                  <div className="w-full h-full relative overflow-hidden rounded-2xl">
                    <img
                      src={getImageUrl(img)}
                      alt={`${album.title} - ${index + 1}`}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    <div
                      className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                      style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.3) 0%, transparent 50%)' }}
                    />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && album && album.images[lightboxIndex] && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0, 0, 0, 0.85)', backdropFilter: 'blur(12px)' }}
          onClick={closeLightbox}
        >
          <button
            onClick={closeLightbox}
            className="absolute top-6 right-6 z-50 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110"
            style={{ background: 'rgba(255,255,255,0.1)', color: '#fff' }}
            aria-label="关闭"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <button
            onClick={e => { e.stopPropagation(); prevImage() }}
            className="absolute left-4 sm:left-8 z-50 w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110"
            style={{ background: 'rgba(255,255,255,0.1)', color: '#fff' }}
            aria-label="上一张"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>

          <img
            src={getImageUrl(album.images[lightboxIndex])}
            alt={`${album.title} - ${lightboxIndex + 1}`}
            className="max-w-[90vw] max-h-[85vh] object-contain rounded-2xl select-none"
            onClick={e => e.stopPropagation()}
            style={{ boxShadow: '0 24px 80px rgba(0,0,0,0.6)' }}
          />

          <button
            onClick={e => { e.stopPropagation(); nextImage() }}
            className="absolute right-4 sm:right-8 z-50 w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110"
            style={{ background: 'rgba(255,255,255,0.1)', color: '#fff' }}
            aria-label="下一张"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </button>

          <div
            className="absolute bottom-8 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full text-sm"
            style={{ background: 'rgba(0,0,0,0.5)', color: '#fff' }}
          >
            {lightboxIndex + 1} / {album.images.length}
          </div>
        </div>
      )}
    </div>
  )
}