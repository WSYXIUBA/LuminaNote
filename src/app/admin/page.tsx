'use client'

import { useState, useEffect } from 'react'

interface TrendItem {
  date: string
  count: number
}

interface TopPost {
  id: number
  title: string
  slug: string
  views: number
}

interface Stats {
  todayPV: number
  yesterdayPV: number
  totalPV: number
  totalUV: number
  postCount: number
  trend: TrendItem[]
  topPosts: TopPost[]
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/stats')
      .then((r) => r.json())
      .then((data) => {
        if (data.stats) {
          setStats(data.stats)
        } else {
          setError(data.error || '获取数据失败')
        }
      })
      .catch(() => setError('网络错误'))
      .finally(() => setLoading(false))
  }, [])

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
          <button
            className="btn-ghost mt-4 text-sm"
            onClick={() => window.location.reload()}
          >
            重试
          </button>
        </div>
      </div>
    )
  }

  if (!stats) return null

  const maxTrend = Math.max(...stats.trend.map((t) => t.count), 1)

  return (
    <div className="space-y-6">
      <div className="mb-2">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>控制台</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>站点数据概览</p>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: '今日 PV', value: stats.todayPV.toLocaleString(), icon: '👁️' },
          { label: '昨日 PV', value: stats.yesterdayPV.toLocaleString(), icon: '📊' },
          { label: '总 PV', value: stats.totalPV.toLocaleString(), icon: '📈' },
          { label: '文章数', value: stats.postCount.toLocaleString(), icon: '📝' },
        ].map((stat) => (
          <div key={stat.label} className="glass-card p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-lg">{stat.icon}</span>
            </div>
            <p className="text-3xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
              {stat.value}
            </p>
            <p className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
              {stat.label}
            </p>
          </div>
        ))}
      </div>

      {/* 近 30 天趋势图 */}
      <div className="glass-card p-6">
        <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
          近 30 天访问趋势
        </h2>
        {stats.trend.every((t) => t.count === 0) ? (
          <div className="h-48 flex items-center justify-center" style={{ color: 'var(--text-secondary)' }}>
            <div className="text-center">
              <p className="text-4xl mb-2">📈</p>
              <p className="text-sm">暂无数据</p>
            </div>
          </div>
        ) : (
          <div className="h-48 flex items-end gap-1.5 pt-2">
            {stats.trend.map((t) => {
              const height = (t.count / maxTrend) * 100
              const isToday = t.date === new Date().toISOString().slice(0, 10)
              return (
                <div
                  key={t.date}
                  className="flex-1 flex flex-col items-center gap-1 group relative"
                >
                  <div
                    className="w-full rounded-t-md transition-all duration-200 hover:opacity-80"
                    style={{
                      height: `${Math.max(height, t.count > 0 ? 4 : 0)}%`,
                      background: isToday ? 'var(--gradient-main)' : 'var(--accent-muted)',
                      minHeight: t.count > 0 ? '4px' : '0',
                    }}
                  />
                  {/* Tooltip on hover */}
                  <div className="absolute bottom-full mb-1 hidden group-hover:block z-10">
                    <div
                      className="text-xs px-2 py-1 rounded-lg whitespace-nowrap"
                      style={{ background: 'var(--glass-bg)', color: 'var(--text-primary)', border: '1px solid var(--glass-border)' }}
                    >
                      {t.date.slice(5)}: {t.count}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* 热门文章 Top 10 */}
      <div className="glass-card p-6">
        <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
          热门文章 Top 10
        </h2>
        {stats.topPosts.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>暂无文章</p>
        ) : (
          <div className="space-y-2">
            {stats.topPosts.map((post, i) => (
              <div
                key={post.id}
                className="flex items-center gap-3 p-3 rounded-xl transition-all duration-200 hover:bg-white/10 dark:hover:bg-white/5"
              >
                <span
                  className="w-6 h-6 flex items-center justify-center rounded-lg text-xs font-bold shrink-0"
                  style={{
                    background: i < 3 ? 'var(--gradient-main)' : 'var(--glass-bg)',
                    color: i < 3 ? '#fff' : 'var(--text-secondary)',
                  }}
                >
                  {i + 1}
                </span>
                <span className="flex-1 text-sm truncate" style={{ color: 'var(--text-primary)' }}>
                  {post.title}
                </span>
                <span className="text-xs shrink-0" style={{ color: 'var(--text-secondary)' }}>
                  👁️ {post.views}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 快捷操作 */}
      <div className="glass-card p-6">
        <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
          快捷操作
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: '写文章', icon: '✏️', href: '/admin/posts/new' },
            { label: '传照片', icon: '📸', href: '/admin/gallery' },
            { label: '审留言', icon: '💬', href: '/admin/messages' },
            { label: '改设置', icon: '⚙️', href: '/admin/settings' },
          ].map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="glass-card p-4 text-center hover:border-accent cursor-pointer"
              style={{ transition: 'border-color 0.25s ease' }}
            >
              <span className="text-2xl block mb-1">{item.icon}</span>
              <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{item.label}</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}