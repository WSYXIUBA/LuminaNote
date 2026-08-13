'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface PostDetail {
  id: number
  slug: string
  title: string
  content: string
  excerpt?: string | null
  cover?: string | null
  category?: string | null
  tags?: string | null
  published: boolean
  views: number
  html: string
  createdAt: string
  updatedAt: string
}

export default function BlogPostPage({ params: paramsPromise }: { params: Promise<{ slug: string }> }) {
  const [post, setPost] = useState<PostDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [slug, setSlug] = useState('')

  useEffect(() => {
    paramsPromise.then(p => setSlug(p.slug))
  }, [paramsPromise])

  useEffect(() => {
    if (!slug) return

    setLoading(true)
    setNotFound(false)

    fetch(`/api/posts/${slug}`)
      .then(res => {
        if (res.status === 404) {
          setNotFound(true)
          return null
        }
        if (!res.ok) throw new Error('获取文章失败')
        return res.json()
      })
      .then(data => {
        if (data && data.post) setPost(data.post)
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [slug])

  if (!slug || loading) {
    return (
      <div className="w-full py-12">
        <div className="content-container">
          <div className="max-w-3xl mx-auto">
            <Link href="/blog" className="inline-flex items-center gap-1 text-sm mb-8 hover:underline" style={{ color: 'var(--accent)' }}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
              </svg>
              返回博客列表
            </Link>

            <div className="glass-card p-8 sm:p-12">
              <div className="animate-pulse space-y-4">
                <div className="h-8 bg-white/10 rounded w-3/4" />
                <div className="h-4 bg-white/10 rounded w-1/4" />
                <div className="h-4 bg-white/10 rounded w-full mt-8" />
                <div className="h-4 bg-white/10 rounded w-5/6" />
              </div>
              <p className="text-center mt-8 text-sm" style={{ color: 'var(--text-secondary)' }}>
                文章加载中…
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (notFound || !post) {
    return (
      <div className="w-full py-12">
        <div className="content-container">
          <div className="max-w-3xl mx-auto">
            <Link href="/blog" className="inline-flex items-center gap-1 text-sm mb-8 hover:underline" style={{ color: 'var(--accent)' }}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
              </svg>
              返回博客列表
            </Link>

            <div className="glass-card p-16 text-center">
              <div className="w-20 h-20 mx-auto mb-6 rounded-2xl flex items-center justify-center" style={{ background: 'var(--glass-bg)', color: 'var(--accent)' }}>
                <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
                文章不存在
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

  const dateStr = new Date(post.createdAt).toLocaleDateString('zh-CN', {
    year: 'numeric', month: 'long', day: 'numeric',
  })

  return (
    <div className="w-full py-12">
      <div className="content-container">
        <div className="max-w-3xl mx-auto">
          {/* 返回按钮 */}
          <Link href="/blog" className="inline-flex items-center gap-1 text-sm mb-8 hover:underline" style={{ color: 'var(--accent)' }}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            返回博客列表
          </Link>

          <article className="glass-card p-8 sm:p-12">
            {/* 封面图 */}
            {post.cover && (
              <div className="relative w-full h-56 sm:h-72 rounded-2xl overflow-hidden mb-8">
                <img src={post.cover} alt={post.title} className="w-full h-full object-cover" />
              </div>
            )}

            {/* 分类标签 */}
            {post.category && (
              <span
                className="inline-block text-xs font-medium px-2.5 py-1 rounded-full mb-4"
                style={{ background: 'var(--accent-muted)', color: 'var(--accent)' }}
              >
                {post.category}
              </span>
            )}

            {/* 标题 */}
            <h1 className="text-3xl sm:text-4xl font-bold leading-tight mb-6" style={{ color: 'var(--text-primary)' }}>
              {post.title}
            </h1>

            {/* 元信息 */}
            <div
              className="flex flex-wrap items-center gap-4 text-sm mb-10 pb-6"
              style={{ color: 'var(--text-secondary)', borderBottom: '1px solid var(--glass-border)' }}
            >
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                </svg>
                {dateStr}
              </span>
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {post.views} 次阅读
              </span>
              {post.tags && (
                <span className="flex items-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
                  </svg>
                  {post.tags}
                </span>
              )}
            </div>

            {/* Markdown 内容 */}
            <div className="prose-container" dangerouslySetInnerHTML={{ __html: post.html }} />
          </article>

          {/* 底部导航 */}
          <div className="mt-10 text-center">
            <Link href="/blog" className="btn-ghost">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
              </svg>
              返回博客列表
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}