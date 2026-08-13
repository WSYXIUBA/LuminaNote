import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { isAuthenticated } from '@/lib/auth'

export async function GET() {
  try {
    const albums = await prisma.album.findMany({
      include: {
        _count: { select: { images: true } },
      },
      orderBy: { sortOrder: 'asc' },
    })

    return NextResponse.json({ albums })
  } catch {
    return NextResponse.json({ error: '获取相册列表失败' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const authed = await isAuthenticated()
    if (!authed) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const body = await request.json()
    const { title, cover, sortOrder } = body

    if (!title) {
      return NextResponse.json({ error: '相册标题不能为空' }, { status: 400 })
    }

    const album = await prisma.album.create({
      data: {
        title,
        cover: cover || null,
        sortOrder: sortOrder ?? 0,
      },
    })

    return NextResponse.json({ album }, { status: 201 })
  } catch {
    return NextResponse.json({ error: '创建相册失败' }, { status: 500 })
  }
}