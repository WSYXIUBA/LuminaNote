import { NextResponse } from 'next/server'
import { isAuthenticated, destroySession } from '@/lib/auth'

export async function POST() {
  try {
    const authed = await isAuthenticated()
    if (!authed) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    await destroySession()
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: '登出失败' }, { status: 500 })
  }
}