import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { isAuthenticated } from '@/lib/auth'

export async function GET() {
  try {
    const authed = await isAuthenticated()
    if (!authed) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const messages = await prisma.message.findMany({
      where: { approved: false },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ messages })
  } catch {
    return NextResponse.json({ error: '获取待审核留言失败' }, { status: 500 })
  }
}