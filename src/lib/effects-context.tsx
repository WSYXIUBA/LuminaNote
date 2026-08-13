'use client'

import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'

/* ============================================================
   效果控制层 — 全站外观定制系统
   第 1 层：背景（动态渐变 / 壁纸 / 纯色 + 配色 + 动效强度 + 渐变速度）
   第 2 层：壁纸效果（透明度 / 模糊 / 磨砂强度）
   第 3 层：组件毛玻璃（透明度 / 模糊 / 饱和度 / 圆角 / 磨砂 / 边框 / 阴影 / 导航透明度）
   附加：字幕开关/透明度/速度、粒子开关/密度
   所有参数实时应用为 CSS 变量，并持久化 localStorage
   ============================================================ */

export type BgMode = 'gradient' | 'wallpaper' | 'plain'

export type ClickStyle = 'ring' | 'ripple' | 'aurora' | 'spark' | 'orbit' | 'bubble'

/* 点击特效风格显示名 */
export const CLICK_STYLE_LABELS: Record<ClickStyle, string> = {
  ring: '光波矩阵',
  ripple: '丝滑水波',
  aurora: '极光涟漪',
  spark: '星辰飞溅',
  orbit: '流光星轨',
  bubble: '琉璃气泡',
}

/* ============================================================
   点击特效参数：每种风格独立存储一套完整参数（互不影响）。
   ring/ripple/aurora/spark/orbit/bubble 各自拥有
   size/count/amp/speed/dur/width/glow/gravity/light 9 个字段
   ============================================================ */
export interface ClickParams {
  size: number     // 效果大小
  count: number    // 数量/密度（碎片数、粒子数、波峰数等）
  amp: number      // 幅度（波纹强度/射线长度/爱心大小/泡泡大小）
  speed: number    // 速度
  dur: number      // 时长
  width: number    // 线条粗细/粒子大小
  glow: number     // 发光强度
  gravity: number  // 重力（粒子风格）
  light: number    // 明暗/透明度
}

export const CLICK_STYLES: ClickStyle[] = ['ring', 'ripple', 'aurora', 'spark', 'orbit', 'bubble']

export const CLICK_PARAM_KEYS: (keyof ClickParams)[] = ['size', 'count', 'amp', 'speed', 'dur', 'width', 'glow', 'gravity', 'light']

/* 每个风格各自的参数定义（自适应设置器：不同风格显示不同的滑块） */
export interface ClickParamDef {
  key: keyof ClickParams
  label: string
  min: number
  max: number
}

export const CLICK_STYLE_PARAMS: Record<ClickStyle, ClickParamDef[]> = {
  ring: [
    { key: 'size', label: '光波范围', min: 10, max: 100 },
    { key: 'count', label: '矩阵密度', min: 8, max: 48 },
    { key: 'amp', label: '光波厚度', min: 5, max: 100 },
    { key: 'speed', label: '扩散速度', min: 1, max: 100 },
    { key: 'dur', label: '发光时长', min: 10, max: 100 },
    { key: 'width', label: '格子大小', min: 2, max: 14 },
    { key: 'glow', label: '发光强度', min: 0, max: 100 },
    { key: 'light', label: '亮度', min: 10, max: 100 },
  ],
  ripple: [
    { key: 'size', label: '波纹范围', min: 10, max: 100 },
    { key: 'amp', label: '波纹强度', min: 1, max: 100 },
    { key: 'speed', label: '波纹速度', min: 1, max: 100 },
    { key: 'dur', label: '特效时长', min: 10, max: 100 },
    { key: 'count', label: '波纹密度', min: 1, max: 10 },
    { key: 'light', label: '明暗对比', min: 0, max: 100 },
  ],
  aurora: [
    { key: 'size', label: '光晕范围', min: 10, max: 100 },
    { key: 'count', label: '光晕层数', min: 3, max: 8 },
    { key: 'amp', label: '光晕强度', min: 1, max: 100 },
    { key: 'speed', label: '扩散速度', min: 1, max: 100 },
    { key: 'dur', label: '特效时长', min: 10, max: 100 },
    { key: 'width', label: '光带粗细', min: 2, max: 16 },
    { key: 'glow', label: '发光强度', min: 0, max: 100 },
    { key: 'light', label: '明暗', min: 10, max: 100 },
  ],
  spark: [
    { key: 'size', label: '效果大小', min: 10, max: 100 },
    { key: 'count', label: '粒子数量', min: 1, max: 80 },
    { key: 'speed', label: '飞溅速度', min: 1, max: 100 },
    { key: 'dur', label: '特效时长', min: 10, max: 100 },
    { key: 'gravity', label: '重力', min: 0, max: 100 },
    { key: 'width', label: '粒子大小', min: 1, max: 10 },
    { key: 'glow', label: '发光强度', min: 0, max: 100 },
  ],
  orbit: [
    { key: 'size', label: '效果大小', min: 10, max: 100 },
    { key: 'count', label: '光点数量', min: 4, max: 40 },
    { key: 'amp', label: '轨道半径', min: 10, max: 100 },
    { key: 'speed', label: '旋转速度', min: 1, max: 100 },
    { key: 'dur', label: '特效时长', min: 10, max: 100 },
    { key: 'width', label: '光点大小', min: 1, max: 8 },
    { key: 'glow', label: '发光强度', min: 0, max: 100 },
    { key: 'light', label: '明暗', min: 10, max: 100 },
  ],
  bubble: [
    { key: 'size', label: '效果大小', min: 10, max: 100 },
    { key: 'count', label: '泡泡数量', min: 1, max: 40 },
    { key: 'amp', label: '泡泡大小', min: 10, max: 100 },
    { key: 'speed', label: '上升速度', min: 1, max: 100 },
    { key: 'dur', label: '特效时长', min: 10, max: 100 },
    { key: 'light', label: '透明度', min: 10, max: 100 },
  ],
}

/* 根据参数定义取出当前值 + 对应的 setter（面板渲染用）。
   参数按风格独立存储：读写都是「当前风格」自己的那套参数，互不影响 */
export function getClickParam(fx: EffectsContextType, style: ClickStyle, p: ClickParamDef): { value: number; set: (v: number) => void } {
  const params = fx.clickParams[style] ?? DEFAULTS.clickParams[style]
  return { value: params[p.key], set: (v) => fx.setClickParam(style, p.key, v) }
}

export const PRESET_WALLPAPERS = [
  '/wallpapers/wallpaper-1.jpg',
  '/wallpapers/wallpaper-2.jpg',
  '/wallpapers/wallpaper-3.jpg',
]

/* 预设主题配色（点击一键应用整套） */
export interface ThemePreset {
  name: string
  accent: string
  accent2: string
}

export const THEME_PRESETS: ThemePreset[] = [
  { name: '紫罗兰', accent: '#8b7cff', accent2: '#45d4e4' },
  { name: '极光蓝', accent: '#38bdf8', accent2: '#a78bfa' },
  { name: '樱花粉', accent: '#f472b6', accent2: '#fb923c' },
  { name: '翡翠绿', accent: '#34d399', accent2: '#22d3ee' },
  { name: '落日橙', accent: '#fb923c', accent2: '#f43f5e' },
  { name: '薄荷青', accent: '#2dd4bf', accent2: '#60a5fa' },
  { name: '黑曜石', accent: '#94a3b8', accent2: '#cbd5e1' },
  { name: '赛博紫', accent: '#d946ef', accent2: '#06b6d4' },
  { name: '玫瑰金', accent: '#e879f9', accent2: '#fbbf24' },
]

/* hex 颜色 → rgba */
export function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '')
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h
  const n = parseInt(full, 16)
  if (Number.isNaN(n)) return `rgba(128, 128, 140, ${alpha})`
  const r = (n >> 16) & 255
  const g = (n >> 8) & 255
  const b = n & 255
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

/* hex → [r, g, b] */
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h
  const n = parseInt(full, 16)
  if (Number.isNaN(n)) return [128, 128, 140]
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

/* 相对亮度 0-1（WCAG 感知亮度，用于文字颜色的次级色推导与对比度衬底选色） */
export function colorLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const s = v / 255
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/* 两个 hex 颜色按比例混合：t=0 → a，t=1 → b（亮度/暗度调色用） */
export function mixHex(a: string, b: string, t: number): string {
  const ca = hexToRgb(a)
  const cb = hexToRgb(b)
  const k = Math.min(1, Math.max(0, t))
  const c = ca.map((v, i) => Math.round(v + (cb[i] - v) * k))
  return `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`
}

