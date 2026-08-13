import { NextResponse } from 'next/server'
import { generateCaptcha } from '@/lib/captcha'

export async function GET() {
  try {
    const { question } = generateCaptcha()
    // 不返回 answer，让客户端提交时带上 question + userAnswer 由服务端 verifyCaptcha 验证
    return NextResponse.json({ question })
  } catch {
    return NextResponse.json({ error: '生成验证码失败' }, { status: 500 })
  }
}