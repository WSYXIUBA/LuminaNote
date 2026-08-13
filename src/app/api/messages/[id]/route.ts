import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { isAuthenticated } from '@/lib/auth'

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authed = await isAuthenticated()
    if (!authed) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const { id } = await params
    const messageId = parseInt(id)
    if (isNaN(messageId)) {
      return NextResponse.json({ error: '无效的留言 ID' }, { status: 400 })
    }

    const existing = await prisma.message.findUnique({ where: { id: messageId } })
    if (!existing) {
      return NextResponse.json({ error: '留言不存在' }, { status: 404 })
    }

    const body = await request.json()

    // 审核通过
    const message = await prisma.message.update({
      where: { id: messageId },
      data: { approved: body.approved ?? true },
    })

    return NextResponse.json({ message })
  } catch {
    return NextResponse.json({ error: '更新留言失败' }, { status: 500 })
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authed = await isAuthenticated()
    if (!authed) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const { id } = await params
    const messageId = parseInt(id)
    if (isNaN(messageId)) {
      return NextResponse.json({ error: '无效的留言 ID' }, { status: 400 })
    }

    const existing = await prisma.message.findUnique({ where: { id: messageId } })
    if (!existing) {
      return NextResponse.json({ error: '留言不存在' }, { status: 404 })
    }

    await prisma.message.delete({ where: { id: messageId } })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: '删除留言失败' }, { status: 500 })
  }
}