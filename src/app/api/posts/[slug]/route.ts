import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { isAuthenticated } from '@/lib/auth'
import { renderMarkdown, extractExcerpt } from '@/lib/markdown'
import { recordPageView } from '@/lib/stats'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const post = await prisma.post.findUnique({ where: { slug } })
    if (!post) {
      return NextResponse.json({ error: '文章不存在' }, { status: 404 })
    }

    // Increment views
    await prisma.post.update({
      where: { slug },
      data: { views: { increment: 1 } },
    })

    // Record page view
    await recordPageView(`/posts/${slug}`)

    // Render markdown
    const html = await renderMarkdown(post.content)

    return NextResponse.json({
      post: {
        ...post,
        html,
      },
    })
  } catch {
    return NextResponse.json({ error: '获取文章失败' }, { status: 500 })
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const authed = await isAuthenticated()
    if (!authed) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const { slug } = await params
    const existing = await prisma.post.findUnique({ where: { slug } })
    if (!existing) {
      return NextResponse.json({ error: '文章不存在' }, { status: 404 })
    }

    const body = await request.json()
    const data: any = {}

    if (body.title !== undefined) data.title = body.title
    if (body.content !== undefined) {
      data.content = body.content
      data.excerpt = body.excerpt || extractExcerpt(body.content, 120)
    }
    if (body.cover !== undefined) data.cover = body.cover
    if (body.category !== undefined) data.category = body.category
    if (body.tags !== undefined) data.tags = body.tags
    if (body.published !== undefined) data.published = body.published
    if (body.slug !== undefined && body.slug !== slug) {
      // Check new slug uniqueness
      const slugExists = await prisma.post.findUnique({ where: { slug: body.slug } })
      if (slugExists) {
        return NextResponse.json({ error: '新 slug 已存在' }, { status: 409 })
      }
      data.slug = body.slug
    }

    const post = await prisma.post.update({
      where: { slug },
      data,
    })

    return NextResponse.json({ post })
  } catch {
    return NextResponse.json({ error: '更新文章失败' }, { status: 500 })
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const authed = await isAuthenticated()
    if (!authed) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const { slug } = await params
    const existing = await prisma.post.findUnique({ where: { slug } })
    if (!existing) {
      return NextResponse.json({ error: '文章不存在' }, { status: 404 })
    }

    await prisma.post.delete({ where: { slug } })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: '删除文章失败' }, { status: 500 })
  }
}