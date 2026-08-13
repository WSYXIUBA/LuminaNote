import { SignJWT, jwtVerify } from 'jose'
import bcrypt from 'bcryptjs'
import { cookies } from 'next/headers'
import { prisma } from './db'

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'siyizhixin-habitat-dev-secret-2026'
)
const SESSION_COOKIE = 'admin_session'
const SESSION_MAX_AGE = 60 * 60 * 24 * 7 // 7 天

// 创建管理员账号（首次初始化用）
export async function ensureDefaultAdmin() {
  const existing = await prisma.admin.findFirst()
  if (existing) return
  const hash = await bcrypt.hash('admin123', 10)
  await prisma.admin.create({
    data: { username: 'admin', passwordHash: hash },
  })
}

// 登录验证
export async function verifyLogin(username: string, password: string) {
  const admin = await prisma.admin.findUnique({ where: { username } })
  if (!admin) return false
  return bcrypt.compare(password, admin.passwordHash)
}

// 创建 session
export async function createSession() {
  const token = await new SignJWT({ role: 'admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(SECRET)

  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_MAX_AGE,
    path: '/',
  })
}

// 验证当前请求是否已登录
export async function isAuthenticated() {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  if (!token) return false
  try {
    await jwtVerify(token, SECRET)
    return true
  } catch {
    return false
  }
}

// 登出
export async function destroySession() {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE)
}