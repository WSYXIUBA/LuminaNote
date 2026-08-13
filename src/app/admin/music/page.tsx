'use client'

import { useState, useEffect } from 'react'

/* ============================================================
   后台 · 音乐管理
   独立管理网易云歌单 ID 与本地音乐列表，保存后全站生效
   ============================================================ */

export default function AdminMusicPage() {
  const [cloudIds, setCloudIds] = useState('')
  const [musicText, setMusicText] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')

  // 音乐列表 JSON → 文本（每行 歌名,歌手,URL）
  const jsonToText = (json: string): string => {
    try {
      const list = JSON.parse(json)
      if (Array.isArray(list)) {
        return list.map((t) => `${t.name},${t.artist || ''},${t.url}`).join('\n')
      }
    } catch { /* ignore */ }
    return ''
  }

  // 文本 → JSON
  const textToJson = (text: string): string => {
    const tracks = text
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const parts = line.split(',').map((s) => s.trim())
        return { name: parts[0] || '未命名', artist: parts[1] || '', url: parts[2] || '' }
      })
      .filter((t) => t.url)
    return JSON.stringify(tracks)
  }

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((data) => {
        const s = data.settings || {}
        setCloudIds(s.music_cloud_ids || '')
        if (s.music_list) setMusicText(jsonToText(s.music_list))
      })
      .catch(() => setError('网络错误'))
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setMsg('')
    setError('')
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settings: {
            music_cloud_ids: cloudIds,
            music_list: textToJson(musicText),
          },
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || '保存失败')
        return
      }
      setMsg('已保存，前台播放器将自动刷新歌单')
      setTimeout(() => setMsg(''), 4000)
    } catch {
      setError('网络错误')
    } finally {
      setSaving(false)
    }
  }

  const inputCls =
    "w-full px-4 py-2.5 rounded-xl text-sm outline-none transition-all focus:ring-2 bg-transparent border"
  const inputStyle = {
    borderColor: 'var(--glass-border)',
    color: 'var(--text-primary)',
    ['--tw-ring-color' as string]: 'var(--accent)',
  } as React.CSSProperties

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>加载中...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="mb-2">
        <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>音乐管理</h1>
        <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
          管理首页播放器的云歌单与本地音乐，保存后立即生效
        </p>
      </div>

      {error && (
        <div className="glass-card p-4 text-sm" style={{ color: '#ef4444' }}>{error}</div>
      )}
      {msg && (
        <div className="glass-card p-4 text-sm" style={{ color: '#34d399' }}>{msg}</div>
      )}

      {/* 网易云歌单 */}
      <div className="glass-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent-muted)', color: 'var(--accent)' }}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 3.75h-9m9 0a3 3 0 013 3v13.5a3 3 0 01-3 3h-9a3 3 0 01-3-3V6.75a3 3 0 013-3m9 0a3 3 0 00-3 3v0a3 3 0 01-3 3h-3" />
            </svg>
          </div>
          <div>
            <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>网易云歌单</h2>
            <p className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>
              填入歌曲 ID（逗号分隔），如 186016,2737471087
            </p>
          </div>
        </div>
        <input
          value={cloudIds}
          onChange={(e) => setCloudIds(e.target.value)}
          placeholder="例如：186016,2737471087"
          className={inputCls}
          style={inputStyle}
          aria-label="网易云歌曲ID"
        />
        <p className="text-[10px] mt-2" style={{ color: 'var(--text-secondary)' }}>
          提示：歌曲 ID 是网易云歌曲链接中的数字，如 music.163.com/#/song?id=186016
        </p>
      </div>

      {/* 本地音乐 */}
      <div className="glass-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent-muted)', color: 'var(--accent)' }}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.303z" />
            </svg>
          </div>
          <div>
            <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>本地音乐</h2>
            <p className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>
              每行一首：歌名,歌手,音频URL（可填外链 mp3 地址）
            </p>
          </div>
        </div>
        <textarea
          value={musicText}
          onChange={(e) => setMusicText(e.target.value)}
          rows={8}
          placeholder={'例如：\n晴天,周杰伦,https://example.com/qingtian.mp3'}
          className={`${inputCls} font-mono text-xs leading-relaxed resize-y`}
          style={inputStyle}
          aria-label="本地音乐列表"
        />
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary text-sm px-6 py-2.5"
        >
          {saving ? '保存中...' : '保存音乐配置'}
        </button>
      </div>
    </div>
  )
}