/* 所有可调参数的导出 key（后台保存/恢复时用） */
export const EFFECT_KEYS = [
  'bgMode', 'plainColor', 'bgDynamics', 'bgSpeed',
  'accent', 'accent2',
  'wallpaper', 'wallpapers', 'wallpaperOpacity', 'wallpaperBlur', 'wallpaperFrost', 'wallpaperScrim',
  'fontBody', 'fontHeading', 'fontNav', 'fontAux', 'fontBtn', 'fontMono',
  'scaleBody', 'scaleHeading', 'scaleNav', 'scaleAux', 'scaleBtn', 'scaleMono',
  'weightBody', 'weightHeading', 'weightNav', 'weightAux', 'weightBtn', 'weightMono',
  'trackingHeading',
  'textColorMode', 'textColorSolid',
  'textGradFrom', 'textGradTo', 'textGradAngle',
  'textTransColor', 'textTransOpacity', 'textTransBrightness', 'textTransDarkness', 'textTransContrast', 'textTransHalo', 'textTransHaloMode', 'textTransOutline',
  'textTransGlowColor', 'textTransGlow', 'textTransEmboss', 'textTransGlass', 'textTransBlur',
  'textStrokeOn', 'textStrokeWidth', 'textStrokeColor',
  'glassOpacity', 'glassBlur', 'glassSaturate', 'glassRadius',
  'glassFrost', 'glassBorder', 'glassShadow',
  'navOpacity',
  'captionsOn', 'captionsOpacity', 'captionSpeed',
  'effectsOn', 'effectDensity',
  'fireflySize', 'fireflyBrightness', 'fireflyColor', 'fireflyMusic', 'fireflyMusicSens',
  'glowOn', 'glowStyle', 'glowCustomColor', 'glowIntensity', 'glowSpread', 'glowMusic', 'glowSens', 'glowBreathe',
  'avatarGlowOn', 'avatarStyle', 'avatarColor', 'avatarCustomColor', 'avatarIntensity', 'avatarSize', 'avatarSpeed', 'avatarMusic', 'avatarSens',
  'tiltOn', 'trailOn', 'trailLength', 'trailSize', 'trailStyle', 'trailColor', 'trailCustomColor', 'trailOpacity', 'trailGlow', 'leafType',
  'clickOn', 'clickStyle', 'clickColor', 'clickCustomColor', 'clickParams', 'clickRippleContent', 'clickStack',
  'rainOn', 'rainDensity', 'rainSpeed', 'rainAmount', 'rainSize', 'rainHitChance', 'rainFlowChance', 'rainFlowForce', 'rainFogGrow', 'rainFogMax', 'rainWind', 'rainTrail', 'rainRefract', 'rainWet',
] as const

export type EffectKey = (typeof EFFECT_KEYS)[number]

/* 字体分类选项（后台「字体」面板） */
export type FontChoice = 'default' | 'sans' | 'serif' | 'mono' | 'system'
export const FONT_CHOICES: { value: FontChoice; label: string }[] = [
  { value: 'default', label: '默认' },
  { value: 'sans', label: '思源黑体' },
  { value: 'serif', label: '思源宋体' },
  { value: 'mono', label: '等宽' },
  { value: 'system', label: '系统' },
]
export const FONT_CATEGORIES = [
  { key: 'body', label: '正文' },
  { key: 'heading', label: '标题' },
  { key: 'nav', label: '导航' },
  { key: 'aux', label: '辅助小字' },
  { key: 'btn', label: '按钮' },
  { key: 'mono', label: '数字/代码' },
] as const
export type FontCategory = (typeof FONT_CATEGORIES)[number]['key']

/* 字体族映射：default 由 CSS 默认值承担（=现状），其余为具体字体栈 */
export const FONT_STACKS: Record<Exclude<FontChoice, 'default'>, string> = {
  sans: 'var(--font-noto-sc), var(--font-inter), ui-sans-serif, system-ui, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif',
  serif: 'var(--font-serif), var(--font-noto-sc), serif',
  mono: 'ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace',
  system: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif',
}

interface EffectsState {
  /* 第 1 层：背景 */
  bgMode: BgMode
  plainColor: string
  bgDynamics: number        // 渐变/光晕动效强度 0-100
  bgSpeed: number           // 渐变动画速度 0-100 (值大=快)
  accent: string
  accent2: string
  wallpaper: string
  wallpapers: string[]        // 完整壁纸列表（预设 + 自定义），全部可删，随配置持久化
  /* 第 2 层：壁纸效果 */
  wallpaperOpacity: number  // 0-100
  wallpaperBlur: number     // 0-60 px
  wallpaperFrost: number    // 磨砂噪点 0-100
  wallpaperScrim: number    // 文字对比衬底（壁纸蒙层强度）0-60，默认 35
  /* 全局字体（后台「字体」面板，默认=现状，零差异）
     字体族：default=现状 / sans=思源黑体 / serif=思源宋体 / mono=等宽 / system=系统默认 */
  fontBody: FontChoice
  fontHeading: FontChoice
  fontNav: FontChoice
  fontAux: FontChoice
  fontBtn: FontChoice
  fontMono: FontChoice
  scaleBody: number         // 字号缩放 80-150%，100=现状
  scaleHeading: number
  scaleNav: number
  scaleAux: number
  scaleBtn: number
  scaleMono: number
  weightBody: number        // 字重覆盖：0=不覆盖（保持现状），300/400/500/700/900
  weightHeading: number
  weightNav: number
  weightAux: number
  weightBtn: number
  weightMono: number
  trackingHeading: number   // 标题字距 -10~10（单位 0.01em），-2=现状(-0.02em)
  /* 全局文字颜色（后台「文字颜色」面板，默认=现状，零差异）
     模式：default=跟随主题 / solid=单色 / gradient=静态渐变 / transparent=透明叠加 */
  textColorMode: 'default' | 'solid' | 'gradient' | 'transparent'
  textColorSolid: string        // 单色模式文字颜色
  textGradFrom: string          // 渐变起色
  textGradTo: string            // 渐变止色
  textGradAngle: number         // 渐变角度 0-360（默认 135）
  textTransColor: string        // 透明叠加色
  textTransOpacity: number      // 透明不透明度 0-100
  textTransBrightness: number   // 亮度 0-100（0=不调，向白色混合）
  textTransDarkness: number     // 暗度 0-100（0=不调，向黑色混合）
  textTransContrast: number     // 对比度 0-100（0=关，按衬底色自动加黑/白光晕衬底，独立于文字透明度）
  textTransHalo: number         // 光晕范围 0-30 px（衬底光晕的模糊半径，文字全透明也可见）
  textTransHaloMode: 'auto' | 'black' | 'white'  // 衬底颜色：auto=按文字明暗自动选黑/白
  textTransOutline: number      // 轮廓描边 0-8 px（透明文字镂空勾边，颜色跟随衬底色）
  textTransGlowColor: string    // 彩色发光颜色（霓虹光晕，独立于透明度）
  textTransGlow: number         // 发光强度 0-100（0=关，彩色霓虹光晕，透明度 0 也可见）
  textTransEmboss: number       // 立体深度 0-14 px（浮雕偏移阴影，0=关，透明度 0 也可见）
  textTransGlass: number        // 玻璃度 0-100（白色磨砂光晕，0=关，透明度 0 也可见）
  textTransBlur: number         // 模糊度 0-8 px（文字毛玻璃模糊，0=关）
  textStrokeOn: boolean         // 文字描边开关（任意非默认颜色模式可用）
  textStrokeWidth: number       // 描边粗细 0-3 px
  textStrokeColor: string       // 描边颜色
  /* 第 3 层：组件毛玻璃 */
  glassOpacity: number      // 10-90 %
  glassBlur: number         // 0-60 px
  glassSaturate: number     // 100-250 %
  glassRadius: number       // 8-40 px
  glassFrost: number        // 磨砂噪点强度 0-100
  glassBorder: number       // 边框亮度 0-100
  glassShadow: number       // 阴影强度 0-100
  navOpacity: number        // 导航栏透明度 0-100
  /* 附加 */
  captionsOn: boolean
  captionsOpacity: number   // 0-40 %
  captionSpeed: number      // 字幕速度 0-100 (值大=快)
  effectsOn: boolean
  effectDensity: number     // 粒子密度 0-100
  /* 萤火虫 */
  fireflySize: number       // 萤火虫大小 1-12 px
  fireflyBrightness: number // 亮度 20-100 %
  fireflyColor: 'green' | 'warm' | 'cyan' | 'white' | 'random'  // 萤火虫颜色
  fireflyMusic: boolean     // 音乐联动频闪
  fireflyMusicSens: number  // 频闪灵敏度 10-100
  /* 音乐卡片边缘光效 */
  glowOn: boolean           // 边缘光效总开关
  glowStyle: 'accent' | 'warm' | 'cyan' | 'pink' | 'green' | 'white' | 'custom' | 'random'  // 光效颜色
  glowCustomColor: string   // 自定义光效颜色
  glowIntensity: number     // 光效亮度 20-100 %
  glowSpread: number        // 光效扩散范围 20-100 %
  glowMusic: boolean        // 随音乐律动
  glowSens: number          // 律动灵敏度 10-100
  glowBreathe: boolean      // 待机呼吸
  /* 音乐头像光效 */
  avatarGlowOn: boolean     // 头像光效总开关
  avatarStyle: 'ring' | 'rainbow' | 'comet' | 'pulse' | 'orbit' | 'rays' | 'flame' | 'aurora' | 'stardust'  // 效果风格
  avatarColor: 'accent' | 'warm' | 'cyan' | 'pink' | 'green' | 'white' | 'custom' | 'random'  // 颜色模式
  avatarCustomColor: string // 自定义颜色
  avatarIntensity: number   // 亮度 20-100 %
  avatarSize: number        // 光环厚度/扩散 1-100 %
  avatarSpeed: number       // 动画速度 0-100 %（0=静止）
  avatarMusic: boolean      // 随音乐律动
  avatarSens: number        // 律动灵敏度 10-100
  /* 交互特效 */
  tiltOn: boolean           // 卡片 3D 下压
  trailOn: boolean          // 鼠标拖尾
  trailLength: number       // 拖尾长度 5-30
  trailSize: number         // 拖尾粒子大小 1-10
  trailStyle: 'dots' | 'ribbon' | 'sparkle' | 'comet' | 'neon'  // 拖尾风格
  trailColor: 'accent' | 'gradient' | 'custom' | 'random'  // 拖尾颜色模式
  trailCustomColor: string  // 自定义颜色
  trailOpacity: number      // 拖尾透明度 10-100
  trailGlow: number         // 发光强度 0-30 px
  leafType: 'sakura' | 'leaf' | 'mix'  // 落叶类型
  /* 点击特效 */
  clickOn: boolean          // 点击特效开关
  clickStyle: ClickStyle  // 点击特效风格
  clickColor: 'accent' | 'custom' | 'random'  // 点击特效颜色模式
  clickCustomColor: string  // 点击特效自定义颜色
  clickParams: Record<ClickStyle, ClickParams>  // 每风格独立参数（size/count/amp/speed/dur/width/glow/gravity/light）
  clickRippleContent: boolean // 水波是否扭曲组件层（main）—— 开：组件随水波扭曲；关：只扭曲背景层，组件保持清晰
  clickStack: boolean         // 特效叠加：开=新特效不打断旧特效（如两个水波重叠播放）；关=新点击打断上一个特效
  /* 第 4 层：雨幕特效（全屏窗户雨，透过雨幕看 1+2+3 层，视觉上影响所有底层） */
  rainOn: boolean           // 雨幕开关
  rainDensity: number       // 雨量密度 10-100
  rainSpeed: number         // 下落速度 10-100
  rainAmount: number        // 积水速率 10-100（水滴吸收雨量长大的速度）
  rainSize: number          // 水滴大小 10-100
  rainHitChance: number     // 打屏概率 0-100（雨滴落到玻璃上的概率）
  rainFlowChance: number    // 流动概率 0-100（打上玻璃的水滴自发往下流的概率）
  rainFlowForce: number     // 强制流动阈值 0-100（水滴合并到多大强制流下，0=关闭强制）
  rainFogGrow: number       // 水蒸气生成速度 0-100（0=无雾，背景清晰）
  rainFogMax: number        // 水蒸气最大浓度 0-100（雾的阈值上限）
  rainWind: number          // 风力 0-100（雨丝水平摆动强度）
  rainTrail: number         // 雨丝拖尾 0-100（残影保留时长，越高雨丝越长越柔）
  rainRefract: number       // 折射畸变强度 0-100（水滴透镜扭曲背景）
  rainWet: number           // 水痕留存 0-100（流过痕迹的折射水膜消散速度，越高留得越久）
}

