'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'

interface GalleryImage {
  id: number
  albumId: number
  filename: string
  thumbnail: string | null
  sortOrder: number
  createdAt: string
}

interface AlbumDetail {
  id: number
  title: string
  cover: string | null
  sortOrder: number
  images: GalleryImage[]
}

export default function AdminGalleryDetailPage() {
  const params = useParams()
  const albumId = params.id as string
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [album, setAlbum] = useState<AlbumDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState('')

  const fetchAlbum = () => {
    if (!albumId) return
    fetch(`/api/albums/${albumId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.album) setAlbum(data.album)
        else setError(data.error || '相册不存在')
      })
      .catch(() => setError('网络错误'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchAlbum()
  }, [albumId])

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return

    setUploading(true)
    let successCount = 0

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      setUploadProgress(`${i + 1}/${files.length} - ${file.name}`)
      try {
        const formData = new FormData()
        formData.append('file', file)

        const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData })
        if (!uploadRes.ok) continue

        const uploadData = await uploadRes.json()

        // Associate with album
        const imageRes = await fetch(`/api/albums/${albumId}/images`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename: uploadData.filename,
            thumbnail: uploadData.thumbUrl || null,
          }),
        })

        if (imageRes.ok) successCount++
      } catch {
        // skip failed file
      }
    }

    setUploadProgress('')
    setUploading(false)

    if (successCount > 0) {
      fetchAlbum()
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    handleUpload(e.dataTransfer.files)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDeleteImage = async (imageId: number) => {
    if (!window.confirm('确定删除这张图片？')) return

    try {
      const res = await fetch(`/api/albums/${albumId}/images/${imageId}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        fetchAlbum()
      } else {
        const data = await res.json()
        alert(data.error || '删除失败')
      }
    } catch {
      alert('删除失败')
    }
  }

  const handleSetCover = async (imageUrl: string) => {
    try {
      const res = await fetch(`/api/albums/${albumId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cover: imageUrl }),
      })
      if (res.ok) {
        fetchAlbum()
      }
    } catch {
      alert('设置封面失败')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>加载中...</div>
      </div>
    )
  }

  if (error || !album) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="glass-card p-6 text-center">
          <p className="text-sm" style={{ color: '#ef4444' }}>{error || '相册不存在'}</p>
          <Link href="/admin/gallery" className="btn-ghost mt-4 text-sm inline-block">
            返回相册列表
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/gallery"
            className="flex items-center text-sm"
            style={{ color: 'var(--text-secondary)' }}
          >
            <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            返回
          </Link>
          <div className="w-px h-5" style={{ background: 'var(--hairline)' }} />
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{album.title}</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
              {album.images.length} 张图片
            </p>
          </div>
        </div>
      </div>

      {/* 上传区域 */}
      <div
        className="glass-card p-8 mb-6 text-center cursor-pointer"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onClick={() => fileInputRef.current?.click()}
        style={{ borderStyle: 'dashed' }}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          className="hidden"
          onChange={(e) => handleUpload(e.target.files)}
          disabled={uploading}
        />

        {uploading ? (
          <div>
            <p className="text-lg mb-2">⏳ 上传中...</p>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{uploadProgress}</p>
          </div>
        ) : (
          <div>
            <p className="text-4xl mb-3">📸</p>
            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              点击或拖拽图片到此处上传
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
              支持 JPG、PNG、WebP、GIF，单文件最大 10MB
            </p>
          </div>
        )}
      </div>

      {/* 图片网格 */}
      {album.images.length === 0 ? (
        <div className="glass-card p-16 text-center">
          <p className="text-lg" style={{ color: 'var(--text-secondary)' }}>还没有图片，上传第一张吧</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {album.images.map((img) => {
            const imgUrl = img.thumbnail || `/uploads/thumbs/thumb_${img.filename}`
            const fullUrl = `/uploads/${img.filename}`
            const isCover = album.cover === fullUrl

            return (
              <div
                key={img.id}
                className="glass-card overflow-hidden group"
              >
                <div className="aspect-square overflow-hidden relative">
                  <img
                    src={imgUrl}
                    alt=""
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = fullUrl
                    }}
                  />
                  {isCover && (
                    <span className="absolute top-2 left-2 text-xs px-2 py-0.5 rounded-full bg-black/40 text-white backdrop-blur-sm">
                      封面
                    </span>
                  )}
                </div>
                <div className="p-3 flex items-center justify-between gap-1">
                  <span className="text-xs truncate flex-1" style={{ color: 'var(--text-secondary)' }}>
                    {img.filename.slice(0, 20)}
                  </span>
                  <div className="flex items-center gap-1 shrink-0">
                    {!isCover && (
                      <button
                        className="text-xs w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/10"
                        style={{ color: 'var(--accent)' }}
                        onClick={() => handleSetCover(fullUrl)}
                        title="设为封面"
                      >
                        ⭐
                      </button>
                    )}
                    <button
                      className="text-xs w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/10"
                      style={{ color: '#ef4444' }}
                      onClick={() => handleDeleteImage(img.id)}
                      title="删除"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}