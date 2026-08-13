import { NextResponse } from 'next/server'
import { isAuthenticated } from '@/lib/auth'
import sharp from 'sharp'
import fs from 'fs/promises'
import path from 'path'
import crypto from 'crypto'

const UPLOADS_DIR = path.join(process.cwd(), 'uploads')
const THUMBS_DIR = path.join(UPLOADS_DIR, 'thumbs')
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

export async function POST(request: Request) {
  try {
    const authed = await isAuthenticated()
    if (!authed) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    // Ensure directories exist
    await fs.mkdir(UPLOADS_DIR, { recursive: true })
    await fs.mkdir(THUMBS_DIR, { recursive: true })

    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: '请选择文件' }, { status: 400 })
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: '不支持的文件类型，仅支持 jpg/png/webp/gif' }, { status: 400 })
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: '文件大小不能超过 10MB' }, { status: 400 })
    }

    // Generate unique filename
    const ext = path.extname(file.name) || '.jpg'
    const hash = crypto.randomBytes(16).toString('hex')
    const filename = `${hash}${ext}`
    const thumbFilename = `thumb_${hash}${ext}`

    const buffer = Buffer.from(await file.arrayBuffer())

    // Save original
    await fs.writeFile(path.join(UPLOADS_DIR, filename), buffer)

    // Generate thumbnail (300px width)
    await sharp(buffer)
      .resize(300, 300, { fit: 'inside', withoutEnlargement: true })
      .toFile(path.join(THUMBS_DIR, thumbFilename))

    const url = `/uploads/${filename}`
    const thumbUrl = `/uploads/thumbs/${thumbFilename}`

    return NextResponse.json({
      url,
      thumbUrl,
      filename,
    })
  } catch {
    return NextResponse.json({ error: '上传失败' }, { status: 500 })
  }
}