interface EffectsContextType extends EffectsState {
  setBgMode: (m: BgMode) => void
  setPlainColor: (v: string) => void
  setBgDynamics: (v: number) => void
  setBgSpeed: (v: number) => void
  setAccent: (v: string) => void
  setAccent2: (v: string) => void
  applyTheme: (t: ThemePreset) => void
  setFontBody: (v: FontChoice) => void
  setFontHeading: (v: FontChoice) => void
  setFontNav: (v: FontChoice) => void
  setFontAux: (v: FontChoice) => void
  setFontBtn: (v: FontChoice) => void
  setFontMono: (v: FontChoice) => void
  setScaleBody: (v: number) => void
  setScaleHeading: (v: number) => void
  setScaleNav: (v: number) => void
  setScaleAux: (v: number) => void
  setScaleBtn: (v: number) => void
  setScaleMono: (v: number) => void
  setWeightBody: (v: number) => void
  setWeightHeading: (v: number) => void
  setWeightNav: (v: number) => void
  setWeightAux: (v: number) => void
  setWeightBtn: (v: number) => void
  setWeightMono: (v: number) => void
  setTrackingHeading: (v: number) => void
  setTextColorMode: (m: 'default' | 'solid' | 'gradient' | 'transparent') => void
  setTextColorSolid: (v: string) => void
  setTextGradFrom: (v: string) => void
  setTextGradTo: (v: string) => void
  setTextGradAngle: (v: number) => void
  setTextTransColor: (v: string) => void
  setTextTransOpacity: (v: number) => void
  setTextTransBrightness: (v: number) => void
  setTextTransDarkness: (v: number) => void
  setTextTransContrast: (v: number) => void
  setTextTransHalo: (v: number) => void
  setTextTransHaloMode: (v: 'auto' | 'black' | 'white') => void
  setTextTransOutline: (v: number) => void
  setTextTransGlowColor: (v: string) => void
  setTextTransGlow: (v: number) => void
  setTextTransEmboss: (v: number) => void
  setTextTransGlass: (v: number) => void
  setTextTransBlur: (v: number) => void
  setTextStrokeOn: (v: boolean) => void
  setTextStrokeWidth: (v: number) => void
  setTextStrokeColor: (v: string) => void
  setWallpaper: (url: string) => void
  addWallpaper: (url: string) => void
  removeWallpaper: (url: string) => void
  setWallpaperOpacity: (v: number) => void
  setWallpaperBlur: (v: number) => void
  setWallpaperFrost: (v: number) => void
  setWallpaperScrim: (v: number) => void
  setGlassOpacity: (v: number) => void
  setGlassBlur: (v: number) => void
  setGlassSaturate: (v: number) => void
  setGlassRadius: (v: number) => void
  setGlassFrost: (v: number) => void
  setGlassBorder: (v: number) => void
  setGlassShadow: (v: number) => void
  setNavOpacity: (v: number) => void
  setCaptionsOn: (v: boolean) => void
  setCaptionsOpacity: (v: number) => void
  setCaptionSpeed: (v: number) => void
  setEffectsOn: (v: boolean) => void
  setEffectDensity: (v: number) => void
  setFireflySize: (v: number) => void
  setFireflyBrightness: (v: number) => void
  setFireflyColor: (v: 'green' | 'warm' | 'cyan' | 'white' | 'random') => void
  setFireflyMusic: (v: boolean) => void
  setFireflyMusicSens: (v: number) => void
  setGlowOn: (v: boolean) => void
  setGlowStyle: (v: 'accent' | 'warm' | 'cyan' | 'pink' | 'green' | 'white' | 'custom' | 'random') => void
  setGlowCustomColor: (v: string) => void
  setGlowIntensity: (v: number) => void
  setGlowSpread: (v: number) => void
  setGlowMusic: (v: boolean) => void
  setGlowSens: (v: number) => void
  setGlowBreathe: (v: boolean) => void
  setAvatarGlowOn: (v: boolean) => void
  setAvatarStyle: (v: 'ring' | 'rainbow' | 'comet' | 'pulse' | 'orbit' | 'rays' | 'flame' | 'aurora' | 'stardust') => void
  setAvatarColor: (v: 'accent' | 'warm' | 'cyan' | 'pink' | 'green' | 'white' | 'custom' | 'random') => void
  setAvatarCustomColor: (v: string) => void
  setAvatarIntensity: (v: number) => void
  setAvatarSize: (v: number) => void
  setAvatarSpeed: (v: number) => void
  setAvatarMusic: (v: boolean) => void
  setAvatarSens: (v: number) => void
  setTiltOn: (v: boolean) => void
  setTrailOn: (v: boolean) => void
  setTrailLength: (v: number) => void
  setTrailSize: (v: number) => void
  setTrailStyle: (v: 'dots' | 'ribbon' | 'sparkle' | 'comet' | 'neon') => void
  setTrailColor: (v: 'accent' | 'gradient' | 'custom' | 'random') => void
  setTrailCustomColor: (v: string) => void
  setTrailOpacity: (v: number) => void
  setTrailGlow: (v: number) => void
  setLeafType: (v: 'sakura' | 'leaf' | 'mix') => void
  setClickOn: (v: boolean) => void
  setClickStyle: (v: ClickStyle) => void
  setClickColor: (v: 'accent' | 'custom' | 'random') => void
  setClickCustomColor: (v: string) => void
  setClickParam: (style: ClickStyle, key: keyof ClickParams, v: number) => void
  setClickRippleContent: (v: boolean) => void
  setClickStack: (v: boolean) => void
  setRainOn: (v: boolean) => void
  setRainDensity: (v: number) => void
  setRainSpeed: (v: number) => void
  setRainAmount: (v: number) => void
  setRainSize: (v: number) => void
  setRainHitChance: (v: number) => void
  setRainFlowChance: (v: number) => void
  setRainFlowForce: (v: number) => void
  setRainFogGrow: (v: number) => void
  setRainFogMax: (v: number) => void
  setRainWind: (v: number) => void
  setRainTrail: (v: number) => void
  setRainRefract: (v: number) => void
  setRainWet: (v: number) => void
  resetAll: () => void
  loadState: (s: Partial<EffectsState>) => void
  exportState: () => EffectsState
  syncLocalState: () => void   // 把当前 state 写入 localStorage（后台保存全局配置后调用）
}

