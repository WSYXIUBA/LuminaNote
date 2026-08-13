import { NextResponse } from 'next/server'
import { renderMarkdown } from '@/lib/markdown'

export async function POST(request: Request) {
  try {
    const { markdown } = await request.json()
    if (typeof markdown !== 'string') {
      return NextResponse.json({ error: 'markdown 必须是字符串' }, { status: 400 })
    }

    const html = await renderMarkdown(markdown)
    return NextResponse.json({ html })
  } catch {
    return NextResponse.json({ error: '渲染失败' }, { status: 500 })
  }
}