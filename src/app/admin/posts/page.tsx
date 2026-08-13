'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface PostItem {
  id: number
  slug: string
  title: string
  excerpt: string | null
  cover: string | null
  category: string | null
  tags: string | null
  published: boolean
  views: number
  createdAt: string
  updatedAt: string
}

export default function AdminPostsPage() {
  const router = useRouter()
  const [posts, setPosts] = useState<PostItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deleting, setDeleting] = useState<string | null>(null)

  const fetchPosts = () => {
    setLoading(true)
    fetch('/api/posts?includeDrafts=true&pageSize=50')
      .then((r) => r.json())
      .then((data) => {
        if (data.posts) {
          setPosts(data.posts)
        } else {
          setError(data.error || '获取文章失败')
        }
      })
      .catch(() => setError('网络错误'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchPosts()
  }, [])

  const handleDelete = async (slug: string, title: string) => {
    if (!window.confirm(`确定删除「${title}」？此操作不可撤销。`)) return

    setDeleting(slug)
    try {
      const res = await fetch(`/api/posts/${slug}`, { method: 'DELETE' })
      if (res.ok) {
        setPosts((prev) => prev.filter((p) => p.slug !== slug))
      } else {
        const data = await res.json()
        alert(data.error || '删除失败')
      }
    } catch {
      alert('删除失败')
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
          <button className="btn-ghost mt-4 text-sm" onClick={fetchPosts}>重试</button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>文章管理</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>新建、编辑、发布文章</p>
        </div>
        <Link href="/admin/posts/new" className="btn-primary">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          新建文章
        </Link>
      </div>

      {posts.length === 0 ? (
        <div className="glass-card p-16 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center" style={{ background: 'var(--glass-bg)', color: 'var(--accent)' }}>
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
            </svg>
          </div>
          <p className="text-lg" style={{ color: 'var(--text-secondary)' }}>还没有文章，点击「新建文章」开始写作</p>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => (
            <div
              key={post.id}
              className="glass-card p-4 flex items-center gap-4 hover:border-accent/30"
              style={{ transition: 'border-color 0.25s ease' }}
            >
              {/* 封面缩略图 */}
              <div
                className="w-14 h-14 rounded-xl shrink-0 flex items-center justify-center text-xl overflow-hidden"
                style={{ background: 'var(--glass-bg)' }}
              >
                {post.cover ? (
                  <img src={post.cover} alt="" className="w-full h-full object-cover" />
                ) : (
                  '📄'
                )}
              </div>

              {/* 信息 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                    {post.title}
                  </h3>
                  <span
                    className="text-xs px-2 py-0.5 rounded-full shrink-0"
                    style={{
                      background: post.published ? 'rgba(34,197,94,0.12)' : 'rgba(234,179,8,0.12)',
                      color: post.published ? '#22c55e' : '#eab308',
                    }}
                  >
                    {post.published ? '已发布' : '草稿'}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
                  {post.category && <span>{post.category}</span>}
                  <span>👁️ {post.views}</span>
                  <span>{new Date(post.createdAt).toLocaleDateString('zh-CN')}</span>
                </div>
              </div>

              {/* 操作按钮 */}
              <div className="flex items-center gap-2 shrink-0">
                <Link
                  href={`/admin/posts/${post.slug}/edit`}
                  className="btn-ghost text-xs py-1.5 px-3"
                >
                  编辑
                </Link>
                <button
                  className="btn-ghost text-xs py-1.5 px-3"
                  style={{ color: '#ef4444' }}
                  onClick={() => handleDelete(post.slug, post.title)}
                  disabled={deleting === post.slug}
                >
                  {deleting === post.slug ? '删除中...' : '删除'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}