/* 每风格默认参数（一套基线，各风格独立存储后互不影响）。
   默认值已按「丝滑舒服」调优：速度适中、时长从容、密度克制、亮度通透 */
const DEFAULT_CLICK_PARAMS: Record<ClickStyle, ClickParams> = {
  ring:   { size: 55, count: 30, amp: 45, speed: 45, dur: 55, width: 4, glow: 55, gravity: 50, light: 55 },
  ripple: { size: 55, count: 5,  amp: 35, speed: 45, dur: 60, width: 4, glow: 50, gravity: 50, light: 50 },
  aurora: { size: 55, count: 5,  amp: 38, speed: 38, dur: 62, width: 6, glow: 55, gravity: 50, light: 55 },
  spark:  { size: 55, count: 40, amp: 50, speed: 45, dur: 60, width: 3, glow: 55, gravity: 35, light: 55 },
  orbit:  { size: 55, count: 18, amp: 45, speed: 52, dur: 56, width: 3, glow: 55, gravity: 50, light: 55 },
  bubble: { size: 55, count: 14, amp: 45, speed: 35, dur: 65, width: 4, glow: 45, gravity: 50, light: 60 },
}

const DEFAULTS: EffectsState = {
  bgMode: 'gradient',
  plainColor: '#0b0b14',
  bgDynamics: 100,
  bgSpeed: 50,
  accent: '#8b7cff',
  accent2: '#45d4e4',
  wallpaper: PRESET_WALLPAPERS[0],
  wallpapers: [...PRESET_WALLPAPERS],
  wallpaperOpacity: 45,
  wallpaperBlur: 0,
  wallpaperFrost: 0,
  wallpaperScrim: 35,
  /* 全局字体（默认=现状） */
  fontBody: 'default',
  fontHeading: 'default',
  fontNav: 'default',
  fontAux: 'default',
  fontBtn: 'default',
  fontMono: 'default',
  scaleBody: 100,
  scaleHeading: 100,
  scaleNav: 100,
  scaleAux: 100,
  scaleBtn: 100,
  scaleMono: 100,
  weightBody: 0,
  weightHeading: 0,
  weightNav: 0,
  weightAux: 0,
  weightBtn: 0,
  weightMono: 0,
  trackingHeading: -2,
  /* 全局文字颜色（默认=现状，跟随主题） */
  textColorMode: 'default',
  textColorSolid: '#17171f',
  textGradFrom: '#8b7cff',
  textGradTo: '#45d4e4',
  textGradAngle: 135,
  textTransColor: '#f1f1f6',
  textTransOpacity: 80,
  textTransBrightness: 0,
  textTransDarkness: 0,
  textTransContrast: 0,
  textTransHalo: 8,
  textTransHaloMode: 'auto',
  textTransOutline: 0,
  textTransGlowColor: '#8b7cff',
  textTransGlow: 0,
  textTransEmboss: 0,
  textTransGlass: 0,
  textTransBlur: 0,
  textStrokeOn: false,
  textStrokeWidth: 1,
  textStrokeColor: '#000000',
  glassOpacity: 34,
  glassBlur: 24,
  glassSaturate: 185,
  glassRadius: 24,
  glassFrost: 20,
  glassBorder: 60,
  glassShadow: 50,
  navOpacity: 55,
  captionsOn: true,
  captionsOpacity: 7,
  captionSpeed: 50,
  effectsOn: true,
  effectDensity: 60,
  fireflySize: 4,
  fireflyBrightness: 75,
  fireflyColor: 'green',
  fireflyMusic: false,
  fireflyMusicSens: 60,
  glowOn: true,
  glowStyle: 'accent',
  glowCustomColor: '#ff6b9d',
  glowIntensity: 75,
  glowSpread: 60,
  glowMusic: true,
  glowSens: 60,
  glowBreathe: true,
  avatarGlowOn: true,
  avatarStyle: 'ring',
  avatarColor: 'accent',
  avatarCustomColor: '#ff6b9d',
  avatarIntensity: 80,
  avatarSize: 60,
  avatarSpeed: 40,
  avatarMusic: true,
  avatarSens: 60,
  tiltOn: true,
  trailOn: false,
  trailLength: 14,
  trailSize: 4,
  trailStyle: 'ribbon',
  trailColor: 'accent',
  trailCustomColor: '#ff6b9d',
  trailOpacity: 80,
  trailGlow: 14,
  leafType: 'sakura',
  clickOn: true,
  clickStyle: 'ring',
  clickColor: 'accent',
  clickCustomColor: '#ff6b9d',
  clickParams: DEFAULT_CLICK_PARAMS,
  clickRippleContent: true,
  clickStack: false,
  rainOn: false,
  rainDensity: 45,
  rainSpeed: 45,
  rainAmount: 50,
  rainSize: 50,
  rainHitChance: 45,
  rainFlowChance: 30,
  rainFlowForce: 55,
  rainFogGrow: 0,
  rainFogMax: 40,
  rainWind: 40,
  rainTrail: 50,
  rainRefract: 100,
  rainWet: 60,
}

const STORAGE_KEY = 'habitat-effects-v3'

/* 数字字段 / 布尔字段（数据库与 localStorage 存的是字符串，加载时需归一化） */
const NUMERIC_KEYS: EffectKey[] = [
  'bgDynamics', 'bgSpeed',
  'wallpaperOpacity', 'wallpaperBlur', 'wallpaperFrost', 'wallpaperScrim',
  'scaleBody', 'scaleHeading', 'scaleNav', 'scaleAux', 'scaleBtn', 'scaleMono',
  'weightBody', 'weightHeading', 'weightNav', 'weightAux', 'weightBtn', 'weightMono',
  'trackingHeading',
  'textGradAngle', 'textTransOpacity', 'textTransBrightness', 'textTransDarkness', 'textTransContrast', 'textTransHalo', 'textTransOutline', 'textTransGlow', 'textTransEmboss', 'textTransGlass', 'textTransBlur', 'textStrokeWidth',
  'glassOpacity', 'glassBlur', 'glassSaturate', 'glassRadius',
  'glassFrost', 'glassBorder', 'glassShadow', 'navOpacity',
  'captionsOpacity', 'captionSpeed', 'effectDensity',
  'fireflySize', 'fireflyBrightness', 'fireflyMusicSens',
  'glowIntensity', 'glowSpread', 'glowSens',
  'avatarIntensity', 'avatarSize', 'avatarSpeed', 'avatarSens',
  'trailLength', 'trailSize', 'trailOpacity', 'trailGlow',
  'rainDensity', 'rainSpeed', 'rainAmount', 'rainSize', 'rainHitChance', 'rainFlowChance', 'rainFlowForce', 'rainFogGrow', 'rainFogMax', 'rainWind', 'rainTrail', 'rainRefract', 'rainWet',
]
const BOOLEAN_KEYS: EffectKey[] = ['captionsOn', 'effectsOn', 'tiltOn', 'trailOn', 'clickOn', 'clickRippleContent', 'clickStack', 'fireflyMusic', 'glowOn', 'glowMusic', 'glowBreathe', 'avatarGlowOn', 'avatarMusic', 'rainOn', 'textStrokeOn']
const NUMERIC_KEYS_TRAIL: EffectKey[] = ['trailLength', 'trailSize']

