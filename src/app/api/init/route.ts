import { NextResponse } from 'next/server'
import { ensureDefaultAdmin } from '@/lib/auth'

export async function POST() {
  try {
    await ensureDefaultAdmin()
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: '初始化失败' }, { status: 500 })
  }
}