'use client'

import Link from 'next/link'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'

export interface PostCardPost {
  slug: string
  title: string
  excerpt: string
  cover?: string | null
  category: string
  tags: string[]
  views: number
  createdAt: string | Date
}

export interface PostCardProps {
  post: PostCardPost
}

export default function PostCard({ post }: PostCardProps) {
  const dateStr =
    typeof post.createdAt === 'string'
      ? format(new Date(post.createdAt), 'yyyy年M月d日', { locale: zhCN })
      : format(post.createdAt, 'yyyy年M月d日', { locale: zhCN })

  return (
    <Link href={`/blog/${post.slug}`} className="block group">
      <article className="glass-card glass-card-hover overflow-hidden">
        {/* 封面图 */}
        {post.cover && (
          <div className="relative w-full h-48 overflow-hidden">
            <img
              src={post.cover}
              alt={post.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          </div>
        )}

        {/* 内容区 */}
        <div className="p-5 relative z-[2]">
          {/* 分类标签 */}
          <div className="flex items-center gap-2 mb-3">
            <span
              className="inline-block px-3 py-1 text-xs font-medium rounded-full"
              style={{
                background: 'var(--accent-muted)',
                color: 'var(--accent)',
              }}
            >
              {post.category}
            </span>
          </div>

          {/* 标题 */}
          <h3
            className="text-lg font-semibold leading-snug mb-2 transition-colors group-hover:text-[color:var(--accent)]"
            style={{ color: 'var(--text-primary)' }}
          >
            {post.title}
          </h3>

          {/* 摘要 */}
          <p
            className="text-sm leading-relaxed line-clamp-2 mb-4"
            style={{ color: 'var(--text-secondary)' }}
          >
            {post.excerpt}
          </p>

          {/* 底部信息 */}
          <div
            className="flex items-center justify-between text-xs"
            style={{ color: 'var(--text-secondary)' }}
          >
            <span className="flex items-center gap-1.5">
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.8}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              {post.views}
            </span>
            <span>{dateStr}</span>
          </div>
        </div>
      </article>
    </Link>
  )
}