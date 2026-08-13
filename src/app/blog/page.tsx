'use client'

import { useState, useEffect, useCallback } from 'react'
import PostCard, { type PostCardPost } from '@/components/ui/post-card'
import Pagination from '@/components/ui/pagination'

interface RawPost {
  id: number
  slug: string
  title: string
  excerpt?: string | null
  cover?: string | null
  category?: string | null
  tags?: string | null
  views: number
  createdAt: string
  updatedAt: string
}

interface PaginationInfo {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

function toPostCardPost(raw: RawPost): PostCardPost {
  return {
    slug: raw.slug,
    title: raw.title,
    excerpt: raw.excerpt || '',
    cover: raw.cover,
    category: raw.category || '',
    tags: raw.tags ? raw.tags.split(',').map(t => t.trim()) : [],
    views: raw.views,
    createdAt: raw.createdAt,
  }
}

const CATEGORIES = ['技术', '生活', '随笔', '笔记', '教程']

function useQueryParams() {
  const [params, setParams] = useState(() => {
    if (typeof window === 'undefined') return { page: '1', q: '', cat: '' }
    const search = window.location.search
    const sp = new URLSearchParams(search)
    return {
      page: sp.get('page') || '1',
      q: sp.get('q') || '',
      cat: sp.get('cat') || '',
    }
  })
  return params
}

export default function BlogPage() {
  const queryParams = useQueryParams()
  const [posts, setPosts] = useState<RawPost[]>([])
  const [pagination, setPagination] = useState<PaginationInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState(queryParams.q)
  const [category, setCategory] = useState(queryParams.cat)
  const [page, setPage] = useState(parseInt(queryParams.page) || 1)

  const fetchPosts = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('page', String(page))
      params.set('pageSize', '9')
      if (category) params.set('cat', category)
      if (search.trim()) params.set('q', search.trim())

      const res = await fetch(`/api/posts?${params.toString()}`)
      const data = await res.json()
      if (data.posts) {
        setPosts(data.posts)
        setPagination(data.pagination)
      } else {
        setPosts([])
        setPagination(null)
      }
    } catch {
      setPosts([])
      setPagination(null)
    } finally {
      setLoading(false)
    }
  }, [page, category, search])

  useEffect(() => {
    fetchPosts()
  }, [fetchPosts])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
  }

  const handleCategoryChange = (cat: string) => {
    setCategory(cat === category ? '' : cat)
    setPage(1)
  }

  // 构建分页 basePath 保留搜索参数
  const basePath = `/blog${search ? `?q=${encodeURIComponent(search)}` : ''}${category && !search ? `?cat=${encodeURIComponent(category)}` : ''}${category && search ? `&cat=${encodeURIComponent(category)}` : ''}`

  return (
    <div className="w-full py-16 md:py-20">
      <div className="content-container">
        <div className="max-w-4xl mx-auto">
          {/* 头部 */}
          <div className="mb-14 md:mb-16 text-center">
            <h1 className="text-4xl sm:text-5xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
              文字<span className="gradient-text">博客</span>
            </h1>
            <p className="text-lg" style={{ color: 'var(--text-secondary)' }}>
              记录技术思考与生活感悟
            </p>
          </div>

          {/* 搜索和筛选 */}
          <div className="mb-10 space-y-4">
            <form onSubmit={handleSearch} className="flex gap-3">
              <input
                type="text"
                placeholder="搜索文章…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="glass-input flex-1"
              />
              <button type="submit" className="btn-primary !px-5">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
              </button>
            </form>

            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => handleCategoryChange(cat)}
                  className="btn-ghost !text-xs !px-3 !py-1.5"
                  style={
                    category === cat
                      ? { background: 'var(--accent-muted)', borderColor: 'var(--accent)', color: 'var(--accent)' }
                      : undefined
                  }
                >
                  {cat}
                </button>
              ))}
              {category && (
                <button
                  onClick={() => { setCategory(''); setPage(1) }}
                  className="text-xs hover:underline"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  清除筛选
                </button>
              )}
            </div>
          </div>

          {/* 文章列表 */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-10">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="glass-card p-6 animate-pulse">
                  <div className="h-4 bg-white/10 rounded w-1/4 mb-4" />
                  <div className="h-5 bg-white/10 rounded w-3/4 mb-3" />
                  <div className="h-4 bg-white/10 rounded w-full mb-2" />
                  <div className="h-4 bg-white/10 rounded w-2/3" />
                </div>
              ))}
            </div>
          ) : posts.length === 0 ? (
            <div className="glass-card p-16 text-center">
              <div className="w-20 h-20 mx-auto mb-6 rounded-2xl flex items-center justify-center" style={{ background: 'var(--glass-bg)', color: 'var(--accent)' }}>
                <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                </svg>
              </div>
              <h2 className="text-2xl font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
                还没有文章
              </h2>
              <p className="text-base" style={{ color: 'var(--text-secondary)' }}>
                等纸心有空了就会写点什么
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-10">
                {posts.map(post => (
                  <PostCard key={post.id} post={toPostCardPost(post)} />
                ))}
              </div>

              {pagination && pagination.totalPages > 1 && (
                <div className="mt-12">
                  <Pagination
                    currentPage={pagination.page}
                    totalPages={pagination.totalPages}
                    basePath={basePath}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}