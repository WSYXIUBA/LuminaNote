import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// 公开统计（无需登录，用于首页名片展示）
export async function GET() {
  try {
    const [postCount, totalPV, totalUV, albumCount, messageCount] = await Promise.all([
      prisma.post.count({ where: { published: true } }),
      prisma.pageView.count(),
      prisma.visitor.count(),
      prisma.album.count(),
      prisma.message.count({ where: { approved: true } }),
    ])

    return NextResponse.json({
      stats: { postCount, totalPV, totalUV, albumCount, messageCount },
    })
  } catch {
    return NextResponse.json({ error: '获取统计失败' }, { status: 500 })
  }
}