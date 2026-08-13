import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyCaptcha } from '@/lib/captcha'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get('pageSize') || '10')))

    const where = { approved: true }

    const [messages, total] = await Promise.all([
      prisma.message.findMany({
        where,
        select: {
          id: true,
          nickname: true,
          content: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.message.count({ where }),
    ])

    return NextResponse.json({
      messages,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    })
  } catch {
    return NextResponse.json({ error: '获取留言失败' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { nickname, content, captchaQuestion, captchaAnswer } = body

    if (!nickname || !content) {
      return NextResponse.json({ error: '昵称和内容不能为空' }, { status: 400 })
    }

    if (nickname.length > 50) {
      return NextResponse.json({ error: '昵称不能超过 50 个字符' }, { status: 400 })
    }

    if (content.length > 2000) {
      return NextResponse.json({ error: '内容不能超过 2000 个字符' }, { status: 400 })
    }

    // Verify captcha
    if (!captchaQuestion || !captchaAnswer) {
      return NextResponse.json({ error: '请完成验证码' }, { status: 400 })
    }

    const validCaptcha = verifyCaptcha(captchaQuestion, captchaAnswer)
    if (!validCaptcha) {
      return NextResponse.json({ error: '验证码错误' }, { status: 400 })
    }

    const message = await prisma.message.create({
      data: {
        nickname: nickname.trim(),
        content: content.trim(),
      },
    })

    return NextResponse.json({ message }, { status: 201 })
  } catch {
    return NextResponse.json({ error: '提交留言失败' }, { status: 500 })
  }
}