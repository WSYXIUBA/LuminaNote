'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminNewPostPage() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [content, setContent] = useState('')
  const [category, setCategory] = useState('')
  const [tags, setTags] = useState('')
  const [cover, setCover] = useState('')
  const [htmlPreview, setHtmlPreview] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)

  // Auto-generate slug from title
  const handleTitleChange = (val: string) => {
    setTitle(val)
    if (!slug || slug === generateSlug(title)) {
      setSlug(generateSlug(val))
    }
  }

  // Render markdown preview
  const renderPreview = useCallback(async (md: string) => {
    if (!md.trim()) {
      setHtmlPreview('')
      return
    }
    try {
      const res = await fetch('/api/render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markdown: md }),
      })
      if (res.ok) {
        const data = await res.json()
        setHtmlPreview(data.html || '')
      } else {
        // Fallback: simple render
        setHtmlPreview(
          md
            .replace(/### (.+)/g, '<h3>$1</h3>')
            .replace(/## (.+)/g, '<h2>$1</h2>')
            .replace(/# (.+)/g, '<h1>$1</h1>')
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.+?)\*/g, '<em>$1</em>')
            .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" style="max-width:100%"/>')
            .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
            .replace(/\n/g, '<br/>')
        )
      }
    } catch {
      setHtmlPreview('<p style="color:#ef4444">预览渲染失败</p>')
    }
  }, [])

  const handleContentChange = (val: string) => {
    setContent(val)
    renderPreview(val)
  }

  const handleUploadCover = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      if (res.ok) {
        const data = await res.json()
        setCover(data.url)
      }
    } catch {
      // ignore
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async (publish: boolean) => {
    if (!title.trim() || !content.trim() || !slug.trim()) {
      setError('标题、slug 和内容不能为空')
      return
    }
    setSaving(true)
    setError('')

    try {
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: slug.trim(),
          title: title.trim(),
          content,
          cover: cover || undefined,
          category: category.trim() || undefined,
          tags: tags.trim() || undefined,
          published: publish,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || '保存失败')
        return
      }

      router.push('/admin/posts')
    } catch {
      setError('网络错误')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>新建文章</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>用 Markdown 写作</p>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-xl text-sm" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
          {error}
        </div>
      )}

      <div className="space-y-4">
        {/* 标题 & Slug */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
              标题
            </label>
            <input
              type="text"
              className="glass-input"
              placeholder="文章标题"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
              Slug
            </label>
            <input
              type="text"
              className="glass-input"
              placeholder="url-friendly-slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
            />
          </div>
        </div>

        {/* 分类 & 标签 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
              分类
            </label>
            <input
              type="text"
              className="glass-input"
              placeholder="分类名称"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
              标签（逗号分隔）
            </label>
            <input
              type="text"
              className="glass-input"
              placeholder="标签1, 标签2, 标签3"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
            />
          </div>
        </div>

        {/* 封面图 */}
        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
            封面图
          </label>
          <div className="flex items-center gap-3">
            <input
              type="text"
              className="glass-input flex-1"
              placeholder="图片 URL 或上传"
              value={cover}
              onChange={(e) => setCover(e.target.value)}
            />
            <label className="btn-ghost text-sm cursor-pointer">
              {uploading ? '上传中...' : '上传'}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleUploadCover}
                disabled={uploading}
              />
            </label>
          </div>
          {cover && (
            <img
              src={cover}
              alt="cover preview"
              className="mt-2 h-32 rounded-xl object-cover"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
            />
          )}
        </div>

        {/* Markdown 编辑器 */}
        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
            内容（Markdown）
          </label>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <textarea
              className="glass-input resize-none font-mono text-sm"
              rows={20}
              placeholder="在这里写 Markdown..."
              value={content}
              onChange={(e) => handleContentChange(e.target.value)}
            />
            <div
              className="glass-card p-4 overflow-auto prose prose-sm max-w-none"
              style={{ minHeight: '400px', maxHeight: '600px', color: 'var(--text-primary)' }}
              dangerouslySetInnerHTML={{ __html: htmlPreview || '<p style="color:var(--text-secondary)">实时预览</p>' }}
            />
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex items-center gap-3 pt-2">
          <button
            className="btn-primary"
            onClick={() => handleSubmit(true)}
            disabled={saving}
          >
            {saving ? '保存中...' : '发布'}
          </button>
          <button
            className="btn-ghost"
            onClick={() => handleSubmit(false)}
            disabled={saving}
          >
            保存草稿
          </button>
          <button
            className="btn-ghost"
            onClick={() => router.back()}
            disabled={saving}
          >
            取消
          </button>
        </div>
      </div>
    </div>
  )
}

function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\u4e00-\u9fa5]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}