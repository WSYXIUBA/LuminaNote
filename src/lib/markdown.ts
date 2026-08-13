import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkRehype from 'remark-rehype'
import remarkGfm from 'remark-gfm'
import rehypeSlug from 'rehype-slug'
import rehypeHighlight from 'rehype-highlight'
import rehypeStringify from 'rehype-stringify'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let processor: any = null

function getProcessor() {
  if (!processor) {
    processor = unified()
      .use(remarkParse)
      .use(remarkGfm)
      .use(remarkRehype)
      .use(rehypeSlug)
      .use(rehypeHighlight)
      .use(rehypeStringify)
  }
  return processor
}

export async function renderMarkdown(md: string): Promise<string> {
  const result = await getProcessor().process(md)
  return String(result)
}

// 从 Markdown 提取纯文本摘要
export function extractExcerpt(md: string, maxLen = 120): string {
  const text = md
    .replace(/```[\s\S]*?```/g, '')
    .replace(/[#>*_`~\-]/g, '')
    .replace(/!\[.*?\]\(.*?\)/g, '')
    .replace(/\[(.*?)\]\(.*?\)/g, '$1')
    .replace(/\n+/g, ' ')
    .trim()
  return text.length > maxLen ? text.slice(0, maxLen) + '…' : text
}

// 从 Markdown 提取标题用于 TOC
export function extractHeadings(md: string) {
  const headings: { level: number; text: string; id: string }[] = []
  const lines = md.split('\n')
  for (const line of lines) {
    const match = line.match(/^(#{1,3})\s+(.+)/)
    if (match) {
      const level = match[1].length
      const text = match[2].trim()
      const id = text
        .toLowerCase()
        .replace(/[^\w\u4e00-\u9fa5]+/g, '-')
        .replace(/^-|-$/g, '')
      headings.push({ level, text, id })
    }
  }
  return headings
}