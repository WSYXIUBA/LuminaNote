'use client'

import { useState, useEffect } from 'react'

interface Message {
  id: number
  nickname: string
  content: string
  approved: boolean
  createdAt: string
}

export default function AdminMessagesPage() {
  const [tab, setTab] = useState<'pending' | 'approved'>('pending')
  const [pendingMessages, setPendingMessages] = useState<Message[]>([])
  const [approvedMessages, setApprovedMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [operating, setOperating] = useState<number | null>(null)

  const fetchPending = () => {
    fetch('/api/messages/pending')
      .then((r) => r.json())
      .then((data) => {
        if (data.messages) setPendingMessages(data.messages)
      })
      .catch(() => {})
  }

  const fetchApproved = () => {
    fetch('/api/messages')
      .then((r) => r.json())
      .then((data) => {
        if (data.messages) setApprovedMessages(data.messages)
      })
      .catch(() => {})
  }

  useEffect(() => {
    setLoading(true)
    setError('')
    Promise.all([
      fetch('/api/messages/pending').then((r) => r.json()),
      fetch('/api/messages').then((r) => r.json()),
    ])
      .then(([pendingData, approvedData]) => {
        if (pendingData.messages) setPendingMessages(pendingData.messages)
        if (approvedData.messages) setApprovedMessages(approvedData.messages)
        if (pendingData.error || approvedData.error) {
          setError(pendingData.error || approvedData.error || '获取留言失败')
        }
      })
      .catch(() => setError('网络错误'))
      .finally(() => setLoading(false))
  }, [])

  const handleApprove = async (id: number) => {
    setOperating(id)
    try {
      const res = await fetch(`/api/messages/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved: true }),
      })
      if (res.ok) {
        const msg = pendingMessages.find((m) => m.id === id)
        if (msg) {
          setPendingMessages((prev) => prev.filter((m) => m.id !== id))
          setApprovedMessages((prev) => [{ ...msg, approved: true }, ...prev])
        }
      }
    } catch {
      // ignore
    } finally {
      setOperating(null)
    }
  }

  const handleDelete = async (id: number) => {
    if (!window.confirm('确定删除这条留言？')) return
    setOperating(id)
    try {
      const res = await fetch(`/api/messages/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setPendingMessages((prev) => prev.filter((m) => m.id !== id))
        setApprovedMessages((prev) => prev.filter((m) => m.id !== id))
      }
    } catch {
      // ignore
    } finally {
      setOperating(null)
    }
  }

  const currentMessages = tab === 'pending' ? pendingMessages : approvedMessages

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

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>留言管理</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>审核和管理访客留言</p>
      </div>

      {/* Tab 切换 */}
      <div className="flex gap-2 mb-6">
        <button
          className="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200"
          style={{
            background: tab === 'pending' ? 'var(--gradient-main)' : 'var(--glass-bg)',
            color: tab === 'pending' ? '#fff' : 'var(--text-secondary)',
            border: tab === 'pending' ? 'none' : '1px solid var(--glass-border)',
          }}
          onClick={() => setTab('pending')}
        >
          待审核
          {pendingMessages.length > 0 && (
            <span className="ml-1.5 text-xs px-1.5 py-0.5 rounded-full bg-white/20">
              {pendingMessages.length}
            </span>
          )}
        </button>
        <button
          className="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200"
          style={{
            background: tab === 'approved' ? 'var(--gradient-main)' : 'var(--glass-bg)',
            color: tab === 'approved' ? '#fff' : 'var(--text-secondary)',
            border: tab === 'approved' ? 'none' : '1px solid var(--glass-border)',
          }}
          onClick={() => setTab('approved')}
        >
          已通过
          <span className="ml-1.5 text-xs opacity-70">{approvedMessages.length}</span>
        </button>
      </div>

      {/* 留言列表 */}
      {currentMessages.length === 0 ? (
        <div className="glass-card p-16 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center" style={{ background: 'var(--glass-bg)', color: 'var(--accent)' }}>
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
            </svg>
          </div>
          <p className="text-lg" style={{ color: 'var(--text-secondary)' }}>
            {tab === 'pending' ? '暂无待审核留言' : '暂无已通过留言'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {currentMessages.map((msg) => (
            <div
              key={msg.id}
              className="glass-card p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {msg.nickname}
                    </span>
                    <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                      {new Date(msg.createdAt).toLocaleString('zh-CN')}
                    </span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--text-secondary)' }}>
                    {msg.content}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {tab === 'pending' && (
                    <button
                      className="btn-ghost text-xs py-1.5 px-3"
                      style={{ color: '#22c55e' }}
                      onClick={() => handleApprove(msg.id)}
                      disabled={operating === msg.id}
                    >
                      {operating === msg.id ? '...' : '通过'}
                    </button>
                  )}
                  <button
                    className="btn-ghost text-xs py-1.5 px-3"
                    style={{ color: '#ef4444' }}
                    onClick={() => handleDelete(msg.id)}
                    disabled={operating === msg.id}
                  >
                    {operating === msg.id ? '...' : '删除'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}