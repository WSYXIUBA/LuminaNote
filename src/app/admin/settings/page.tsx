'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface SettingsMap {
  [key: string]: string
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<SettingsMap>({})
  const [musicText, setMusicText] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [uploading, setUploading] = useState(false)

  // music_list JSON → 文本
  const jsonToText = (json: string): string => {
    try {
      const list = JSON.parse(json)
      if (Array.isArray(list)) {
        return list.map((t) => `${t.name},${t.artist || ''},${t.url}`).join('\n')
      }
    } catch { /* ignore */ }
    return ''
  }

  // 文本 → music_list JSON
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
        if (data.settings) {
          setSettings(data.settings)
          if (data.settings.music_list) {
            setMusicText(jsonToText(data.settings.music_list))
          }
        } else {
          setError(data.error || '获取设置失败')
        }
      })
      .catch(() => setError('网络错误'))
      .finally(() => setLoading(false))
  }, [])

  const handleChange = (key: string, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }))
    setSuccess(false)
  }

  const handleSave = async () => {
    setSaving(true)
    setError('')
    setSuccess(false)

    // 音乐文本 → JSON；剔除外观配置与音乐字段（已迁移到独立音乐管理页），避免覆盖
    const { effects_config, music_cloud_ids, music_list, ...rest } = settings
    const payload = { ...rest }

    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: payload }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || '保存失败')
        return
      }

      setSettings(data.settings)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch {
      setError('网络错误')
    } finally {
      setSaving(false)
    }
  }

  const handleUploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      if (res.ok) {
        const data = await res.json()
        handleChange('siteLogo', data.url)
      }
    } catch {
      // ignore
    } finally {
      setUploading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>加载中...</div>
      </div>
    )
  }

  if (error && Object.keys(settings).length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="glass-card p-6 text-center">
          <p className="text-sm" style={{ color: '#ef4444' }}>{error}</p>
          <button className="btn-ghost mt-4 text-sm" onClick={() => window.location.reload()}>重试</button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>网站设置</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>修改站名、简介、Logo 等全局配置</p>
      </div>

      <div className="glass-card p-6 space-y-5">
        {success && (
          <div className="p-3 rounded-xl text-sm" style={{ background: 'rgba(34,197,94,0.1)', color: '#22c55e' }}>
            保存成功！设置已更新。
          </div>
        )}

        {error && (
          <div className="p-3 rounded-xl text-sm" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
            站名
          </label>
          <input
            type="text"
            className="glass-input"
            placeholder="站点名称"
            value={settings.siteName || ''}
            onChange={(e) => handleChange('siteName', e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
            站点简介
          </label>
          <textarea
            className="glass-input resize-none"
            rows={2}
            placeholder="站点简介"
            value={settings.siteDescription || ''}
            onChange={(e) => handleChange('siteDescription', e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
            作者昵称
          </label>
          <input
            type="text"
            className="glass-input"
            placeholder="名片上显示的名字"
            value={settings.authorName || ''}
            onChange={(e) => handleChange('authorName', e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
            关于页内容
          </label>
          <textarea
            className="glass-input resize-none"
            rows={4}
            placeholder="关于页内容（支持 Markdown）"
            value={settings.aboutContent || ''}
            onChange={(e) => handleChange('aboutContent', e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
            Logo
          </label>
          <div className="flex items-center gap-3">
            <label className="btn-ghost text-sm cursor-pointer">
              {uploading ? '上传中...' : '上传 Logo'}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleUploadLogo}
                disabled={uploading}
              />
            </label>
            {settings.siteLogo ? (
              <div className="flex items-center gap-2">
                <img
                  src={settings.siteLogo}
                  alt="logo"
                  className="h-8 w-8 rounded-lg object-cover"
                />
                <button
                  className="text-xs"
                  style={{ color: '#ef4444' }}
                  onClick={() => handleChange('siteLogo', '')}
                >
                  移除
                </button>
              </div>
            ) : (
              <span className="text-xs" style={{ color: 'var(--text-secondary)', opacity: 0.6 }}>未设置</span>
            )}
          </div>
        </div>

        {/* 备案信息配置 */}
        <div className="pt-4" style={{ borderTop: '1px solid var(--glass-border)' }}>
          <p className="text-sm font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>备案信息（显示在首页底部）</p>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                备案号
              </label>
              <input
                type="text"
                className="glass-input"
                placeholder="如：蜀ICP备2025000000号（默认 0000）"
                value={settings.icpNo || ''}
                onChange={(e) => handleChange('icpNo', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                备案查询链接（点击备案号跳转）
              </label>
              <input
                type="text"
                className="glass-input"
                placeholder="https://beian.miit.gov.cn/"
                value={settings.icpLink || ''}
                onChange={(e) => handleChange('icpLink', e.target.value)}
              />
            </div>
            <p className="text-xs" style={{ color: 'var(--text-secondary)', opacity: 0.6 }}>
              留空则使用默认：备案号 0000，链接为工信部备案查询
            </p>
          </div>
        </div>

        {/* 社交链接配置 */}
        <div className="pt-4" style={{ borderTop: '1px solid var(--glass-border)' }}>
          <p className="text-sm font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>社交链接（显示在首页名片）</p>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                Bilibili
              </label>
              <input
                type="text"
                className="glass-input"
                placeholder="https://space.bilibili.com/xxx"
                value={settings.social_bilibili || ''}
                onChange={(e) => handleChange('social_bilibili', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                GitHub
              </label>
              <input
                type="text"
                className="glass-input"
                placeholder="https://github.com/xxx"
                value={settings.social_github || ''}
                onChange={(e) => handleChange('social_github', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                QQ 邮箱
              </label>
              <input
                type="text"
                className="glass-input"
                placeholder="mailto:xxx@qq.com"
                value={settings.social_email || ''}
                onChange={(e) => handleChange('social_email', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                QQ
              </label>
              <input
                type="text"
                className="glass-input"
                placeholder="tencent://message/?uin=xxx"
                value={settings.social_qq || ''}
                onChange={(e) => handleChange('social_qq', e.target.value)}
              />
            </div>
            <p className="text-xs" style={{ color: 'var(--text-secondary)', opacity: 0.6 }}>
              留空则不在名片上显示对应图标
            </p>
          </div>
        </div>

        {/* 音乐配置：已迁移到独立页 */}
        <div className="pt-4" style={{ borderTop: '1px solid var(--glass-border)' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>音乐配置</p>
              <p className="text-[11px] mt-1" style={{ color: 'var(--text-secondary)', opacity: 0.6 }}>
                网易云歌单与本地音乐已迁移到独立管理页
              </p>
            </div>
            <Link
              href="/admin/music"
              className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-medium transition-all duration-200"
              style={{ background: 'var(--accent-muted)', color: 'var(--accent)' }}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
              前往音乐管理
            </Link>
          </div>
        </div>

        <div className="pt-2">
          <button
            className="btn-primary w-full"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? '保存中...' : '保存设置'}
          </button>
        </div>
      </div>

      <div className="mt-6">
        <p className="text-xs" style={{ color: 'var(--text-secondary)', opacity: 0.5 }}>
          提示：设置保存后前台立即生效，站名不可硬编码
        </p>
      </div>
    </div>
  )
}