import { NextResponse } from 'next/server'
import { isAuthenticated } from '@/lib/auth'
import { getStats } from '@/lib/stats'

export async function GET() {
  try {
    const authed = await isAuthenticated()
    if (!authed) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const stats = await getStats()
    return NextResponse.json({ stats })
  } catch {
    return NextResponse.json({ error: '获取统计数据失败' }, { status: 500 })
  }
}