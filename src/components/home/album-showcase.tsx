'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

interface Album {
  id: number
  title: string
  cover: string | null
  imageCount: number
}

export default function AlbumShowcase() {
  const router = useRouter()
  const [albums, setAlbums] = useState<Album[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/albums')
      .then((r) => r.json())
      .then((data) => {
        if (data.albums) setAlbums(data.albums)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="glass-card p-5 h-full animate-pulse">
        <div className="h-4 bg-white/20 rounded w-1/4 mb-3" />
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="aspect-square bg-white/20 rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div
      className="glass-card glass-card-hover p-5 md:p-6 h-full transition-all duration-500 relative overflow-hidden cursor-pointer"
      data-tilt
      onClick={() => router.push('/gallery')}
    >
      <div className="relative z-10 h-full flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} style={{ color: 'var(--accent)' }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
            </svg>
            光影相册
          </h3>
          <Link href="/gallery" className="text-[10px] hover:opacity-70 transition-opacity flex items-center gap-1" style={{ color: 'var(--accent)' }} onClick={(e) => e.stopPropagation()}>
            全部
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </Link>
        </div>

        {albums.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <svg className="w-8 h-8 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1} style={{ color: 'var(--text-secondary)' }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
              </svg>
              <p className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>还没有相册</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {albums.slice(0, 6).map((album) => (
              <Link
                key={album.id}
                href={`/gallery/${album.id}`}
                className="group relative aspect-square rounded-xl overflow-hidden transition-transform duration-300 hover:scale-[1.03]"
                style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}
                onClick={(e) => e.stopPropagation()}
              >
                {album.cover ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={album.cover}
                    alt={album.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center" style={{ color: 'var(--accent)' }}>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
                    </svg>
                  </div>
                )}
                <div className="absolute inset-x-0 bottom-0 p-1.5 pt-6 bg-gradient-to-t from-black/60 to-transparent">
                  <p className="text-white text-[10px] font-medium truncate">{album.title}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}