/* 将任意来源（数据库/localStorage）的原始值归一化为正确类型 */
function normalize(partial: Record<string, unknown>): Partial<EffectsState> {
  const out: Record<string, unknown> = {}

  /* 旧版迁移：customWallpapers（早期版本）→ wallpapers 完整列表（预设默认存在 + 自定义合并，去重） */
  if (!partial.wallpapers && Array.isArray(partial.customWallpapers)) {
    out.wallpapers = [
      ...new Set([
        ...PRESET_WALLPAPERS,
        ...partial.customWallpapers.filter((x): x is string => typeof x === 'string' && x.trim() !== ''),
      ]),
    ]
  }

  /* 旧版平铺 click 字段迁移：把 clickSize/clickCount/... 折算成每风格一套参数（仅当新格式缺失时） */
  if (!partial.clickParams) {
    const legacyMap: Record<string, keyof ClickParams> = {
      clickSize: 'size', clickCount: 'count', clickAmp: 'amp', clickSpeed: 'speed',
      clickDur: 'dur', clickWidth: 'width', clickGlow: 'glow', clickGravity: 'gravity', clickLight: 'light',
    }
    let hasLegacy = false
    const lp: ClickParams = { ...DEFAULT_CLICK_PARAMS.ring }
    for (const [lk, ck] of Object.entries(legacyMap)) {
      const v = partial[lk]
      if (v !== undefined && v !== null && v !== '') { lp[ck] = Number(v); hasLegacy = true }
    }
    if (hasLegacy) {
      out.clickParams = Object.fromEntries(CLICK_STYLES.map((st) => [st, { ...lp }])) as Record<ClickStyle, ClickParams>
    }
  }

  for (const key of EFFECT_KEYS) {
    const v = partial[key]
    if (v === undefined || v === null || v === '') continue
    if (key === 'clickParams') {
      /* 嵌套对象：每风格独立参数，逐字段归一化（缺失字段保留原值）
         数据库里存的是 JSON 字符串，先解析 */
      let obj: unknown = v
      if (typeof obj === 'string') { try { obj = JSON.parse(obj) } catch { continue } }
      if (obj && typeof obj === 'object') {
        const norm: Record<string, Partial<ClickParams>> = {}
        for (const st of CLICK_STYLES) {
          const src = (obj as Record<string, unknown>)[st]
          if (!src || typeof src !== 'object') continue
          const p: Partial<ClickParams> = {}
          for (const ck of CLICK_PARAM_KEYS) {
            const cv = (src as Record<string, unknown>)[ck]
            if (cv !== undefined && cv !== null && cv !== '') p[ck] = Number(cv)
          }
          if (Object.keys(p).length > 0) norm[st] = p
        }
        if (Object.keys(norm).length > 0) out.clickParams = norm
      }
      continue
    }
    if (key === 'wallpapers' && typeof v === 'string') {
      /* 壁纸列表：数据库里存的是 JSON 字符串（saveToDb 序列化），先解析成数组 */
      try {
        const arr = JSON.parse(v)
        if (Array.isArray(arr)) {
          out[key] = [...new Set(arr.filter((x): x is string => typeof x === 'string' && x.trim() !== '').map((x) => x.trim()))]
        }
      } catch { /* ignore */ }
      continue
    }
    if (Array.isArray(v)) {
      /* 数组字段（如自定义壁纸列表）：过滤空串、去重 */
      out[key] = [...new Set(v.filter((x): x is string => typeof x === 'string' && x.trim() !== '').map((x) => x.trim()))]
      continue
    }
    if (BOOLEAN_KEYS.includes(key)) {
      out[key] = v === true || v === 'true' || v === 1 || v === '1'
    } else if (NUMERIC_KEYS.includes(key)) {
      out[key] = Number(v)
    } else {
      // 旧版本数据兼容：彩虹→主色渐变；脉冲波/火焰→彗星
      if (key === 'trailColor' && (v === 'rainbow' || v === 'rainbow ')) out[key] = 'gradient'
      else if (key === 'trailStyle' && (v === 'pulse' || v === 'pulse ' || v === 'flame' || v === 'flame ')) out[key] = 'comet'
      else if (key === 'avatarStyle' && (v === 'halo' || v === 'halo ')) out[key] = 'rays'
      else if (key === 'clickStyle' && (v === 'burst' || v === 'heart')) out[key] = v === 'burst' ? 'aurora' : 'orbit'
      else out[key] = v
    }
  }
  return out as Partial<EffectsState>
}

/* 合并部分状态：clickParams 为嵌套结构，需按风格深合并（避免整体替换丢掉其他风格的参数）
   数据库/外部传入时 clickParams 可能是 JSON 字符串，先解析 */
function mergeEffects(prev: EffectsState, patch: Partial<EffectsState>): EffectsState {
  const next: EffectsState = { ...prev, ...patch }
  if (patch.clickParams) {
    let cp: unknown = patch.clickParams
    if (typeof cp === 'string') { try { cp = JSON.parse(cp) } catch { cp = null } }
    if (cp && typeof cp === 'object') {
      next.clickParams = { ...prev.clickParams }
      for (const st of CLICK_STYLES) {
        const p = (cp as Record<string, Partial<ClickParams>>)[st]
        if (p && typeof p === 'object') next.clickParams[st] = { ...prev.clickParams[st], ...p }
      }
    }
  }
  return next
}

const EffectsContext = createContext<EffectsContextType>({
  ...DEFAULTS,
  setBgMode: () => {},
  setPlainColor: () => {},
  setBgDynamics: () => {},
  setBgSpeed: () => {},
  setAccent: () => {},
  setAccent2: () => {},
  applyTheme: () => {},
  setFontBody: () => {},
  setFontHeading: () => {},
  setFontNav: () => {},
  setFontAux: () => {},
  setFontBtn: () => {},
  setFontMono: () => {},
  setScaleBody: () => {},
  setScaleHeading: () => {},
  setScaleNav: () => {},
  setScaleAux: () => {},
  setScaleBtn: () => {},
  setScaleMono: () => {},
  setWeightBody: () => {},
  setWeightHeading: () => {},
  setWeightNav: () => {},
  setWeightAux: () => {},
  setWeightBtn: () => {},
  setWeightMono: () => {},
  setTrackingHeading: () => {},
  setTextColorMode: () => {},
  setTextColorSolid: () => {},
  setTextGradFrom: () => {},
  setTextGradTo: () => {},
  setTextGradAngle: () => {},
  setTextTransColor: () => {},
  setTextTransOpacity: () => {},
  setTextTransBrightness: () => {},
  setTextTransDarkness: () => {},
  setTextTransContrast: () => {},
  setTextTransHalo: () => {},
  setTextTransHaloMode: () => {},
  setTextTransOutline: () => {},
  setTextTransGlowColor: () => {},
  setTextTransGlow: () => {},
  setTextTransEmboss: () => {},
  setTextTransGlass: () => {},
  setTextTransBlur: () => {},
  setTextStrokeOn: () => {},
  setTextStrokeWidth: () => {},
  setTextStrokeColor: () => {},
  setWallpaper: () => {},
  addWallpaper: () => {},
  removeWallpaper: () => {},
  setWallpaperOpacity: () => {},
  setWallpaperBlur: () => {},
  setWallpaperFrost: () => {},
  setWallpaperScrim: () => {},
  setGlassOpacity: () => {},
  setGlassBlur: () => {},
  setGlassSaturate: () => {},
  setGlassRadius: () => {},
  setGlassFrost: () => {},
  setGlassBorder: () => {},
  setGlassShadow: () => {},
  setNavOpacity: () => {},
  setCaptionsOn: () => {},
  setCaptionsOpacity: () => {},
  setCaptionSpeed: () => {},
  setFireflySize: () => {},
  setFireflyBrightness: () => {},
  setFireflyColor: () => {},
  setFireflyMusic: () => {},
  setFireflyMusicSens: () => {},
  setEffectsOn: () => {},
  setEffectDensity: () => {},
  setGlowOn: () => {},
  setGlowStyle: () => {},
  setGlowCustomColor: () => {},
  setGlowIntensity: () => {},
  setGlowSpread: () => {},
  setGlowMusic: () => {},
  setGlowSens: () => {},
  setGlowBreathe: () => {},
  setAvatarGlowOn: () => {},
  setAvatarStyle: () => {},
  setAvatarColor: () => {},
  setAvatarCustomColor: () => {},
  setAvatarIntensity: () => {},
  setAvatarSize: () => {},
  setAvatarSpeed: () => {},
  setAvatarMusic: () => {},
  setAvatarSens: () => {},
  setTiltOn: () => {},
  setTrailOn: () => {},
  setTrailLength: () => {},
  setTrailSize: () => {},
  setTrailStyle: () => {},
  setTrailColor: () => {},
  setTrailCustomColor: () => {},
  setTrailOpacity: () => {},
  setTrailGlow: () => {},
  setLeafType: () => {},
  setClickOn: () => {},
  setClickStyle: () => {},
  setClickColor: () => {},
  setClickCustomColor: () => {},
  setClickParam: () => {},
  setClickRippleContent: () => {},
  setClickStack: () => {},
  setRainOn: () => {},
  setRainDensity: () => {},
  setRainSpeed: () => {},
  setRainAmount: () => {},
  setRainSize: () => {},
  setRainHitChance: () => {},
  setRainFlowChance: () => {},
  setRainFlowForce: () => {},
  setRainFogGrow: () => {},
  setRainFogMax: () => {},
  setRainWind: () => {},
  setRainTrail: () => {},
  setRainRefract: () => {},
  setRainWet: () => {},
  resetAll: () => {},
  loadState: () => {},
  exportState: () => DEFAULTS,
  syncLocalState: () => {},
})

