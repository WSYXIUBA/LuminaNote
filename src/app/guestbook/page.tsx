'use client'

import { useState, useEffect } from 'react'

interface MessageItem {
  id: number
  nickname: string
  content: string
  createdAt: string
}

interface PaginationInfo {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export default function GuestbookPage() {
  const [messages, setMessages] = useState<MessageItem[]>([])
  const [pagination, setPagination] = useState<PaginationInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)

  // 表单状态
  const [nickname, setNickname] = useState('')
  const [content, setContent] = useState('')
  const [captchaQuestion, setCaptchaQuestion] = useState('')
  const [captchaAnswer, setCaptchaAnswer] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // 获取留言
  const fetchMessages = async (p: number) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/messages?page=${p}&pageSize=10`)
      const data = await res.json()
      if (data.messages) {
        setMessages(data.messages)
        setPagination(data.pagination)
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMessages(page)
  }, [page])

  // 获取验证码
  const fetchCaptcha = async () => {
    try {
      const res = await fetch('/api/captcha')
      const data = await res.json()
      if (data.question) {
        setCaptchaQuestion(data.question)
        setCaptchaAnswer('')
      }
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    fetchCaptcha()
  }, [])

  // 提交留言
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nickname.trim() || !content.trim()) return

    setSubmitting(true)
    setSubmitStatus(null)

    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nickname: nickname.trim(),
          content: content.trim(),
          captchaQuestion,
          captchaAnswer: captchaAnswer.trim(),
        }),
      })

      const data = await res.json()

      if (res.ok) {
        setSubmitStatus({ type: 'success', text: '留言已提交，待审核后展示 ✨' })
        setNickname('')
        setContent('')
        setCaptchaAnswer('')
        fetchCaptcha()
      } else {
        setSubmitStatus({ type: 'error', text: data.error || '提交失败' })
        fetchCaptcha()
      }
    } catch {
      setSubmitStatus({ type: 'error', text: '网络错误，请稍后重试' })
    } finally {
      setSubmitting(false)
    }
  }

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - d.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return '刚刚'
    if (minutes < 60) return `${minutes} 分钟前`
    if (hours < 24) return `${hours} 小时前`
    if (days < 7) return `${days} 天前`
    return d.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' })
  }

  return (
    <div className="w-full py-16 md:py-20">
      <div className="content-container">
        <div className="max-w-3xl mx-auto">
          {/* 头部 */}
          <div className="mb-14 md:mb-16 text-center">
            <h1 className="text-4xl sm:text-5xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
              留言<span className="gradient-text">墙</span>
            </h1>
            <p className="text-lg" style={{ color: 'var(--text-secondary)' }}>
              来者皆是客，留下你的足迹吧
            </p>
          </div>

          {/* 留言表单 */}
          <div className="glass-card p-6 sm:p-8 mb-8">
            <h2 className="text-xl font-semibold mb-6" style={{ color: 'var(--text-primary)' }}>
              写留言
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* 昵称 */}
              <input
                type="text"
                placeholder="你的昵称"
                value={nickname}
                onChange={e => setNickname(e.target.value)}
                className="glass-input"
                required
                maxLength={50}
              />

              {/* 内容 */}
              <textarea
                rows={4}
                placeholder="说点什么…"
                value={content}
                onChange={e => setContent(e.target.value)}
                className="glass-input resize-none"
                required
                maxLength={2000}
              />

              {/* 验证码 */}
              <div className="flex items-center gap-3">
                <div
                  className="glass-card px-4 py-3 text-sm font-mono flex-1 select-none"
                  style={{ color: 'var(--text-primary)', background: 'var(--accent-muted)' }}
                >
                  {captchaQuestion || '加载中…'}
                </div>
                <input
                  type="text"
                  placeholder="答案"
                  value={captchaAnswer}
                  onChange={e => setCaptchaAnswer(e.target.value)}
                  className="glass-input !w-28"
                  required
                />
                <button
                  type="button"
                  onClick={fetchCaptcha}
                  className="btn-ghost !px-3 !py-2"
                  aria-label="换一题"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
                  </svg>
                </button>
              </div>

              {/* 提交状态 */}
              {submitStatus && (
                <p
                  className="text-sm"
                  style={{
                    color: submitStatus.type === 'success' ? 'var(--accent-2)' : '#ef4444',
                  }}
                >
                  {submitStatus.text}
                </p>
              )}

              {/* 提交按钮 */}
              <button
                type="submit"
                className="btn-primary"
                disabled={submitting}
              >
                {submitting ? '提交中…' : '提交留言'}
              </button>
            </form>

            <p className="text-xs mt-3" style={{ color: 'var(--text-secondary)', opacity: 0.6 }}>
              留言需审核后展示
            </p>
          </div>

          {/* 留言列表 */}
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="glass-card p-6 animate-pulse">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-white/10" />
                    <div className="h-4 bg-white/10 rounded w-24" />
                  </div>
                  <div className="h-4 bg-white/10 rounded w-full mb-2" />
                  <div className="h-4 bg-white/10 rounded w-3/4" />
                </div>
              ))}
            </div>
          ) : messages.length === 0 ? (
            <div className="glass-card p-12 text-center">
              <p className="text-lg" style={{ color: 'var(--text-secondary)' }}>
                还没有留言，来做第一个访客吧 ✨
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                {messages.map(msg => (
                  <div key={msg.id} className="glass-card p-6">
                    <div className="flex items-center gap-3 mb-3">
                      {/* 头像 */}
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold shrink-0"
                        style={{
                          background: 'var(--accent-muted)',
                          color: 'var(--accent)',
                        }}
                      >
                        {msg.nickname.charAt(0).toUpperCase()}
                      </div>

                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                          {msg.nickname}
                        </p>
                        <p className="text-xs" style={{ color: 'var(--text-secondary)', opacity: 0.6 }}>
                          {formatDate(msg.createdAt)}
                        </p>
                      </div>
                    </div>

                    <p
                      className="text-sm leading-relaxed whitespace-pre-wrap break-words"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      {msg.content}
                    </p>
                  </div>
                ))}
              </div>

              {/* 分页 */}
              {pagination && pagination.totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-10">
                  <button
                    onClick={() => { setPage(p => p - 1); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                    disabled={page <= 1}
                    className="btn-ghost !px-3 !py-2 text-sm disabled:opacity-30 disabled:cursor-not-allowed"
                    aria-label="上一页"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                    </svg>
                  </button>

                  <span className="text-sm px-4" style={{ color: 'var(--text-secondary)' }}>
                    {page} / {pagination.totalPages}
                  </span>

                  <button
                    onClick={() => { setPage(p => p + 1); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                    disabled={page >= pagination.totalPages}
                    className="btn-ghost !px-3 !py-2 text-sm disabled:opacity-30 disabled:cursor-not-allowed"
                    aria-label="下一页"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                    </svg>
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}