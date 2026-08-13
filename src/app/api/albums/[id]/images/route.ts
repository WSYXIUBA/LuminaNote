import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { isAuthenticated } from '@/lib/auth'

export async function POST(
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

    const album = await prisma.album.findUnique({ where: { id: albumId } })
    if (!album) {
      return NextResponse.json({ error: '相册不存在' }, { status: 404 })
    }

    const body = await request.json()
    const { filename, thumbnail } = body

    if (!filename) {
      return NextResponse.json({ error: 'filename 不能为空' }, { status: 400 })
    }

    const image = await prisma.galleryImage.create({
      data: {
        albumId,
        filename,
        thumbnail: thumbnail || null,
      },
    })

    // Auto-set first image as cover
    if (!album.cover) {
      await prisma.album.update({
        where: { id: albumId },
        data: { cover: `/uploads/${filename}` },
      })
    }

    return NextResponse.json({ image }, { status: 201 })
  } catch {
    return NextResponse.json({ error: '添加图片失败' }, { status: 500 })
  }
}