export function EffectsProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<EffectsState>(DEFAULTS)
  const hydrated = useRef(false)          // 数据库配置已合并完成（或加载失败）
  const mergedRef = useRef<Partial<EffectsState>>({})
  const lastWriteTRef = useRef(0)         // 本页最后一次写入 localStorage 的时间戳（storage 同步防回弹用）
  const userDirtyRef = useRef(false)      // 用户在 hydration 完成前是否已手动操作（防 hydration 旧状态覆盖新选择）
  const skipNextPersistRef = useRef(false) // hydration 合并引起的 state 变化不写盘（旧快照不得以新时间戳污染全局）
  const stateRef = useRef(state)
  stateRef.current = state   // 渲染期同步最新状态（写盘/持久化用）

  /* 初始化：读 localStorage（用户偏好）→ fetch 数据库（全局默认）→ 合并 */
  useEffect(() => {
    // 1. localStorage（用户本地偏好，覆盖数据库默认值）
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        // 新格式 { v, t, state }；旧格式是裸 state 对象，兼容处理
        const s = parsed && typeof parsed === 'object' && 'state' in parsed && 't' in parsed ? parsed.state : parsed
        if (s && typeof s === 'object') {
          mergedRef.current = normalize(s)
        }
      }
    } catch { /* ignore */ }

    let cancelled = false

    // 2. 数据库全局外观配置（管理员设置的默认值，仅当 localStorage 无对应项时生效）
    fetch('/api/settings')
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return
        const s = data.settings
        let dbState: Partial<EffectsState> = {}
        if (s && s.effects_config) {
          try {
            dbState = normalize(JSON.parse(s.effects_config))
          } catch { /* ignore */ }
        }
        const merged = mergedRef.current
        const out: Partial<EffectsState> = {}
        for (const key of EFFECT_KEYS) {
          if (merged[key] !== undefined) {
            ;(out as any)[key] = merged[key]
          } else if (dbState[key] !== undefined) {
            ;(out as any)[key] = dbState[key]
          }
        }
        if (userDirtyRef.current) {
          // 用户已在 hydration 完成前手动改过：保留用户状态，不覆盖；
          // 强制 re-render 让 CSS 变量 effect 应用用户已改的配置，并立即写盘
          hydrated.current = true
          setState((prev) => ({ ...prev }))
          try {
            lastWriteTRef.current = Date.now()
            localStorage.setItem(STORAGE_KEY, JSON.stringify({ v: 1, t: lastWriteTRef.current, state: stateRef.current }))
          } catch { /* ignore */ }
          return
        }
        setState((prev) => mergeEffects(prev, out))
        skipNextPersistRef.current = true   // 旧快照合并：跳过本次持久化，防止污染其他标签页
        hydrated.current = true
      })
      .catch(() => {
        if (cancelled) return
        if (userDirtyRef.current) {
          // 用户已操作：保留用户状态
          hydrated.current = true
          return
        }
        if (Object.keys(mergedRef.current).length > 0) {
          setState((prev) => mergeEffects(prev, mergedRef.current))
        }
        skipNextPersistRef.current = true
        hydrated.current = true
      })

    return () => { cancelled = true }
  }, [])

  /* 监听其他标签页（后台）保存的配置 → 实时同步到当前页面，无需刷新。
     只接受时间戳比本页最后一次写入更新的数据，防止旧状态把新选择弹回。
     收到后只应用、不写回（写回会刷新时间戳形成无限回声，
     旧内容不断以新时间戳传播，把用户刚点的选项顶掉）。 */
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY || !e.newValue) return
      try {
        const parsed = JSON.parse(e.newValue)
        const s = parsed && typeof parsed === 'object' && 'state' in parsed && 't' in parsed
          ? parsed
          : { state: parsed, t: 0 }   // 旧格式：视为最早写入，无条件接受
        if (typeof s.t === 'number' && s.t <= lastWriteTRef.current) return  // 旧的写入，忽略
        skipNextPersistRef.current = true   // 本次 state 变化不写回（防回声循环）
        setState((prev) => mergeEffects(prev, normalize(s.state)))
      } catch { /* ignore */ }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  /* 状态变化 → 应用 CSS 变量 + 持久化 */
  useEffect(() => {
    if (!hydrated.current) return
    const root = document.documentElement

    /* ---- 配色（全站 --accent / --accent-2 / 渐变 / 光斑联动） ---- */
    root.style.setProperty('--accent', state.accent)
    root.style.setProperty('--accent-2', state.accent2)
    root.style.setProperty('--gradient-main', `linear-gradient(135deg, ${state.accent} 0%, ${state.accent2} 100%)`)
    root.style.setProperty('--accent-muted', hexToRgba(state.accent, 0.12))
    root.style.setProperty('--spot-1', hexToRgba(state.accent, 0.28))
    root.style.setProperty('--spot-2', hexToRgba(state.accent2, 0.2))
    root.style.setProperty('--spot-3', hexToRgba(state.accent, 0.12))

    /* ---- 第 1 层：背景 ---- */
    root.dataset.bgMode = state.bgMode
    if (state.bgMode === 'plain') {
      root.style.setProperty('--bg-base', state.plainColor)
    } else {
      root.style.removeProperty('--bg-base')
    }
    root.style.setProperty('--bg-dynamics', String(state.bgDynamics / 100))
    // 渐变动画速度：50 = 18s（默认），0 = 60s（最慢），100 = 6s（最快）
    const animDuration = 60 - (state.bgSpeed / 100) * 54
    root.style.setProperty('--bg-anim-duration', `${animDuration}s`)

    /* ---- 第 2 层：壁纸效果 ---- */
    root.style.setProperty('--wallpaper-opacity', String(state.wallpaperOpacity / 100))
    root.style.setProperty('--wallpaper-blur', `${state.wallpaperBlur}px`)
    root.style.setProperty('--wallpaper-frost', String(state.wallpaperFrost / 100))
    root.style.setProperty('--wallpaper-scrim', String(state.wallpaperScrim / 100))

    /* ---- 全局字体（默认=现状，仅自定义时写变量） ---- */
    const setFontVar = (key: string, choice: FontChoice) => {
      if (choice === 'default') {
        root.style.removeProperty(key)
      } else {
        root.style.setProperty(key, FONT_STACKS[choice])
      }
    }
    setFontVar('--font-body', state.fontBody)
    setFontVar('--font-heading', state.fontHeading)
    setFontVar('--font-nav', state.fontNav)
    setFontVar('--font-aux', state.fontAux)
    setFontVar('--font-btn', state.fontBtn)
    setFontVar('--font-mono', state.fontMono)
    /* 字号缩放（默认 100% = 现状，calc 乘 1 与现状像素一致） */
    root.style.setProperty('--font-scale-body', String(state.scaleBody / 100))
    root.style.setProperty('--font-scale-heading', String(state.scaleHeading / 100))
    root.style.setProperty('--font-scale-nav', String(state.scaleNav / 100))
    root.style.setProperty('--font-scale-aux', String(state.scaleAux / 100))
    root.style.setProperty('--font-scale-btn', String(state.scaleBtn / 100))
    root.style.setProperty('--font-scale-mono', String(state.scaleMono / 100))
    /* 字重覆盖（0=不覆盖，保持现状） */
    const setWeight = (cat: string, w: number) => {
      if (w > 0) {
        root.dataset[`fw${cat[0].toUpperCase()}${cat.slice(1)}`] = 'on'
        root.style.setProperty(`--font-weight-${cat}`, String(w))
      } else {
        delete root.dataset[`fw${cat[0].toUpperCase()}${cat.slice(1)}`]
        root.style.removeProperty(`--font-weight-${cat}`)
      }
    }
    setWeight('body', state.weightBody)
    setWeight('heading', state.weightHeading)
    setWeight('nav', state.weightNav)
    setWeight('aux', state.weightAux)
    setWeight('btn', state.weightBtn)
    setWeight('mono', state.weightMono)
    /* 标题字距（默认 -2 = -0.02em = 现状） */
    root.style.setProperty('--font-tracking-heading', `${state.trackingHeading / 100}em`)

    /* ---- 全局文字颜色（默认=现状，仅自定义时覆写） ---- */
    root.dataset.textColor = state.textColorMode
    switch (state.textColorMode) {
      case 'default':
        /* 跟随主题：清掉所有覆写，回到 :root / .dark 定义 */
        root.style.removeProperty('--text-primary')
        root.style.removeProperty('--text-secondary')
        root.style.removeProperty('--text-gradient')
        root.style.removeProperty('--text-shadow-readable')
        break
      case 'solid': {
        /* 单色：主色 = 所选颜色；次级色按亮度自动变浅/变深，保持层次 */
        root.style.setProperty('--text-primary', state.textColorSolid)
        root.style.setProperty('--text-secondary',
          colorLuminance(state.textColorSolid) > 0.5
            ? mixHex(state.textColorSolid, '#000000', 0.5)
            : mixHex(state.textColorSolid, '#ffffff', 0.45))
        root.style.removeProperty('--text-gradient')
        root.style.removeProperty('--text-shadow-readable')
        break
      }
      case 'gradient': {
        /* 渐变：静态渐变（无动画），纯 CSS 只作用于纯文字元素，见 globals.css */
        root.style.setProperty('--text-gradient',
          `linear-gradient(${state.textGradAngle}deg, ${state.textGradFrom} 0%, ${state.textGradTo} 100%)`)
        root.style.removeProperty('--text-primary')
        root.style.removeProperty('--text-secondary')
        root.style.removeProperty('--text-shadow-readable')
        break
      }
      case 'transparent': {
        /* 透明叠加：亮度→向白混合，暗度→向黑混合，再套不透明度 */
        let c = state.textTransColor
        if (state.textTransBrightness > 0) c = mixHex(c, '#ffffff', state.textTransBrightness / 100)
        if (state.textTransDarkness > 0) c = mixHex(c, '#000000', state.textTransDarkness / 100)
        const a = state.textTransOpacity / 100
        root.style.setProperty('--text-primary', hexToRgba(c, a))
        root.style.setProperty('--text-secondary', hexToRgba(c, a * 0.72))
        root.style.removeProperty('--text-gradient')
        /* 衬底色（含亮度/暗度调制，0=黑 255=白）：
           亮度/暗度不仅改填充色，也调制光晕/描边/浮雕的明暗 ——
           即使透明度=0，亮度/暗度拉条依然有可见效果 */
        const lum = colorLuminance(c)
        const mode = state.textTransHaloMode
        const darkBase = mode === 'auto' ? lum <= 0.5 : mode === 'black'
        const shift = (state.textTransBrightness - state.textTransDarkness) / 100
        const haloV = Math.max(0, Math.min(255, Math.round((darkBase ? 0 : 255) + shift * 255)))
        const gg = (v: number) => `rgb(${v},${v},${v})`
        const parts: string[] = []
        /* 基础衬底：透明度=0 时始终存在一层 2px 衬底（明暗随亮度/暗度），
           保证文字永不彻底消失 */
        if (a <= 0.01) parts.push(`0 0 2px ${gg(haloV)}`)
        /* 立体浮雕：偏移阴影独立于透明度，透明度=0 也能看出立体字形 */
        const emb = state.textTransEmboss
        if (emb > 0) {
          parts.push(`0 -${emb}px 0 ${gg(Math.min(255, haloV + 110))}`)
          parts.push(`0 ${emb}px 0 ${gg(Math.max(0, haloV - 110))}`)
        }
        /* 对比度光晕：独立图层，强度随对比度，明暗随亮度/暗度 */
        const k = state.textTransContrast / 100
        const halo = state.textTransHalo
        if (state.textTransContrast > 0 && halo > 0) {
          parts.push(
            `0 0 ${(Math.max(1, halo * 0.25)).toFixed(1)}px rgba(${haloV},${haloV},${haloV},${(0.25 + 0.5 * k).toFixed(2)}), ` +
            `0 0 ${(Math.max(2, halo * 0.6)).toFixed(1)}px rgba(${haloV},${haloV},${haloV},${(0.12 + 0.35 * k).toFixed(2)}), ` +
            `0 0 ${(Math.max(4, halo)).toFixed(1)}px rgba(${haloV},${haloV},${haloV},${(0.06 + 0.22 * k).toFixed(2)})`)
        }
        /* 彩色发光：独立颜色 + 强度（霓虹效果），透明度=0 也可见 */
        const glow = state.textTransGlow / 100
        if (glow > 0) {
          parts.push(
            `0 0 ${(4 + glow * 16).toFixed(1)}px ${hexToRgba(state.textTransGlowColor, 0.35 + 0.4 * glow)}, ` +
            `0 0 ${(8 + glow * 28).toFixed(1)}px ${hexToRgba(state.textTransGlowColor, 0.15 + 0.25 * glow)}`)
        }
        /* 玻璃度：白色磨砂光晕（玻璃质感），透明度=0 也可见 */
        const glass = state.textTransGlass / 100
        if (glass > 0) {
          parts.push(`0 0 ${(5 + glass * 25).toFixed(1)}px rgba(255,255,255,${(0.2 + 0.5 * glass).toFixed(2)})`)
        }
        if (parts.length > 0) {
          root.style.setProperty('--text-shadow-readable', parts.join(', '))
        } else {
          root.style.removeProperty('--text-shadow-readable')
        }
        break
      }
    }
    /* 文字描边：透明模式优先用面板内「轮廓描边」（颜色跟随衬底色，
       透明文字=镂空勾边字）；否则用全局描边开关（任意非默认模式可用） */
    const transOutline = state.textColorMode === 'transparent' && state.textTransOutline > 0
    if (transOutline) {
      const lum2 = colorLuminance(state.textTransColor)
      const mode2 = state.textTransHaloMode
      const dark2 = mode2 === 'auto' ? lum2 <= 0.5 : mode2 === 'black'
      const shift2 = (state.textTransBrightness - state.textTransDarkness) / 100
      const v2 = Math.max(0, Math.min(255, Math.round((dark2 ? 0 : 255) + shift2 * 255)))
      root.dataset.textStroke = 'on'
      root.style.setProperty('--text-stroke', `${state.textTransOutline}px rgb(${v2},${v2},${v2})`)
    } else if (state.textStrokeOn && state.textStrokeWidth > 0 && state.textColorMode !== 'default') {
      root.dataset.textStroke = 'on'
      root.style.setProperty('--text-stroke', `${state.textStrokeWidth}px ${state.textStrokeColor}`)
    } else {
      delete root.dataset.textStroke
      root.style.removeProperty('--text-stroke')
    }

    /* 透明模式文字模糊（毛玻璃质感）：0=关 */
    if (state.textColorMode === 'transparent' && state.textTransBlur > 0) {
      root.dataset.textBlur = 'on'
      root.style.setProperty('--text-blur', `${state.textTransBlur}px`)
    } else {
      root.style.removeProperty('--text-blur')
      delete root.dataset.textBlur
    }

    /* ---- 第 3 层：组件毛玻璃（全局 .glass-card / .glass-nav） ---- */
    root.style.setProperty('--glass-opacity', String(state.glassOpacity / 100))
    root.style.setProperty('--glass-blur', `${state.glassBlur}px`)
    root.style.setProperty('--glass-saturate', `${state.glassSaturate}%`)
    root.style.setProperty('--glass-radius', `${state.glassRadius}px`)
    root.style.setProperty('--glass-frost', String(state.glassFrost / 100))
    root.style.setProperty('--glass-border-opacity', String(state.glassBorder / 100))
    root.style.setProperty('--glass-shadow-strength', String(state.glassShadow / 100))
    /* 玻璃 backdrop 滤镜完全交给 CSS：globals.css 里
       --glass-backdrop = blur(var(--glass-blur)) saturate(var(--glass-saturate))
       构建期 CSS 压缩器已确认保留标准 backdrop-filter，无需 JS 内联。
       （旧方案用 JS 联动透明度压缩模糊值，透明度低时模糊被压到 1/3，
       表现为“玻璃模糊怎么调都不明显”） */
    // 导航栏透明度
    const isDark = root.classList.contains('dark')
    const navBase = isDark ? '11,12,22' : '244,244,249'
    root.style.setProperty('--nav-bg', `rgba(${navBase}, ${state.navOpacity / 100})`)

    /* ---- 附加 ---- */
    root.dataset.captions = state.captionsOn ? 'on' : 'off'
    root.style.setProperty('--caption-opacity', String(state.captionsOpacity / 100))
    // 字幕速度：50 = 默认，0 = 最慢（3倍），100 = 最快（0.5倍）
    root.style.setProperty('--caption-speed', String(state.captionSpeed / 50))
    root.dataset.effects = state.effectsOn ? 'on' : 'off'
    root.style.setProperty('--effect-density', String(state.effectDensity / 100))
    root.dataset.leaf = state.leafType

    /* ---- 交互特效 ---- */
    root.style.setProperty('--trail-length', String(state.trailLength))
    root.style.setProperty('--trail-size', String(state.trailSize))
    root.style.setProperty('--trail-style', state.trailStyle)
    root.style.setProperty('--trail-color', state.trailColor)
    root.style.setProperty('--trail-custom-color', state.trailCustomColor)
    root.style.setProperty('--trail-opacity', String(state.trailOpacity))
    root.style.setProperty('--trail-glow', String(state.trailGlow))
    root.dataset.trail = state.trailOn ? 'on' : 'off'

    /* ---- 点击特效 ---- */
    root.dataset.click = state.clickOn ? 'on' : 'off'
    root.style.setProperty('--click-style', state.clickStyle)
    root.style.setProperty('--click-color', state.clickColor)
    root.style.setProperty('--click-custom-color', state.clickCustomColor)

    // 写盘：leading（立即）+ trailing（防抖）混合节流，带时间戳。
    // - 离散点击：立即写盘并更新时间戳 → 其他标签页的旧内容立刻被拒，选择不会被顶掉
    // - 滑块拖动：首个变化立即写，之后 150ms 防抖补写，拖完必达
    // - storage 收到（回声循环）/ hydration 合并：skipNextPersistRef 跳过，不写盘
    // 写盘内容取 stateRef.current（最新状态），避免闭包捕获旧快照。
    if (skipNextPersistRef.current) {
      skipNextPersistRef.current = false
      return
    }
    const write = () => {
      try {
        lastWriteTRef.current = Date.now()
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ v: 1, t: lastWriteTRef.current, state: stateRef.current }))
      } catch { /* ignore */ }
    }
    if (Date.now() - lastWriteTRef.current >= 150) {
      write()   // leading edge：立即写
      return
    }
    const t = setTimeout(write, 150)   // trailing edge：防抖补写
    return () => clearTimeout(t)
  }, [state])

  /* 监听主题切换，动态更新导航栏底色 */
  useEffect(() => {
    if (!hydrated.current) return
    const observer = new MutationObserver(() => {
      const root = document.documentElement
      const isDark = root.classList.contains('dark')
      const navBase = isDark ? '11,12,22' : '244,244,249'
      root.style.setProperty('--nav-bg', `rgba(${navBase}, ${state.navOpacity / 100})`)
    })
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [state.navOpacity])

  const set = useCallback(<K extends keyof EffectsState>(key: K, value: EffectsState[K]) => {
    userDirtyRef.current = true   // 用户手动操作标记（hydration 竞态防护）
    setState((prev) => ({ ...prev, [key]: value }))
  }, [])

  const value: EffectsContextType = {
    ...state,
    setBgMode: (m) => set('bgMode', m),
    setPlainColor: (v) => set('plainColor', v),
    setBgDynamics: (v) => set('bgDynamics', v),
    setBgSpeed: (v) => set('bgSpeed', v),
    setAccent: (v) => set('accent', v),
    setAccent2: (v) => set('accent2', v),
    applyTheme: (t) => {
      userDirtyRef.current = true
      setState((prev) => ({ ...prev, accent: t.accent, accent2: t.accent2 }))
    },
    setFontBody: (v) => set('fontBody', v),
    setFontHeading: (v) => set('fontHeading', v),
    setFontNav: (v) => set('fontNav', v),
    setFontAux: (v) => set('fontAux', v),
    setFontBtn: (v) => set('fontBtn', v),
    setFontMono: (v) => set('fontMono', v),
    setScaleBody: (v) => set('scaleBody', v),
    setScaleHeading: (v) => set('scaleHeading', v),
    setScaleNav: (v) => set('scaleNav', v),
    setScaleAux: (v) => set('scaleAux', v),
    setScaleBtn: (v) => set('scaleBtn', v),
    setScaleMono: (v) => set('scaleMono', v),
    setWeightBody: (v) => set('weightBody', v),
    setWeightHeading: (v) => set('weightHeading', v),
    setWeightNav: (v) => set('weightNav', v),
    setWeightAux: (v) => set('weightAux', v),
    setWeightBtn: (v) => set('weightBtn', v),
    setWeightMono: (v) => set('weightMono', v),
    setTrackingHeading: (v) => set('trackingHeading', v),
    setTextColorMode: (m) => set('textColorMode', m),
    setTextColorSolid: (v) => set('textColorSolid', v),
    setTextGradFrom: (v) => set('textGradFrom', v),
    setTextGradTo: (v) => set('textGradTo', v),
    setTextGradAngle: (v) => set('textGradAngle', v),
    setTextTransColor: (v) => set('textTransColor', v),
    setTextTransOpacity: (v) => set('textTransOpacity', v),
    setTextTransBrightness: (v) => set('textTransBrightness', v),
    setTextTransDarkness: (v) => set('textTransDarkness', v),
    setTextTransContrast: (v) => set('textTransContrast', v),
    setTextTransHalo: (v) => set('textTransHalo', v),
    setTextTransHaloMode: (v) => set('textTransHaloMode', v),
    setTextTransOutline: (v) => set('textTransOutline', v),
    setTextTransGlowColor: (v) => set('textTransGlowColor', v),
    setTextTransGlow: (v) => set('textTransGlow', v),
    setTextTransEmboss: (v) => set('textTransEmboss', v),
    setTextTransGlass: (v) => set('textTransGlass', v),
    setTextTransBlur: (v) => set('textTransBlur', v),
    setTextStrokeOn: (v) => set('textStrokeOn', v),
    setTextStrokeWidth: (v) => set('textStrokeWidth', v),
    setTextStrokeColor: (v) => set('textStrokeColor', v),
    setWallpaper: (url) => set('wallpaper', url),
    addWallpaper: (url) => {
      const u = url.trim()
      if (!u) return
      userDirtyRef.current = true
      setState((prev) => ({
        ...prev,
        wallpapers: prev.wallpapers.includes(u) ? prev.wallpapers : [...prev.wallpapers, u],
      }))
    },
    removeWallpaper: (url) => {
      userDirtyRef.current = true
      setState((prev) => {
        const next = prev.wallpapers.filter((u) => u !== url)
        // 删除的是当前选中壁纸：回退到剩余第一张；删光则清空选中（壁纸层透明露出底层背景）
        const wallpaper = prev.wallpaper === url ? (next[0] ?? '') : prev.wallpaper
        return { ...prev, wallpapers: next, wallpaper }
      })
    },
    setWallpaperOpacity: (v) => set('wallpaperOpacity', v),
    setWallpaperBlur: (v) => set('wallpaperBlur', v),
    setWallpaperFrost: (v) => set('wallpaperFrost', v),
    setWallpaperScrim: (v) => set('wallpaperScrim', v),
    setGlassOpacity: (v) => set('glassOpacity', v),
    setGlassBlur: (v) => set('glassBlur', v),
    setGlassSaturate: (v) => set('glassSaturate', v),
    setGlassRadius: (v) => set('glassRadius', v),
    setGlassFrost: (v) => set('glassFrost', v),
    setGlassBorder: (v) => set('glassBorder', v),
    setGlassShadow: (v) => set('glassShadow', v),
    setNavOpacity: (v) => set('navOpacity', v),
    setCaptionsOn: (v) => set('captionsOn', v),
    setCaptionsOpacity: (v) => set('captionsOpacity', v),
    setCaptionSpeed: (v) => set('captionSpeed', v),
    setEffectsOn: (v) => set('effectsOn', v),
    setEffectDensity: (v) => set('effectDensity', v),
    setFireflySize: (v) => set('fireflySize', v),
    setFireflyBrightness: (v) => set('fireflyBrightness', v),
    setFireflyColor: (v) => set('fireflyColor', v),
    setFireflyMusic: (v) => set('fireflyMusic', v),
    setFireflyMusicSens: (v) => set('fireflyMusicSens', v),
    setGlowOn: (v) => set('glowOn', v),
    setGlowStyle: (v) => set('glowStyle', v),
    setGlowCustomColor: (v) => set('glowCustomColor', v),
    setGlowIntensity: (v) => set('glowIntensity', v),
    setGlowSpread: (v) => set('glowSpread', v),
    setGlowMusic: (v) => set('glowMusic', v),
    setGlowSens: (v) => set('glowSens', v),
    setGlowBreathe: (v) => set('glowBreathe', v),
    setAvatarGlowOn: (v) => set('avatarGlowOn', v),
    setAvatarStyle: (v) => set('avatarStyle', v),
    setAvatarColor: (v) => set('avatarColor', v),
    setAvatarCustomColor: (v) => set('avatarCustomColor', v),
    setAvatarIntensity: (v) => set('avatarIntensity', v),
    setAvatarSize: (v) => set('avatarSize', v),
    setAvatarSpeed: (v) => set('avatarSpeed', v),
    setAvatarMusic: (v) => set('avatarMusic', v),
    setAvatarSens: (v) => set('avatarSens', v),
    setTiltOn: (v) => set('tiltOn', v),
    setTrailOn: (v) => set('trailOn', v),
    setTrailLength: (v) => set('trailLength', v),
    setTrailSize: (v) => set('trailSize', v),
    setTrailStyle: (v) => set('trailStyle', v),
    setTrailColor: (v) => set('trailColor', v),
    setTrailCustomColor: (v) => set('trailCustomColor', v),
    setTrailOpacity: (v) => set('trailOpacity', v),
    setTrailGlow: (v) => set('trailGlow', v),
    setLeafType: (v) => set('leafType', v),
    setClickOn: (v) => set('clickOn', v),
    setClickStyle: (v) => set('clickStyle', v),
    setClickColor: (v) => set('clickColor', v),
    setClickCustomColor: (v) => set('clickCustomColor', v),
    setClickParam: (style, key, v) => {
      userDirtyRef.current = true
      setState((prev) => ({ ...prev, clickParams: { ...prev.clickParams, [style]: { ...prev.clickParams[style], [key]: v } } }))
    },
    setClickRippleContent: (v) => set('clickRippleContent', v),
    setClickStack: (v) => set('clickStack', v),
    setRainOn: (v) => set('rainOn', v),
    setRainDensity: (v) => set('rainDensity', v),
    setRainSpeed: (v) => set('rainSpeed', v),
    setRainAmount: (v) => set('rainAmount', v),
    setRainSize: (v) => set('rainSize', v),
    setRainHitChance: (v) => set('rainHitChance', v),
    setRainFlowChance: (v) => set('rainFlowChance', v),
    setRainFlowForce: (v) => set('rainFlowForce', v),
    setRainFogGrow: (v) => set('rainFogGrow', v),
    setRainFogMax: (v) => set('rainFogMax', v),
    setRainWind: (v) => set('rainWind', v),
    setRainTrail: (v) => set('rainTrail', v),
    setRainRefract: (v) => set('rainRefract', v),
    setRainWet: (v) => set('rainWet', v),
    resetAll: () => {
      userDirtyRef.current = true
      setState(DEFAULTS)
    },
    loadState: (s) => {
      userDirtyRef.current = true
      setState((prev) => mergeEffects(prev, s))
    },
    exportState: () => state,
    syncLocalState: () => {
      try {
        lastWriteTRef.current = Date.now()
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ v: 1, t: lastWriteTRef.current, state }))
      } catch { /* ignore */ }
    },
  }

  return <EffectsContext.Provider value={value}>{children}</EffectsContext.Provider>
}

export const useEffects = () => useContext(EffectsContext)
