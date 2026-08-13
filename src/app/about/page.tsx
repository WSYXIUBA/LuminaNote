'use client'

import { useState, useEffect } from 'react'

export default function AboutPage() {
  const [aboutContent, setAboutContent] = useState<string>('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => {
        if (data.settings?.aboutContent) {
          setAboutContent(data.settings.aboutContent)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="w-full py-16 md:py-20">
      <div className="content-container">
        <div className="max-w-3xl mx-auto">
          <div className="mb-14 md:mb-16 text-center">
            <h1 className="text-4xl sm:text-5xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
              关于<span className="gradient-text">纸心</span>
            </h1>
          </div>

          {loading ? (
            <div className="glass-card p-8 sm:p-12 animate-pulse">
              <div className="space-y-4">
                <div className="h-5 bg-white/10 rounded w-3/4" />
                <div className="h-5 bg-white/10 rounded w-full" />
                <div className="h-5 bg-white/10 rounded w-5/6" />
                <div className="h-5 bg-white/10 rounded w-2/3" />
                <div className="h-5 bg-white/10 rounded w-4/5" />
              </div>
            </div>
          ) : aboutContent ? (
            <div
              className="glass-card p-8 sm:p-12 prose-container"
              style={{ color: 'var(--text-secondary)' }}
              dangerouslySetInnerHTML={{ __html: aboutContent.replace(/\n/g, '<br/>') }}
            />
          ) : (
            <div className="glass-card p-8 sm:p-12">
              <div className="space-y-4" style={{ color: 'var(--text-secondary)' }}>
                <p className="text-lg leading-relaxed">
                  一个热爱技术与生活的开发者。
                </p>
                <p className="leading-relaxed">
                  这里是我的个人栖息地，记录技术思考、生活感悟，以及镜头下的世界。
                </p>
                <p
                  className="text-sm leading-relaxed pt-4 border-t"
                  style={{ borderColor: 'var(--glass-border)', color: 'var(--text-secondary)', opacity: 0.7 }}
                >
                  联系方式：<a href="https://github.com/WSYXIUBA" className="hover:underline" target="_blank" style={{ color: 'var(--accent)' }}>GitHub</a>
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}