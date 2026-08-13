'use client'

export interface MarkdownViewerProps {
  /**
   * 服务端/上游渲染好的 HTML 字符串，直接注入到 DOM 中。
   * 建议使用 unified + remark/rehype 管线生成该 HTML。
   */
  html: string
}

/**
 * Markdown 渲染组件
 *
 * 接收服务端渲染好的 HTML 字符串，通过 dangerouslySetInnerHTML 渲染。
 * 配合 Tailwind Typography（prose）提供文章排版样式。
 *
 * 使用方式：
 * ```tsx
 * // 父组件中先渲染 HTML（服务端或客户端均可）
 * import { remark } from 'remark'
 * import html from 'remark-html'
 *
 * const result = await remark().use(html).process(markdownContent)
 *
 * // 然后传给此组件
 * <MarkdownViewer html={result.toString()} />
 * ```
 */
export default function MarkdownViewer({ html }: MarkdownViewerProps) {
  return (
    <div
      className="prose max-w-none"
      style={
        {
          color: 'var(--text-primary)',
          '--tw-prose-body': 'var(--text-primary)',
          '--tw-prose-headings': 'var(--text-primary)',
          '--tw-prose-links': 'var(--accent)',
          '--tw-prose-bold': 'var(--text-primary)',
          '--tw-prose-code': 'var(--text-primary)',
          '--tw-prose-pre-bg': 'var(--glass-bg)',
          '--tw-prose-quotes': 'var(--text-secondary)',
          '--tw-prose-quote-borders': 'var(--accent)',
        } as React.CSSProperties
      }
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}