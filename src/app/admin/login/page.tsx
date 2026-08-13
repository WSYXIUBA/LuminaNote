'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminLoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        if (res.status === 401) {
          setError('用户名或密码错误')
        } else {
          setError(data.error || '登录失败')
        }
        return
      }

      router.push('/admin')
    } catch {
      setError('网络错误，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="glass-card p-8">
          <div className="text-center mb-8">
            <div
              className="w-14 h-14 mx-auto mb-4 rounded-2xl flex items-center justify-center"
              style={{ background: 'var(--gradient-main)' }}
            >
              <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
              管理员登录
            </h1>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-xl text-sm" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
                {error}
              </div>
            )}

            <input
              type="text"
              placeholder="用户名"
              className="glass-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
              required
            />

            <input
              type="password"
              placeholder="密码"
              className="glass-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              required
            />

            <button
              type="submit"
              className="btn-primary w-full text-base py-3"
              disabled={loading}
            >
              {loading ? '登录中...' : '登录'}
            </button>
          </form>

          <p className="mt-4 text-xs text-center" style={{ color: 'var(--text-secondary)' }}>
            首次使用？请先访问{' '}
            <a
              href="/api/init"
              target="_blank"
              className="underline hover:opacity-80"
              style={{ color: 'var(--accent)' }}
              onClick={(e) => {
                e.preventDefault()
                fetch('/api/init', { method: 'POST' })
                  .then((r) => r.json())
                  .then((d) => {
                    if (d.success) setError('')
                    alert('初始化成功！默认账号 admin / admin123')
                  })
                  .catch(() => alert('初始化失败'))
              }}
            >
              /api/init
            </a>
            初始化管理员账号
          </p>
        </div>
      </div>
    </div>
  )
}