'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Album {
  id: number
  title: string
  cover: string | null
  sortOrder: number
  createdAt: string
  _count: { images: number }
}

export default function AdminGalleryPage() {
  const [albums, setAlbums] = useState<Album[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [creating, setCreating] = useState(false)
  const [deleting, setDeleting] = useState<number | null>(null)

  const fetchAlbums = () => {
    setLoading(true)
    fetch('/api/albums')
      .then((r) => r.json())
      .then((data) => {
        if (data.albums) {
          setAlbums(data.albums)
        } else {
          setError(data.error || '获取相册失败')
        }
      })
      .catch(() => setError('网络错误'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchAlbums()
  }, [])

  const handleCreate = async () => {
    if (!newTitle.trim()) return
    setCreating(true)
    try {
      const res = await fetch('/api/albums', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle.trim() }),
      })
      if (res.ok) {
        const data = await res.json()
        setAlbums((prev) => [...prev, { ...data.album, _count: { images: 0 } }])
        setShowCreate(false)
        setNewTitle('')
      }
    } catch {
      // ignore
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (id: number, title: string) => {
    if (!window.confirm(`确定删除相册「${title}」？相册内所有图片也将被删除。`)) return
    setDeleting(id)
    try {
      const res = await fetch(`/api/albums/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setAlbums((prev) => prev.filter((a) => a.id !== id))
      }
    } catch {
      // ignore
    } finally {
      setDeleting(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>加载中...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="glass-card p-6 text-center">
          <p className="text-sm" style={{ color: '#ef4444' }}>{error}</p>
          <button className="btn-ghost mt-4 text-sm" onClick={fetchAlbums}>重试</button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>相册管理</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>管理相册与照片</p>
        </div>
        <button className="btn-primary" onClick={() => setShowCreate(true)}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          新建相册
        </button>
      </div>

      {/* 新建相册弹窗 */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setShowCreate(false)}>
          <div className="glass-card p-6 w-full max-w-sm mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>新建相册</h3>
            <input
              type="text"
              className="glass-input mb-4"
              placeholder="相册名称"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            />
            <div className="flex items-center gap-3">
              <button className="btn-primary" onClick={handleCreate} disabled={creating || !newTitle.trim()}>
                {creating ? '创建中...' : '创建'}
              </button>
              <button className="btn-ghost" onClick={() => { setShowCreate(false); setNewTitle('') }}>
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {albums.length === 0 ? (
        <div className="glass-card p-16 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center" style={{ background: 'var(--glass-bg)', color: 'var(--accent)' }}>
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
            </svg>
          </div>
          <p className="text-lg" style={{ color: 'var(--text-secondary)' }}>还没有相册，点击「新建相册」开始创建</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {albums.map((album) => (
            <div
              key={album.id}
              className="glass-card overflow-hidden group"
            >
              <Link href={`/admin/gallery/${album.id}`} className="block">
                {/* 封面 */}
                <div
                  className="h-40 flex items-center justify-center text-5xl overflow-hidden"
                  style={{ background: 'var(--glass-bg)' }}
                >
                  {album.cover ? (
                    <img src={album.cover} alt={album.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    '🖼️'
                  )}
                </div>
                {/* 信息 */}
                <div className="p-4">
                  <h3 className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                    {album.title}
                  </h3>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                    {album._count.images} 张图片
                  </p>
                </div>
              </Link>
              {/* 操作 */}
              <div className="px-4 pb-4">
                <button
                  className="btn-ghost text-xs py-1.5 px-3 w-full"
                  style={{ color: '#ef4444' }}
                  onClick={() => handleDelete(album.id, album.title)}
                  disabled={deleting === album.id}
                >
                  {deleting === album.id ? '删除中...' : '删除相册'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}