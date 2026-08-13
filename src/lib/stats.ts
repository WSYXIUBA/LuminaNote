import { prisma } from './db'
import { headers } from 'next/headers'

// 记录页面访问（PV + UV）
export async function recordPageView(path: string) {
  const today = new Date().toISOString().slice(0, 10)
  const h = await headers()
  const ip = h.get('x-forwarded-for') || h.get('x-real-ip') || 'unknown'
  const ua = h.get('user-agent') || 'unknown'
  // 简单 visitorId = ip + ua 的 hash
  const visitorId = `${ip}-${ua}`.slice(0, 64)

  await prisma.pageView.create({ data: { path, date: today } })

  // UV 去重：同一天同一个 visitorId 只记一次
  const existing = await prisma.visitor.findFirst({
    where: { visitorId, date: today },
  })
  if (!existing) {
    await prisma.visitor.create({ data: { visitorId, date: today } })
  }
}

// 获取统计数据
export async function getStats() {
  const today = new Date().toISOString().slice(0, 10)
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)

  const [todayPV, yesterdayPV, totalPV, totalUV, postCount] = await Promise.all([
    prisma.pageView.count({ where: { date: today } }),
    prisma.pageView.count({ where: { date: yesterday } }),
    prisma.pageView.count(),
    prisma.visitor.count(),
    prisma.post.count(),
  ])

  // 近 30 天趋势
  const thirtyDaysAgo = new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10)
  const recentViews = await prisma.pageView.groupBy({
    by: ['date'],
    where: { date: { gte: thirtyDaysAgo } },
    _count: true,
  })

  const trend = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(Date.now() - (29 - i) * 86400000).toISOString().slice(0, 10)
    const found = recentViews.find((v) => v.date === d)
    return { date: d, count: found?._count ?? 0 }
  })

  // 热门文章
  const topPosts = await prisma.post.findMany({
    where: { published: true },
    orderBy: { views: 'desc' },
    take: 10,
    select: { id: true, title: true, slug: true, views: true },
  })

  return {
    todayPV,
    yesterdayPV,
    totalPV,
    totalUV,
    postCount,
    trend,
    topPosts,
  }
}