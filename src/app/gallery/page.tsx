'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface AlbumItem {
  id: number
  title: string
  cover?: string | null
  sortOrder: number
  createdAt: string
  _count: { images: number }
}

export default function GalleryPage() {
  const [albums, setAlbums] = useState<AlbumItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/albums')
      .then(res => res.json())
      .then(data => {
        if (data.albums) setAlbums(data.albums)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="w-full py-16 md:py-20">
      <div className="content-container">
        <div className="max-w-6xl mx-auto">
          {/* 头部 */}
          <div className="mb-14 md:mb-16 text-center">
            <h1 className="text-4xl sm:text-5xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
              光影<span className="gradient-text">相册</span>
            </h1>
            <p className="text-lg" style={{ color: 'var(--text-secondary)' }}>
              用镜头定格瞬间
            </p>
          </div>

          {/* 相册列表 */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-10">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="glass-card overflow-hidden animate-pulse">
                  <div className="h-52 bg-white/10" />
                  <div className="p-5">
                    <div className="h-5 bg-white/10 rounded w-2/3 mb-2" />
                    <div className="h-4 bg-white/10 rounded w-1/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : albums.length === 0 ? (
            <div className="glass-card p-16 text-center">
              <div className="w-20 h-20 mx-auto mb-6 rounded-2xl flex items-center justify-center" style={{ background: 'var(--glass-bg)', color: 'var(--accent)' }}>
                <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
                </svg>
              </div>
              <h2 className="text-2xl font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
                还没有相册
              </h2>
              <p className="text-base" style={{ color: 'var(--text-secondary)' }}>
                等纸心上传第一张照片
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-10">
              {albums.map(album => (
                <Link key={album.id} href={`/gallery/${album.id}`} className="block group">
                  <div className="glass-card glass-card-hover overflow-hidden">
                    {/* 封面图 */}
                    <div className="relative h-52 overflow-hidden">
                      {album.cover ? (
                        <img
                          src={album.cover}
                          alt={album.title}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div
                          className="w-full h-full flex items-center justify-center"
                          style={{ background: 'var(--glass-bg)' }}
                        >
                          <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1} style={{ color: 'var(--text-secondary)' }}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
                          </svg>
                        </div>
                      )}
                    </div>

                    {/* 信息 */}
                    <div className="p-5">
                      <h3
                        className="text-lg font-semibold leading-snug mb-1 transition-colors duration-200 group-hover:opacity-80"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        {album.title}
                      </h3>
                      <p className="text-xs" style={{ color: 'var(--text-secondary)', opacity: 0.7 }}>
                        {album._count.images} 张照片
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}