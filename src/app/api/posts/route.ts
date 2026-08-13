import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { isAuthenticated } from '@/lib/auth'
import { extractExcerpt } from '@/lib/markdown'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get('pageSize') || '10')))
    const cat = searchParams.get('cat')
    const tag = searchParams.get('tag')
    const q = searchParams.get('q')

    // Build where clause
    const includeDrafts = searchParams.get('includeDrafts') === 'true'
    const where: any = includeDrafts ? {} : { published: true }
    if (cat) where.category = cat
    if (tag) where.tags = { contains: tag }
    if (q) {
      where.OR = [
        { title: { contains: q } },
        { content: { contains: q } },
      ]
    }

    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        where,
        select: {
          id: true,
          slug: true,
          title: true,
          excerpt: true,
          cover: true,
          category: true,
          tags: true,
          published: true,
          views: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.post.count({ where }),
    ])

    return NextResponse.json({
      posts,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    })
  } catch {
    return NextResponse.json({ error: '获取文章列表失败' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const authed = await isAuthenticated()
    if (!authed) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const body = await request.json()
    const { slug, title, content, cover, category, tags, published } = body

    if (!slug || !title || !content) {
      return NextResponse.json({ error: 'slug、标题和内容不能为空' }, { status: 400 })
    }

    // Check slug uniqueness
    const existing = await prisma.post.findUnique({ where: { slug } })
    if (existing) {
      return NextResponse.json({ error: 'slug 已存在' }, { status: 409 })
    }

    const excerpt = body.excerpt || extractExcerpt(content, 120)

    const post = await prisma.post.create({
      data: {
        slug,
        title,
        content,
        excerpt,
        cover: cover || null,
        category: category || null,
        tags: tags || null,
        published: published ?? false,
      },
    })

    return NextResponse.json({ post }, { status: 201 })
  } catch {
    return NextResponse.json({ error: '创建文章失败' }, { status: 500 })
  }
}