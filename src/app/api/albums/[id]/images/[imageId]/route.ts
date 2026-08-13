import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { isAuthenticated } from '@/lib/auth'

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; imageId: string }> }
) {
  try {
    const authed = await isAuthenticated()
    if (!authed) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const { id, imageId } = await params
    const albumId = parseInt(id)
    const imgId = parseInt(imageId)

    if (isNaN(albumId) || isNaN(imgId)) {
      return NextResponse.json({ error: '无效的 ID' }, { status: 400 })
    }

    const image = await prisma.galleryImage.findUnique({ where: { id: imgId } })
    if (!image || image.albumId !== albumId) {
      return NextResponse.json({ error: '图片不存在' }, { status: 404 })
    }

    await prisma.galleryImage.delete({ where: { id: imgId } })

    // Try to delete the file from disk
    const fs = await import('fs/promises')
    const path = await import('path')
    try {
      await fs.unlink(path.join(process.cwd(), 'public', 'uploads', image.filename))
      if (image.thumbnail) {
        await fs.unlink(path.join(process.cwd(), 'public', 'uploads', 'thumbs', image.thumbnail.replace('/uploads/thumbs/', '')))
      }
    } catch {
      // File may not exist on disk, ignore
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: '删除图片失败' }, { status: 500 })
  }
}