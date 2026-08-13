import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import fs from 'node:fs'
import path from 'node:path'

const prisma = new PrismaClient()

async function main() {
  // 默认外观配置（作者当前参数，见 prisma/defaults/effects-config.json）
  // 新访客首次打开即应用此配置，后台「外观定制」可改并另存为全站默认
  const effectsConfig = JSON.stringify(
    JSON.parse(fs.readFileSync(path.join(process.cwd(), 'prisma', 'defaults', 'effects-config.json'), 'utf-8'))
  )

  // 默认站点设置
  const defaults = [
    { key: 'siteName', value: '肆一纸心の栖息居' },
    { key: 'authorName', value: '纸心' },
    { key: 'siteDescription', value: '用文字记录时光，用镜头定格瞬间' },
    { key: 'aboutContent', value: '一个热爱技术与生活的开发者。\n\n这里是我的个人栖息地，记录技术思考、生活感悟，以及镜头下的世界。' },
    { key: 'siteLogo', value: '' },
    { key: 'footerText', value: '毛玻璃之下 · 极简之上' },
    // 社交链接（后台可配）
    { key: 'social_bilibili', value: 'https://space.bilibili.com/' },
    { key: 'social_email', value: '' },
    { key: 'social_github', value: 'https://github.com/WSYXIUBA' },
    { key: 'social_qq', value: '' },
    // 音乐列表（JSON：[{name, artist, url}]）
    { key: 'music_list', value: '[]' },
    // 云音乐歌单 ID（网易云，后台可配）
    { key: 'music_cloud_ids', value: '2737471087,3312626447,2715881285,2095119100,3333734133,2610543834,2122690831' },
    // 背景字幕（后台可配，默认空 = 使用前台内置默认字幕）
    { key: 'captions_config', value: '' },
    // 备案号（后台可配，空 = 前台显示默认占位 0000，链接默认工信部备案查询）
    { key: 'icpNo', value: '' },
    // 默认外观配置（壁纸模式 + 青绿主题 + 渐变文字 + 极光涟漪点击 + 音乐光效等）
    { key: 'effects_config', value: effectsConfig },
  ]

  for (const setting of defaults) {
    await prisma.setting.upsert({
      where: { key: setting.key },
      update: { value: setting.value },
      create: setting,
    })
  }

  // 默认管理员（账号密码从环境变量读，首次部署请修改 .env 的 ADMIN_PASSWORD）
  const existingAdmin = await prisma.admin.findFirst()
  if (!existingAdmin) {
    const adminUser = process.env.ADMIN_USERNAME || 'admin'
    const adminPass = process.env.ADMIN_PASSWORD || 'admin123'
    const hash = await bcrypt.hash(adminPass, 10)
    await prisma.admin.create({
      data: { username: adminUser, passwordHash: hash },
    })
    console.log(`✅ 默认管理员已创建 (${adminUser} / 密码来自 ADMIN_PASSWORD)`)
  }

  console.log('✅ 默认设置已写入')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
