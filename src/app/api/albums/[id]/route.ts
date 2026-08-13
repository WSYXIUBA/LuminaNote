import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { isAuthenticated } from '@/lib/auth'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const albumId = parseInt(id)
    if (isNaN(albumId)) {
      return NextResponse.json({ error: '无效的相册 ID' }, { status: 400 })
    }

    const album = await prisma.album.findUnique({
      where: { id: albumId },
      include: {
        images: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    })

    if (!album) {
      return NextResponse.json({ error: '相册不存在' }, { status: 404 })
    }

    return NextResponse.json({ album })
  } catch {
    return NextResponse.json({ error: '获取相册失败' }, { status: 500 })
  }
}

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
    const albumId = parseInt(id)
    if (isNaN(albumId)) {
      return NextResponse.json({ error: '无效的相册 ID' }, { status: 400 })
    }

    const existing = await prisma.album.findUnique({ where: { id: albumId } })
    if (!existing) {
      return NextResponse.json({ error: '相册不存在' }, { status: 404 })
    }

    const body = await request.json()
    const data: any = {}
    if (body.title !== undefined) data.title = body.title
    if (body.cover !== undefined) data.cover = body.cover
    if (body.sortOrder !== undefined) data.sortOrder = body.sortOrder

    const album = await prisma.album.update({
      where: { id: albumId },
      data,
      include: { _count: { select: { images: true } } },
    })

    return NextResponse.json({ album })
  } catch {
    return NextResponse.json({ error: '更新相册失败' }, { status: 500 })
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
    const albumId = parseInt(id)
    if (isNaN(albumId)) {
      return NextResponse.json({ error: '无效的相册 ID' }, { status: 400 })
    }

    const existing = await prisma.album.findUnique({ where: { id: albumId } })
    if (!existing) {
      return NextResponse.json({ error: '相册不存在' }, { status: 404 })
    }

    await prisma.album.delete({ where: { id: albumId } })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: '删除相册失败' }, { status: 500 })
  }
}