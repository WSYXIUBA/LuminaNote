import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'

/* 用户上传文件服务：从项目根 uploads/ 目录动态读取。
   不依赖 public 静态目录（next start 对启动后新增的 public 文件不提供服务，
   会导致上传后的壁纸/缩略图 404），URL 保持 /uploads/... 与旧格式一致 */

const UPLOADS_DIR = path.join(process.cwd(), 'uploads')

const MIME: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webm': 'video/webm',
  '.mp4': 'video/mp4',
  '.mp3': 'audio/mpeg',
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path: segs } = await params
  if (!segs || segs.length === 0) {
    return new NextResponse('Not Found', { status: 404 })
  }

  // 防路径穿越：规范化后必须仍位于 UPLOADS_DIR 内
  const rel = segs.join('/')
  const filePath = path.normalize(path.join(UPLOADS_DIR, rel))
  if (!filePath.startsWith(UPLOADS_DIR + path.sep)) {
    return new NextResponse('Forbidden', { status: 403 })
  }

  try {
    const buf = await fs.readFile(filePath)
    const ext = path.extname(filePath).toLowerCase()
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        'Content-Type': MIME[ext] ?? 'application/octet-stream',
        'Cache-Control': 'public, max-age=86400',
      },
    })
  } catch {
    return new NextResponse('Not Found', { status: 404 })
  }
}
