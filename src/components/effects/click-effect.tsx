'use client'

import { useEffect, useRef } from 'react'
import { useEffects } from '@/lib/effects-context'

/**
 * 点击特效引擎（canvas 粒子系统）
 * 6 种风格：ring 光波矩阵 / ripple 丝滑水波 / aurora 极光涟漪 / spark 星辰飞溅 / orbit 流光星轨 / bubble 琉璃气泡
 * 3 种颜色：accent 跟随主色 / custom 自定义取色 / random 随机彩色
 * 每风格参数独立存储；默认参数已按「丝滑舒服」调优
 *   size 大小 / count 数量 / amp 幅度 / speed 速度 / dur 时长
 *   width 粗细 / glow 发光 / gravity 重力 / light 明暗透明度
 */

type ClickStyle = 'ring' | 'ripple' | 'aurora' | 'spark' | 'orbit' | 'bubble'
type ClickColor = 'accent' | 'custom' | 'random'

interface Cfg {
  style: ClickStyle
  color: ClickColor
  custom: string
  size: number
  count: number
  amp: number   // 波纹强度/射线长度/爱心大小/泡泡大小
  speed: number // 速度 1-100
  dur: number   // 时长 10-100
  width: number // 线条粗细/粒子大小 1-12
  glow: number  // 发光强度 0-100
  gravity: number // 重力 0-100
  light: number // 明暗/透明度 10-100
}

interface Particle {
  x: number; y: number
  vx: number; vy: number
  life: number; maxLife: number
  size: number
  color: string
  rgb?: RGB                        // 不带透明度的颜色三元组（用于渐变/光晕）
  kind: 'spark' | 'star-dust' | 'shock' | 'spark-core' | 'bubble' | 'bubble-pop' | 'dot'
  seed: number
  rot: number; vrot: number
  tx?: number; ty?: number         // 预留：聚合目标点
  drag?: number                    // 空气阻力（拖尾/破裂粒子）
  grav?: number                    // 重力（烟花/破裂粒子）
  hue?: number                     // 泡泡表面光泽色相
  trail?: { x: number; y: number }[]  // 烟花拖尾历史点
  popped?: boolean                 // 泡泡是否已触发破裂
  hot?: boolean                    // 高光火花（更白更亮，尖端带星芒）
  splitDone?: boolean              // 火花是否已分裂出子火花
}

/* 光波矩阵：点击处隐藏一层矩阵网格（默认完全不可见），
   中心发出圆形光波向外扩散，只有被光波照到的小块才会点亮发光，
   光波过后渐隐消失 —— 矩阵和光单独都不可见，叠加才可见 */
interface GridCell {
  x: number; y: number
  d: number        // 到点击中心的距离
  size: number     // 小块边长
  color: string
}

interface LightWave {
  x: number; y: number
  r: number        // 当前光波半径
  maxR: number     // 最大半径
  band: number     // 照亮带宽度（前缘到后缘）
  speed: number    // 每帧扩散速度
  decay: number    // 光波过后渐隐距离
  cells: GridCell[]
}

/* 极光涟漪：点击处泛起多层彩色极光光晕，色相沿环带流动、
   缓慢旋转扩散，如水面涟漪与极光相遇 —— 细腻梦幻 */
interface Aurora {
  x: number; y: number
  start: number
  dur: number
  maxR: number
  layers: number     // 光晕层数
  amp: number        // 光晕强度
  speedF: number     // 扩散速度系数
  hueBase: number    // 色相起始（随机彩色时流动的基准）
  rgb: RGB           // 主色
}

/* 流光星轨：一圈光点沿螺旋轨道从中心旋转飞出，带柔和拖尾，
   如星轨流光 —— 流畅优雅 */
interface OrbitPoint {
  ang: number        // 起始角
  vrot: number       // 角速度
  targetR: number    // 目标轨道半径
  seed: number
  size: number
  rgb: RGB
  hot: boolean       // 高亮光点（更白更亮）
  trail: { x: number; y: number }[]
}

interface OrbitScene {
  x: number; y: number
  life: number; maxLife: number
  pts: OrbitPoint[]
  maxR: number       // 轨道最大半径
  speedF: number
  rgb: RGB
}

/* 水波纹：经典涟漪——同心圆波纹从点击处向外扩散，
   波峰提亮、波谷收敛，渐隐消失（最初版丝滑水波） */
interface Ripple {
  x: number; y: number      // 点击中心（CSS px）
  start: number             // 开始时间（performance.now）
  dur: number               // 总时长 ms
  maxR: number              // 最大半径（CSS px）
  amp: number               // 波纹强度（环宽/透明度系数）
  light: number             // 明暗调制强度
  waves: number             // 波纹密度（波峰数量）
}

type RGB = [number, number, number]

function hexToRgb(hex: string): RGB {
  let m = hex.replace('#', '').trim()
  if (m.length === 3) m = m.split('').map((c) => c + c).join('')
  const n = parseInt(m, 16)
  if (Number.isNaN(n)) return [139, 124, 255]
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function rgba(c: RGB, a: number): string {
  return `rgba(${c[0]},${c[1]},${c[2]},${Math.max(0, Math.min(1, a))})`
}

function mix(c1: RGB, c2: RGB, t: number): RGB {
  const k = Math.max(0, Math.min(1, t))
  return [c1[0] + (c2[0] - c1[0]) * k, c1[1] + (c2[1] - c1[1]) * k, c1[2] + (c2[2] - c1[2]) * k]
}

/* 缓动曲线：丝滑感的核心 —— 所有运动都经过这里 */
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)
const easeOutQuart = (t: number) => 1 - Math.pow(1 - t, 4)
const easeOutBack = (t: number) => { const c = 1.70158; const u = t - 1; return 1 + (c + 1) * u * u * u + c * u * u }
const smoothstep = (t: number) => { const u = Math.max(0, Math.min(1, t)); return u * u * (3 - 2 * u) }

/* ============================================================
   丝滑水波 v7 —— 纯折射扭曲（无颜色），组件层可开关
   点击处圆形波环向外扩散，波环经过的画面产生径向扭曲。
   默认：背景层 + 每张毛玻璃卡片自身都参与扭曲（组件随水波荡漾）；
   开关关闭时：只扭曲背景层，组件保持清晰。
   关键：不再把 filter 挂到 main 上 —— 祖先 filter 会让 Chrome 里
   后代 backdrop-filter 失效（毛玻璃变透明=“组件消失”）并破坏 fixed 定位。
   改为分别挂在每张卡片自身：元素自身的 filter 与 backdrop-filter
   可以共存（backdrop 采样发生在 filter 之前），毛玻璃全程保持。
   实现：同一个位移贴图（视口坐标）挂到所有参与图层上，每层独立
   filter 实例（区域=各自本地坐标下的视口，保证贴图在屏幕上对齐）。
   1. 位移只落在波环带附近（正弦波 × 指数衰减包络），其余像素为中性值 → 远处内容纹丝不动
   2. 滤镜直接挂在各图层自身 —— 不影响 fixed 定位
   3. 滤镜区域 = 各层本地坐标下的视口 → 每帧只重绘可见部分，长页面也流畅
   ============================================================ */
const RIPPLE_SVG_ID = 'click-ripple-distort-svg'
const RIPPLE_FILTER_ID = 'click-ripple-distort-filter'
const RIPPLE_MAP_ID = 'click-ripple-distort-map'
const RIPPLE_DISP_ID = 'click-ripple-distort-disp'
const RIPPLE_MAP_SIZE = 192
/* 位移贴图：动画开始时生成一张静态涟漪波列图（dataURL，只加载一次），
   之后每帧只改 feImage 的 x/y/width/height（波列扩散）和 scale（强度）——
   纯同步属性动画，无异步空窗、无整体偏移。
   注意：不能用 canvas 元素引用（Chromium 的 feImage 不支持，快照失败），
   也不能每帧换 dataURL（异步加载空窗 → 透明黑 → 全图 -scale/2 位移）。 */
const RIPPLE_MAP_FRONT = 34 // 波前沿在贴图中的半径（px）

/* 当前被滤镜作用的图层（动画期间有效）
   rect 仅在点击瞬间用于设置初始区域；动画每帧用元素当前 rect 重算 */
interface RippleLayer {
  el: HTMLElement
  filter: SVGFilterElement
  map: SVGFEImageElement
  disp: SVGFEDisplacementMapElement
}

/* 一次水波动画 = 一个会话：每图层一个独立滤镜实例 + 独立动画循环。
   叠加模式（clickStack 开）下可同时存在多个会话，互不打断（如两个水波重叠播放）；
   关闭叠加时每次点击先清掉全部旧会话（保持原「新特效打断旧特效」行为）。
   每会话滤镜 key 带会话序号（card-0-s1 / card-0-s2），互不冲突。 */
interface RippleSession {
  id: number
  x: number; y: number
  start: number
  DUR: number
  maxR: number
  maxScale: number
  speedF: number
  waveLen: number
  layers: RippleLayer[]
  raf: number
  done: boolean
}
let rippleSessions: RippleSession[] = []
let rippleSeq = 0
const MAX_RIPPLE_SESSIONS = 4   // 叠加上限：超出踢最旧会话，防滤镜实例爆炸

/* 每元素当前挂载的水波滤镜 url 列表 + 无水波时的原始 filter（叠加时多会话共享同一元素） */
const elRippleTokens = new Map<HTMLElement, string[]>()
const elRippleBase = new Map<HTMLElement, string>()
/* 记录首次挂水波前元素是否已有内联 filter（结束后据此决定恢复内联还是清空） */
const elRippleHadInline = new Map<HTMLElement, boolean>()
const RIPPLE_URL_PREFIX = 'url(#click-ripple-distort-filter-'

/* 去掉字符串里的水波滤镜 url（保留其他 filter，如壁纸 blur 磨砂） */
function stripRippleTokens(f: string): string {
  return f.split(/\s+/).filter((t) => t && t !== 'none' && !t.startsWith(RIPPLE_URL_PREFIX)).join(' ')
}

/* 给元素挂一个水波滤镜 url：首次挂载时记录原始 filter，之后以它为基底重建 */
function attachRippleFilter(el: HTMLElement, token: string) {
  if (!elRippleTokens.has(el)) {
    elRippleTokens.set(el, [])
    elRippleHadInline.set(el, el.style.filter.trim() !== '')
    elRippleBase.set(el, stripRippleTokens(getComputedStyle(el).filter))
  }
  elRippleTokens.get(el)!.push(token)
  rebuildLayerFilter(el)
}

/* 摘除一个水波滤镜 url：全部摘完则清空内联样式，让 CSS 变量规则重新接管。
   注意：不能把挂载瞬间 getComputedStyle 的快照（如 blur(3px)）写回内联——
   那会把 CSS 的 filter: blur(var(--wallpaper-blur)) 永久覆盖成静态值，
   之后「壁纸模糊」等滑块怎么拖都不生效（后台先点壁纸/按钮触发水波后
   调节就失灵，前台先拖后点则看不出问题）。
   仅当挂载前元素本身就有内联 filter 时才恢复它。 */
function detachRippleFilter(el: HTMLElement, token: string) {
  const list = elRippleTokens.get(el)
  if (!list) return
  const i = list.indexOf(token)
  if (i >= 0) list.splice(i, 1)
  if (list.length === 0) {
    elRippleTokens.delete(el)
    const base = elRippleBase.get(el) || ''
    const hadInline = elRippleHadInline.get(el) || false
    elRippleBase.delete(el)
    elRippleHadInline.delete(el)
    el.style.filter = hadInline && base ? base : ''
  } else {
    rebuildLayerFilter(el)
  }
}

function rebuildLayerFilter(el: HTMLElement) {
  const list = elRippleTokens.get(el) || []
  const base = elRippleBase.get(el) || ''
  const parts = [base, ...list].filter(Boolean)
  el.style.filter = parts.length ? parts.join(' ') : ''
}

/* 建一次 SVG 根（内含多个 filter 实例，每图层一个） */
function ensureRippleSvgRoot() {
  if (document.getElementById(RIPPLE_SVG_ID)) return
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('id', RIPPLE_SVG_ID)
  svg.setAttribute('width', '0')
  svg.setAttribute('height', '0')
  svg.style.position = 'absolute'
  svg.style.pointerEvents = 'none'
  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs')
  svg.appendChild(defs)
  document.body.appendChild(svg)
}

/* 为某个图层创建/复用它的 filter 实例（region 由调用方设置） */
function ensureRippleLayerFilter(key: string): RippleLayer['filter'] | null {
  const fid = `${RIPPLE_FILTER_ID}-${key}`
  const mid = `${RIPPLE_MAP_ID}-${key}`
  const did = `${RIPPLE_DISP_ID}-${key}`
  const existing = document.getElementById(fid)
  if (existing) return existing as unknown as SVGFilterElement

  const defs = document.querySelector(`#${RIPPLE_SVG_ID} defs`)
  if (!defs) return null
  const filter = document.createElementNS('http://www.w3.org/2000/svg', 'filter')
  filter.setAttribute('id', fid)
  filter.setAttribute('color-interpolation-filters', 'sRGB')
  /* 关键：必须显式声明 userSpaceOnUse！SVG 默认 filterUnits=objectBoundingBox，
     x/y/width/height 会被解释成「包围盒倍数/百分比」。本实现传入的是视口像素值
     （-rect.left/-rect.top, W, H），在 objectBoundingBox 语义下：
     滚动后卡片 rect.top<0 → filter.y>0 → 滤镜区域起点落在元素下方 → 元素整体
     在滤镜区域外 → 被裁剪 → 「组件消失」（后台外观页滚动后点击水波即复现）。
     设 userSpaceOnUse 后 x/y/width/height 按元素本地坐标（CSS 像素）解释，
     区域 = 视口在元素本地坐标中的位置，任何滚动位置都正确覆盖可见部分。 */
  filter.setAttribute('filterUnits', 'userSpaceOnUse')
  /* 关键：feImage 矩形外的区域在滤镜里是「透明黑」（R=0,G=0），
     feDisplacementMap 会把它当成 -scale/2 的整体位移 —— 这就是
     「方框 + 割裂 + 碎开」的根源（矩形内波纹带外是 128 灰=无位移，
     矩形外却整体错位 -scale/2，边界上硬切出一道方框）。
     修复：先铺一层全屏 128 灰（无位移中性值）垫底，再把波纹贴图
     叠上去 —— 矩形外 = 128 灰 = 无位移，全程无错位、无方框。 */
  const feBg = document.createElementNS('http://www.w3.org/2000/svg', 'feFlood')
  feBg.setAttribute('flood-color', '#808080')
  feBg.setAttribute('result', 'bg')
  const feImg = document.createElementNS('http://www.w3.org/2000/svg', 'feImage')
  feImg.setAttribute('id', mid)
  feImg.setAttribute('result', 'map')
  feImg.setAttribute('preserveAspectRatio', 'none')
  /* 关键：必须显式拉伸贴图铺满滤镜区域。缺了这两行，192×192 贴图
     会按原始尺寸画在滤镜区域左上角，波环跑出视野 —— 之前“看不到特效”的根因 */
  feImg.setAttribute('width', '100%')
  feImg.setAttribute('height', '100%')
  /* href 在动画开始时统一设为静态波列贴图 dataURL（所有图层共享），
     之后只动画 x/y/width/height/scale —— 同步属性动画，无异步空窗。 */
  const feComp = document.createElementNS('http://www.w3.org/2000/svg', 'feComposite')
  feComp.setAttribute('operator', 'over')
  feComp.setAttribute('in', 'map')
  feComp.setAttribute('in2', 'bg')
  feComp.setAttribute('result', 'mapFull')
  const feDisp = document.createElementNS('http://www.w3.org/2000/svg', 'feDisplacementMap')
  feDisp.setAttribute('id', did)
  feDisp.setAttribute('in', 'SourceGraphic')
  feDisp.setAttribute('in2', 'mapFull')
  feDisp.setAttribute('scale', '0')
  feDisp.setAttribute('xChannelSelector', 'R')
  feDisp.setAttribute('yChannelSelector', 'G')
  filter.appendChild(feBg)
  filter.appendChild(feImg)
  filter.appendChild(feComp)
  filter.appendChild(feDisp)
  defs.appendChild(filter)
  return filter
}

/* 收集当前要参与扭曲的图层。默认：背景层（第1层环境光 + 第2层壁纸
   + 字幕/樱花/萤火虫）+ 组件层（affectsContent=true：main 内每张毛玻璃
   卡片自身，整块画面一起荡）。关闭组件扭曲时（affectsContent=false）：
   只扭曲背景层，组件保持清晰。
   组件层不挂 main 而挂每张卡片自身：祖先 filter 会让 Chrome 里后代
   backdrop-filter 失效（半透明玻璃底失去模糊后近乎全透明，玻璃透明度
   调得越低越明显）+ 破坏 fixed 定位；元素自身 filter 则与 backdrop-filter
   共存，毛玻璃保持。跳过隐藏/全透明/视口外的层。 */
function getRippleTargets(affectsContent: boolean): Array<{ el: HTMLElement; key: string }> {
  const out: Array<{ el: HTMLElement; key: string }> = []
  const seen = new Set<HTMLElement>()
  const push = (el: HTMLElement | null, key: string) => {
    if (!el || seen.has(el)) return
    const cs = getComputedStyle(el)
    if (cs.display === 'none' || cs.visibility === 'hidden') return
    if (parseFloat(cs.opacity) < 0.02) return
    const r = el.getBoundingClientRect()
    if (r.width < 4 || r.height < 4) return
    seen.add(el)
    out.push({ el, key })
  }
  if (affectsContent) {
    const vw = window.innerWidth, vh = window.innerHeight
    let n = 0
    for (const el of Array.from(document.querySelectorAll<HTMLElement>('main .glass-card, main .glass-nav, main .glass-badge'))) {
      const r = el.getBoundingClientRect()
      if (r.bottom < 0 || r.top > vh || r.right < 0 || r.left > vw) continue // 视口外不参与
      push(el, `card-${n++}`)
      if (n >= 48) break // 卡片过多时只扭曲前 48 张（性能兜底）
    }
  }
  push(document.querySelector('.ambient-bg'), 'ambient')
  push(document.querySelector('.wallpaper-layer'), 'wallpaper')
  push(document.querySelector('.bg-caption-layer'), 'captions')
  document.querySelectorAll<HTMLElement>('[data-ripple-layer]').forEach((el, i) => {
    push(el, `bgfx-${el.getAttribute('data-ripple-layer') || i}`)
  })
  return out
}

/* 生成静态涟漪波列位移贴图（dataURL，一次生成，动画期间不再变化）。
   波心 = 贴图中心；波列 = 正弦 × 高斯衰减包络，只落在波环带附近。
   R/G 通道 = 径向位移向量（方向由位置决定，大小随波列波动）。
   waveLen 波环间距（波纹密度）· falloff 环带衰减（明暗对比） */
function buildRippleMapUrl(waveLen: number, falloff: number): string {
  const c = document.createElement('canvas')
  c.width = RIPPLE_MAP_SIZE
  c.height = RIPPLE_MAP_SIZE
  const ctx = c.getContext('2d')
  if (!ctx) return ''
  const img = ctx.createImageData(RIPPLE_MAP_SIZE, RIPPLE_MAP_SIZE)
  const data = img.data
  const half = RIPPLE_MAP_SIZE / 2
  const front = RIPPLE_MAP_FRONT
  /* 贴图密环：屏幕波长 waveLen 放大后会拉伸（s = R/34，最大 ~16 倍），
     贴图用 waveLen*0.21 的密环 + 更长的波列（sigma），保证扩散全程
     都有可见波纹环（拉伸后仍多环）。
     参数映射见 startRippleDistort（count→waveLen、light→falloff）。 */
  const k = (2 * Math.PI) / Math.max(2, waveLen * 0.21)
  const sigma = Math.max(10, falloff * 1.6)
  for (let my = 0; my < RIPPLE_MAP_SIZE; my++) {
    for (let mx = 0; mx < RIPPLE_MAP_SIZE; mx++) {
      const dx = mx - half
      const dy = my - half
      const r = Math.sqrt(dx * dx + dy * dy)
      const i = (my * RIPPLE_MAP_SIZE + mx) * 4
      if (r < 2) {
        data[i] = 128; data[i + 1] = 128; data[i + 2] = 128; data[i + 3] = 255
        continue
      }
      const m = Math.sin(k * (r - front)) * Math.exp(-Math.pow((r - front) / sigma, 2))
      data[i] = Math.max(0, Math.min(255, 128 + m * (dx / r) * 127))
      data[i + 1] = Math.max(0, Math.min(255, 128 + m * (dy / r) * 127))
      data[i + 2] = 128
      data[i + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)
  return c.toDataURL()
}

/* 结束单个水波会话：停动画、摘除该会话挂在各图层上的滤镜、清掉 SVG 实例 */
function endRippleSession(s: RippleSession) {
  if (s.done) return
  s.done = true
  cancelAnimationFrame(s.raf)
  for (const l of s.layers) {
    detachRippleFilter(l.el, `url(#${l.filter.id})`)
    l.disp.setAttribute('scale', '0')
    l.filter.remove()   // 从 SVG defs 移除，防止多次叠加后实例泄漏
  }
  const i = rippleSessions.indexOf(s)
  if (i >= 0) rippleSessions.splice(i, 1)
}

/* 结束全部水波会话（关闭叠加 / 组件卸载 / 异常兜底时调用） */
function endAllRipples() {
  for (const s of [...rippleSessions]) endRippleSession(s)
}

/* 点击目标是否位于「交互型 fixed 元素」内部（模态框/移动端导航/控制面板等）。
   是则跳过 DOM 扭曲 —— 避免滤镜把 fixed 元素拉进坐标系导致跳位。
   注意：背景层（ambient/wallpaper/字幕/樱花/萤火虫）虽然也是 fixed，
   但它们就是要被扭曲的图层，点击背景区域应正常触发水波。 */
function isInsideFixed(el: EventTarget | null): boolean {
  let node: Element | null = el instanceof Element ? el : ((el as Node | null)?.parentElement ?? null)
  while (node && node !== document.body) {
    const cls = typeof node.className === 'string' ? node.className : ''
    if (cls.includes('ambient-bg') || cls.includes('wallpaper-layer') || cls.includes('bg-caption-layer') || node.hasAttribute('data-ripple-layer')) {
      return false
    }
    if (getComputedStyle(node).position === 'fixed') return true
    node = node.parentElement
  }
  return false
}

function startRippleDistort(x: number, y: number, cfg: Cfg, affectsContent: boolean, stack: boolean) {
  try {
    ensureRippleSvgRoot()
    /* 叠加开关：关=新点击打断旧水波（原行为）；开=不清旧会话，多个水波重叠播放 */
    if (!stack) {
      endAllRipples()
    } else if (rippleSessions.length >= MAX_RIPPLE_SESSIONS) {
      endRippleSession(rippleSessions[0])   // 超上限：踢最旧会话
    }
    const targets = getRippleTargets(affectsContent)
    if (targets.length === 0) return

    const W = window.innerWidth
    const H = window.innerHeight
    if (W < 4 || H < 4) return

    /* ---- 参数映射（默认 50 时行为与 v4 基线一致）----
       size  波纹范围 → 最大半径
       amp   波纹强度 → 峰值位移
       speed 波纹速度 → 扩散缓动指数（快=波更早推出去）
       dur   特效时长 → 总时长
       count 波纹密度 → 波环间距（大=密）
       light 明暗对比 → 环带锐度（大=更集中锐利） */
    const sizeF = Math.max(0.25, Math.min(2, cfg.size / 50))
    const ampF = Math.max(0.3, Math.min(2, cfg.amp / 50))
    const speedF = Math.max(0.2, Math.min(3, cfg.speed / 50))
    const durF = Math.max(0.4, Math.min(2.5, cfg.dur / 50))
    const waveLen = (38 * 5) / Math.max(2, Math.min(10, cfg.count))  // 波环间距 px
    const falloff = (18 * 50) / Math.max(10, cfg.light)               // 环带衰减 px

    const maxR = Math.min(W, H) * 0.55 * sizeF
    const maxScale = Math.round(48 * ampF) // 峰值位移 px
    const DUR = Math.round(820 * durF)

    /* 静态波列贴图：只生成一次（动画期间不换 href，避免 dataURL 异步空窗） */
    const mapUrl = buildRippleMapUrl(waveLen, falloff)

    /* 本会话：给每个可见图层挂独立滤镜实例（key 带会话序号），
       区域 = 该层本地坐标下的视口，所有层共享同一张视口坐标位移贴图 */
    const session: RippleSession = {
      id: ++rippleSeq, x, y,
      start: performance.now(), DUR, maxR, maxScale, speedF, waveLen,
      layers: [], raf: 0, done: false,
    }
    for (const { el, key } of targets) {
      const fkey = `${key}-s${session.id}`
      const filter = ensureRippleLayerFilter(fkey)
      if (!filter) continue
      const rect = el.getBoundingClientRect()
      filter.setAttribute('x', String(-rect.left))
      filter.setAttribute('y', String(-rect.top))
      filter.setAttribute('width', String(W))
      filter.setAttribute('height', String(H))
      const map = document.getElementById(`${RIPPLE_MAP_ID}-${fkey}`) as unknown as SVGFEImageElement | null
      const disp = document.getElementById(`${RIPPLE_DISP_ID}-${fkey}`) as unknown as SVGFEDisplacementMapElement | null
      if (!map || !disp) continue
      map.setAttribute('href', mapUrl)
      map.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', mapUrl)
      /* 挂滤镜时合并该层原有的 filter（如壁纸 blur 磨砂）——
         直接覆盖会让壁纸磨砂在水波期间消失、结束后又弹回，很膈应 */
      attachRippleFilter(el, `url(#${filter.id})`)
      session.layers.push({ el, filter, map, disp })
    }
    if (session.layers.length === 0) return
    rippleSessions.push(session)

    const step = () => {
      const k = (performance.now() - session.start) / session.DUR
      if (k >= 1) { endRippleSession(session); return }
      const ease = 1 - Math.pow(1 - k, 2.4 * session.speedF)
      const R = Math.max(4, session.maxR * ease)
      /* 强度包络先升后落（负值归零 → 收尾平滑无抖动） */
      const strength = Math.max(0, Math.sin(Math.PI * Math.min(1, k * 1.15)))
      /* 扩散：把贴图放大到波前沿 R（贴图波前沿在 RIPPLE_MAP_FRONT 处）
         x/y/width/height/scale 都是同步属性动画（无异步加载 → 无空窗偏移） */
      const s = R / RIPPLE_MAP_FRONT
      const w = RIPPLE_MAP_SIZE * s
      /* 防撕裂保护：位移(≈scale/2) 不得超过当前屏幕波长/3，
         否则相邻波环反向位移会把画面撕碎（amp 调大、范围调小时
         波长被压短，位移/波长比例失控 → “画面碎开”）。
         scale 上限随扩散同步增长，任意参数组合下都丝滑不碎。 */
      const wavePx = session.waveLen * 0.21 * s
      const scaleSafe = Math.max(2, wavePx / 1.5)
      const scale = Math.max(1, Math.round(Math.min(session.maxScale * strength, scaleSafe)))
      for (const l of session.layers) {
        /* 关键：每帧用元素当前 rect 重算滤镜区域 + 贴图位置。
           滤镜区域 = 硬裁剪区 —— 动画期间滚动会让元素相对视口移动，
           若区域停留在点击瞬间的旧位置，新滚入视口的部分落在区域外
           会被裁剪掉，表现为「特效播放中往下滑，缺失的那一块一直
           不加载，特效结束移除滤镜才恢复」。
           每帧跟随当前 rect：区域始终 = 视口在元素本地坐标中的位置，
           任何滚动位置都完整覆盖可见部分；贴图按点击屏幕坐标重算，
           水波仍停留在点击处。 */
        const rect = l.el.getBoundingClientRect()
        l.filter.setAttribute('x', String(-rect.left))
        l.filter.setAttribute('y', String(-rect.top))
        const cx = session.x - rect.left
        const cy = session.y - rect.top
        l.map.setAttribute('x', String(cx - w / 2))
        l.map.setAttribute('y', String(cy - w / 2))
        l.map.setAttribute('width', String(w))
        l.map.setAttribute('height', String(w))
        l.disp.setAttribute('scale', String(scale))
      }
      session.raf = requestAnimationFrame(step)
    }
    session.raf = requestAnimationFrame(step)
  } catch {
    endAllRipples()
  }
}

export default function ClickEffect() {
  const { clickOn, clickStyle, clickColor, clickCustomColor, clickParams, clickRippleContent, clickStack } = useEffects()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rippleCanvasRef = useRef<HTMLCanvasElement>(null)
  const cfgRef = useRef<Cfg>({ style: clickStyle, color: clickColor, custom: clickCustomColor, ...clickParams[clickStyle] })
  cfgRef.current = { style: clickStyle, color: clickColor, custom: clickCustomColor, ...clickParams[clickStyle] }
  /* 水波是否扭曲组件层（开关实时生效，handleClick 闭包只注册一次，用 ref 读最新值） */
  const rippleContentRef = useRef(clickRippleContent)
  rippleContentRef.current = clickRippleContent
  /* 特效叠加开关（实时生效，同上用 ref 读最新值） */
  const clickStackRef = useRef(clickStack)
  clickStackRef.current = clickStack

  useEffect(() => {
    if (!clickOn) return
    const canvas = canvasRef.current
    const rippleCanvas = rippleCanvasRef.current
    if (!canvas || !rippleCanvas) return
    const ctx = canvas.getContext('2d')
    const rctx = rippleCanvas.getContext('2d')
    if (!ctx || !rctx) return

    const dpr = window.devicePixelRatio || 1
    const resize = () => {
      canvas.width = window.innerWidth * dpr
      canvas.height = window.innerHeight * dpr
      canvas.style.width = `${window.innerWidth}px`
      canvas.style.height = `${window.innerHeight}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      rippleCanvas.width = window.innerWidth * dpr
      rippleCanvas.height = window.innerHeight * dpr
      rippleCanvas.style.width = `${window.innerWidth}px`
      rippleCanvas.style.height = `${window.innerHeight}px`
      rctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    window.addEventListener('resize', resize)

    const particles: Particle[] = []
    const ripples: Ripple[] = []
    const waves: LightWave[] = []
    const auroras: Aurora[] = []
    const orbitScenes: OrbitScene[] = []

    /* 读取当前配色 */
    const readColors = (): [RGB, RGB] => {
      let a = '#8b7cff', b = '#45d4e4'
      try {
        const root = getComputedStyle(document.documentElement)
        a = root.getPropertyValue('--accent').trim() || a
        b = root.getPropertyValue('--accent-2').trim() || b
      } catch { /* ignore */ }
      return [hexToRgb(a), hexToRgb(b)]
    }

    /* 随机彩色（金色调） */
    const randColor = (): string => `hsl(${Math.random() * 360}, 90%, 65%)`

    const spawn = (x: number, y: number) => {
      const cfg = cfgRef.current
      const s = cfg.size / 50                       // 缩放系数（50=默认）
      const speedF = cfg.speed / 50                 // 速度系数（50=默认）
      const durF = cfg.dur / 50                     // 时长系数（50=默认）
      const widthF = cfg.width / 4                  // 粗细系数（默认 4）
      const ampF = cfg.amp / 50                     // 幅度系数（长度/大小）
      const n = Math.max(1, Math.round(cfg.count / 24 * 10)) // 数量归一化
      const [c1, c2] = readColors()
      const base: RGB = cfg.color === 'custom' ? hexToRgb(cfg.custom || '#ff6b9d') : c1

      const col = (t: number, seed: number): string => {
        if (cfg.color === 'random') return randColor()
        if (cfg.color === 'custom') return rgba(base, Math.max(0, Math.min(1, t)))
        return rgba(mix(c1, c2, seed % 1), Math.max(0, Math.min(1, t)))
      }

      /* 颜色三元组（用于渐变/光晕的纯色通道，不带透明度） */
      const rgbOf = (t: number, seed: number): RGB => {
        if (cfg.color === 'random') return [255, 255, 255]
        if (cfg.color === 'custom') return base
        return mix(c1, c2, seed % 1)
      }

      if (cfg.style === 'ring') {
        /* 光波矩阵：点击处生成隐藏矩阵，中心圆形光波向外扩散，
           光波扫过的小块点亮、过后渐隐；两者单独都不可见 */
        const maxR = Math.max(50, 130 * s)                              // 光波最大半径
        const target = 80 + cfg.count * 15                              // 目标矩阵格数
        const step = Math.max(8, maxR / Math.sqrt(target / Math.PI))    // 矩阵间距
        const cell = Math.max(3, 3 + cfg.width * 1.3)                   // 小块边长
        const band = Math.max(8, 26 * ampF)                             // 照亮带宽度
        const cells: GridCell[] = []
        const ox = Math.round(x / step) * step
        const oy = Math.round(y / step) * step
        for (let gx = ox - maxR; gx <= ox + maxR; gx += step) {
          for (let gy = oy - maxR; gy <= oy + maxR; gy += step) {
            const d = Math.hypot(gx - x, gy - y)
            if (d > maxR) continue
            cells.push({
              x: gx, y: gy, d,
              size: cell,
              color: col(1, (gx * 7.31 + gy * 3.17) % 1),
            })
          }
        }
        waves.push({
          x, y, r: 0, maxR, band,
          speed: 1.8 + speedF * 1.6,
          decay: 20 + durF * 12,
          cells,
        })
        /* 中心闪光 */
        particles.push({
          x, y, vx: 0, vy: 0, life: 0, maxLife: Math.max(6, Math.round(16 * durF)),
          size: 5 * s * widthF, color: col(1, 0), kind: 'dot', seed: Math.random() * 100, rot: 0, vrot: 0,
        })
      } else if (cfg.style === 'ripple') {
        /* 丝滑水波：经典涟漪——点击处泛起一圈圈同心圆波纹向外扩散，
           波峰提亮、波谷收敛，渐隐消失 */
        ripples.push({
          x, y,
          start: performance.now(),
          dur: Math.max(420, 1400 * durF),
          maxR: Math.max(90, 175 * s),
          amp: Math.max(0.2, 0.45 * ampF),
          light: 0.9 * (cfg.light / 50),
          waves: Math.max(2, Math.min(8, Math.round(cfg.count * 1.2))),
        })
      } else if (cfg.style === 'aurora') {
        /* 极光涟漪：点击处泛起数层柔和的彩色极光光晕，色相沿环带
           流动、缓慢旋转扩散，如水面涟漪与极光相遇 —— 细腻梦幻 */
        const layers = Math.max(3, Math.min(8, Math.round(cfg.count)))
        const maxR = Math.max(110, 185 * s * (0.75 + 0.45 * ampF))
        const mainRGB: RGB = cfg.color === 'random' ? mix(rgbOf(1, Math.random() * 3), [255, 255, 255], 0.5) : rgbOf(0.5, 0)
        auroras.push({
          x, y,
          start: performance.now(),
          dur: Math.max(520, Math.round(1350 * durF)),
          maxR,
          layers,
          amp: Math.max(0.14, 0.4 * ampF),
          speedF,
          hueBase: Math.random() * 360,
          rgb: mainRGB,
        })
        /* 中心柔光：点击瞬间轻轻一亮 */
        particles.push({
          x, y, vx: 0, vy: 0, life: 0,
          maxLife: Math.max(10, Math.round(22 * durF)),
          size: Math.max(10, 15 * s * widthF * 0.5),
          color: 'rgba(255,255,255,1)', rgb: [255, 255, 255],
          kind: 'dot', seed: Math.random() * 100, rot: 0, vrot: 0,
        })
      } else if (cfg.style === 'spark') {
        /* 星辰飞溅 v2：火花带长拖尾自然坠落 + 星尘闪烁漂浮，
           部分高光火花（更白更亮、尖端带星芒）+ 分裂子火花，
           双冲击环 + 中心闪光 —— 温柔又不失灵动 */
        const total = Math.max(10, Math.round(cfg.count * 0.62))
        for (let i = 0; i < total; i++) {
          const ang = Math.random() * Math.PI * 2
          const sp = (1.2 + Math.pow(Math.random(), 0.8) * 4.6) * s * speedF * 0.8
          const grav = 0.018 + 0.05 * (cfg.gravity / 50)
          const hot = i % 4 === 0
          const rgb: RGB = hot ? [255, 255, 255] : rgbOf(1, Math.random() * 3)
          particles.push({
            x, y,
            vx: Math.cos(ang) * sp,
            vy: Math.sin(ang) * sp - 1.3,
            life: 0, maxLife: Math.round((30 + Math.random() * 24) * durF),
            size: Math.max(0.6, (hot ? 1 : 0.8 + Math.random() * 1.5) * widthF),
            color: rgba(rgb, 1), rgb,
            kind: 'spark', seed: Math.random() * 100, rot: 0, vrot: 0,
            drag: 0.965, grav, hot,
          })
        }
        /* 星尘：更小更慢，无拖尾，呼吸闪烁 */
        for (let i = 0; i < Math.max(6, Math.round(cfg.count * 0.22)); i++) {
          const ang = Math.random() * Math.PI * 2
          const sp = (0.5 + Math.random() * 1.6) * speedF * 0.5
          const rgb = rgbOf(1, Math.random() * 3)
          particles.push({
            x, y,
            vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp - 0.4,
            life: 0, maxLife: Math.round((20 + Math.random() * 16) * durF),
            size: Math.max(0.5, 1 * widthF * (0.6 + Math.random() * 0.7)),
            color: rgba(rgb, 1), rgb,
            kind: 'star-dust', seed: Math.random() * 100, rot: 0, vrot: 0,
            drag: 0.94,
          })
        }
        /* 双冲击环：细亮内环 + 宽淡外晕 */
        const ringRGB = rgbOf(0.5, 0)
        particles.push({
          x, y, vx: 0, vy: 0,
          life: 0, maxLife: Math.max(10, Math.round(16 * durF)),
          size: Math.max(20, 32 * s * widthF * 0.5),
          color: rgba(ringRGB, 1), rgb: ringRGB,
          kind: 'shock', seed: Math.random() * 100, rot: 0, vrot: 0,
        })
        /* 中心闪光 */
        particles.push({
          x, y, vx: 0, vy: 0,
          life: 0, maxLife: Math.max(8, Math.round(14 * durF)),
          size: Math.max(10, 14 * s * widthF * 0.6),
          color: 'rgba(255,255,255,1)', rgb: [255, 255, 255],
          kind: 'spark-core', seed: Math.random() * 100, rot: 0, vrot: 0,
        })
      } else if (cfg.style === 'orbit') {
        /* 流光星轨：一圈光点沿螺旋轨道从中心旋转飞出，带柔和拖尾，
           如星轨流光 —— 流畅优雅 */
        const n = Math.max(8, Math.min(28, Math.round(cfg.count * 0.85)))
        const maxR = Math.max(90, 150 * s * (0.7 + 0.65 * ampF))
        const orbitRGB: RGB = cfg.color === 'random' ? mix(rgbOf(1, Math.random() * 3), [255, 255, 255], 0.45) : rgbOf(0.5, 0)
        const pts: OrbitPoint[] = []
        for (let i = 0; i < n; i++) {
          const hot = i % 4 === 0
          const rgb: RGB = hot ? [255, 255, 255] : (cfg.color === 'random' ? rgbOf(1, Math.random() * 3) : mix(orbitRGB, base, i / n))
          pts.push({
            ang: (i / n) * Math.PI * 2 + Math.random() * 0.35,
            vrot: (0.022 + Math.random() * 0.02) * speedF * 0.55 * (Math.random() < 0.5 ? 1 : -1),
            targetR: maxR * (0.55 + Math.random() * 0.45),
            seed: Math.random() * 100,
            size: Math.max(1.1, (hot ? 2.1 : 1.4) * widthF * 0.75),
            rgb, hot,
            trail: [],
          })
        }
        orbitScenes.push({
          x, y, life: 0,
          maxLife: Math.max(44, Math.round(74 * durF)),
          pts, maxR, speedF,
          rgb: orbitRGB,
        })
        /* 中心柔光：旋转源点轻轻一亮 */
        particles.push({
          x, y, vx: 0, vy: 0, life: 0,
          maxLife: Math.max(12, Math.round(26 * durF)),
          size: Math.max(10, 14 * s * widthF * 0.5),
          color: 'rgba(255,255,255,1)', rgb: [255, 255, 255],
          kind: 'dot', seed: Math.random() * 100, rot: 0, vrot: 0,
        })
      } else if (cfg.style === 'bubble') {
        /* 琉璃气泡 v2：晶莹气泡缓缓上升，主泡 + 小泡分层，
           出生时轻盈弹开，摇摆幅度随上升渐增，表面光泽 + 薄膜彩虹 + 高光 + 反光，
           尽头温柔破裂 */
        const count = Math.max(6, Math.round(cfg.count * 0.8))
        for (let i = 0; i < count; i++) {
          const isMain = i < Math.max(2, Math.round(count * 0.25))
          const r = isMain
            ? Math.max(9, (11 + Math.random() * 6) * s * ampF * 1.1)
            : Math.max(4.5, (4.5 + Math.random() * 4.5) * s * ampF * 0.9)
          const hue = 185 + Math.random() * 150
          const rgb = rgbOf(1, Math.random() * 3)
          particles.push({
            x: x + (Math.random() - 0.5) * 22 * s,
            y: y + (Math.random() - 0.5) * 6,
            vx: (Math.random() - 0.5) * 0.35,
            vy: -(0.45 + Math.random() * 0.65) * speedF * 0.55,
            life: 0, maxLife: Math.round((55 + Math.random() * 30) * durF),
            size: r, color: rgba(rgb, 1), rgb,
            kind: 'bubble', seed: Math.random() * 100, rot: 0, vrot: 0,
            hue,
          })
        }
      }
    }

    const handleClick = (e: MouseEvent) => {
      /* 丝滑水波 v4：纯折射扭曲（无颜色）—— 圆形波环向外扩散，波环区域图层扭曲 */
      if (cfgRef.current.style === 'ripple') {
        /* 点击落在 fixed 元素上（模态框/移动端导航）→ 跳过扭曲，避免组件跳位 */
        if (isInsideFixed(e.target)) return
        /* 后台手机端：main 内有 fixed 底部导航，改用经典涟漪兜底 */
        const adminMobile = window.location.pathname.startsWith('/admin') && window.innerWidth < 1024
        if (!adminMobile) {
          startRippleDistort(e.clientX, e.clientY, cfgRef.current, rippleContentRef.current, clickStackRef.current)
          return
        }
      }
      spawn(e.clientX, e.clientY)
    }
    window.addEventListener('click', handleClick)

    let raf = 0
    const tick = () => {
      raf = requestAnimationFrame(tick)
      const W = window.innerWidth, H = window.innerHeight
      ctx.clearRect(0, 0, W, H)
      ctx.lineCap = 'round'

      const glowF = cfgRef.current.glow / 50
      ctx.globalAlpha = 1
      ctx.shadowBlur = 0

      /* 丝滑水波层：经典涟漪——同心圆环带亮度随正弦波调制，
         向外扩散、渐隐消失（波峰提亮，如水波反光） */
      if (ripples.length > 0) {
        rctx.setTransform(dpr, 0, 0, dpr, 0, 0)
        rctx.clearRect(0, 0, rippleCanvas.width, rippleCanvas.height)
        rctx.globalCompositeOperation = 'lighter'
        for (let i = ripples.length - 1; i >= 0; i--) {
          const rp = ripples[i]
          const now = performance.now()
          const k = (now - rp.start) / rp.dur
          if (k >= 1) { ripples.splice(i, 1); continue }

          /* 后半段平滑渐隐，水面安静下来 */
          const fade = 1 - smoothstep((k - 0.55) / 0.45)
          /* 先快后慢向外扩散 */
          const ease = 1 - Math.pow(1 - k, 2)
          const R = Math.max(4, rp.maxR * ease)
          const ringW = Math.max(3, rp.amp * 22)
          const lightA = rp.light * fade

          /* 波峰环：环带位置随扩散推进，正弦调制亮度 */
          for (let j = 0; j < rp.waves; j++) {
            const t = (j + 0.5) / rp.waves
            const ringR = R * (0.28 + 0.72 * t)
            const wave = Math.sin(t * Math.PI * 2) * 0.5 + 0.5
            const a = wave * lightA
            if (a <= 0.012) continue
            const g = rctx.createRadialGradient(rp.x, rp.y, Math.max(0, ringR - ringW * 0.5), rp.x, rp.y, Math.min(R, ringR + ringW * 0.5))
            g.addColorStop(0, 'rgba(255,255,255,0)')
            g.addColorStop(0.5, `rgba(255,255,255,${Math.min(1, a)})`)
            g.addColorStop(1, 'rgba(255,255,255,0)')
            rctx.strokeStyle = g
            rctx.lineWidth = Math.max(1.2, ringW * wave)
            rctx.beginPath()
            rctx.arc(rp.x, rp.y, ringR, 0, Math.PI * 2)
            rctx.stroke()
          }

          /* 中心光晕：点击瞬间轻轻一亮，随即散开 */
          const coreA = lightA * 0.35 * (1 - k)
          if (coreA > 0.02) {
            const cr = Math.max(2, R * 0.28)
            const g2 = rctx.createRadialGradient(rp.x, rp.y, 0, rp.x, rp.y, cr)
            g2.addColorStop(0, `rgba(255,255,255,${Math.min(1, coreA)})`)
            g2.addColorStop(1, 'rgba(255,255,255,0)')
            rctx.fillStyle = g2
            rctx.beginPath()
            rctx.arc(rp.x, rp.y, cr, 0, Math.PI * 2)
            rctx.fill()
          }
        }
        rctx.globalCompositeOperation = 'source-over'
      } else {
        rctx.setTransform(dpr, 0, 0, dpr, 0, 0)
        rctx.clearRect(0, 0, rippleCanvas.width, rippleCanvas.height)
      }
      ctx.globalAlpha = 1
      ctx.shadowBlur = 0

      /* 粒子 */
      const lightK = cfgRef.current.light / 50
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]
        p.life++
        if (p.life < 0) continue                    // 延迟出现的粒子（错峰星闪）
        const lifeT = p.life / p.maxLife
        if (lifeT >= 1) { particles.splice(i, 1); continue }

        if (p.kind === 'spark') {
          /* 星辰火花 v2：长拖尾渐隐渐细 + 白芯头部 + 双频呼吸，
             部分火花中段分裂出子火花，高光火花尖端带星芒 */
          const dr = p.drag || 0.965
          p.vx *= dr
          p.vy = p.vy * dr + (p.grav || 0)
          p.x += p.vx
          p.y += p.vy
          if (!p.trail) p.trail = []
          p.trail.push({ x: p.x, y: p.y })
          if (p.trail.length > 9) p.trail.shift()
          const a = (1 - lifeT) * 0.9 * lightK * (0.7 + 0.3 * Math.sin(p.seed + p.life * 0.45))
          const rgb = p.rgb || [255, 255, 255]
          /* 分裂：飞行中段约 1/3 概率崩出 2 颗子火花（更小更亮、短命） */
          if (!p.splitDone && lifeT > 0.5 && p.seed % 3 < 1) {
            p.splitDone = true
            for (let j = 0; j < 2; j++) {
              const pa = Math.atan2(p.vy, p.vx) + (Math.random() - 0.5) * 1.2
              const psp = (0.9 + Math.random() * 1.1) * Math.hypot(p.vx, p.vy) * 0.6
              particles.push({
                x: p.x, y: p.y,
                vx: Math.cos(pa) * psp, vy: Math.sin(pa) * psp,
                life: 0, maxLife: Math.max(10, Math.round(p.maxLife * 0.5)),
                size: Math.max(0.4, p.size * 0.55),
                color: 'rgba(255,255,255,1)', rgb: [255, 255, 255],
                kind: 'spark', seed: Math.random() * 100, rot: 0, vrot: 0,
                drag: 0.94, grav: (p.grav || 0) * 1.2,
                splitDone: true, hot: true,
              })
            }
          }
          /* 拖尾：由旧到新渐亮渐粗，末段染白（高温感） */
          if (p.trail.length > 1) {
            for (let j = 1; j < p.trail.length; j++) {
              const t0 = p.trail[j - 1], t1 = p.trail[j]
              const f = j / p.trail.length
              ctx.beginPath()
              ctx.moveTo(t0.x, t0.y)
              ctx.lineTo(t1.x, t1.y)
              ctx.strokeStyle = j > p.trail.length - 3 ? rgba([255, 255, 255], Math.max(0, a * f * 0.8)) : rgba(rgb, Math.max(0, a * f * 0.65))
              ctx.globalAlpha = 1
              ctx.lineWidth = Math.max(0.3, p.size * f * 0.9)
              ctx.stroke()
            }
            /* 贝塞尔光带：沿拖尾路径的柔和白色光晕，让拖尾更丝滑 */
            if (p.trail.length > 2 && a > 0.05) {
              ctx.beginPath()
              ctx.moveTo(p.trail[0].x, p.trail[0].y)
              for (let j = 1; j < p.trail.length - 1; j++) {
                const mx = (p.trail[j].x + p.trail[j + 1].x) / 2
                const my = (p.trail[j].y + p.trail[j + 1].y) / 2
                ctx.quadraticCurveTo(p.trail[j].x, p.trail[j].y, mx, my)
              }
              ctx.lineTo(p.trail[p.trail.length - 1].x, p.trail[p.trail.length - 1].y)
              ctx.strokeStyle = rgba([255, 255, 255], a * 0.16)
              ctx.lineWidth = Math.max(1, p.size * 2.4)
              ctx.stroke()
            }
          }
          /* 头部：白芯 + 色晕双层 */
          const hr = Math.max(0.5, p.size * (1 - lifeT * 0.35))
          ctx.beginPath()
          ctx.arc(p.x, p.y, hr, 0, Math.PI * 2)
          ctx.fillStyle = rgba([255, 255, 255], Math.max(0, a))
          ctx.shadowColor = p.color
          ctx.shadowBlur = 10 * glowF
          ctx.fill()
          ctx.shadowBlur = 0
          ctx.beginPath()
          ctx.arc(p.x, p.y, hr * 1.9, 0, Math.PI * 2)
          ctx.fillStyle = rgba(rgb, Math.max(0, a * 0.22))
          ctx.fill()
          /* 高光火花：尖端十字星芒，模拟高速火星的余光 */
          if (p.hot && a > 0.08 && hr >= 0.7) {
            const sr = hr * (2.2 + 0.6 * Math.sin(p.seed + p.life * 0.5))
            ctx.strokeStyle = rgba([255, 255, 255], a * 0.5)
            ctx.lineWidth = Math.max(0.4, hr * 0.28)
            ctx.beginPath()
            ctx.moveTo(p.x - sr, p.y); ctx.lineTo(p.x + sr, p.y)
            ctx.moveTo(p.x, p.y - sr); ctx.lineTo(p.x, p.y + sr)
            ctx.stroke()
          }
        } else if (p.kind === 'star-dust') {
          /* 星尘：微小光点，缓慢漂移 + 柔和呼吸 */
          const dr = p.drag || 0.94
          p.vx *= dr
          p.vy = p.vy * dr
          p.x += p.vx
          p.y += p.vy
          const tw = 0.5 + 0.5 * Math.sin(p.seed + p.life * 0.3)
          const a = (1 - lifeT) * 0.8 * tw * lightK
          if (a <= 0.02) continue
          ctx.beginPath()
          ctx.arc(p.x, p.y, Math.max(0.4, p.size * (1 - lifeT * 0.4)), 0, Math.PI * 2)
          ctx.fillStyle = p.color
          ctx.globalAlpha = Math.min(1, a)
          ctx.shadowColor = p.color
          ctx.shadowBlur = 4 * glowF
          ctx.fill()
        } else if (p.kind === 'shock') {
          /* 双冲击环：细亮内环 + 宽淡外晕，扩散渐隐 */
          const k = lifeT
          const r = p.size * (0.3 + easeOutCubic(k) * 2.2)
          const a = (1 - k) * 0.5 * lightK
          ctx.beginPath()
          ctx.arc(p.x, p.y, r, 0, Math.PI * 2)
          ctx.strokeStyle = p.color
          ctx.globalAlpha = Math.max(0, a)
          ctx.lineWidth = Math.max(0.5, 1.6 * (1 - k))
          ctx.shadowColor = p.color
          ctx.shadowBlur = 8 * glowF
          ctx.stroke()
          ctx.shadowBlur = 0
          /* 外晕环 */
          ctx.beginPath()
          ctx.arc(p.x, p.y, r * 1.35, 0, Math.PI * 2)
          ctx.strokeStyle = p.color
          ctx.globalAlpha = Math.max(0, a * 0.22)
          ctx.lineWidth = Math.max(0.8, 4 * (1 - k))
          ctx.stroke()
        } else if (p.kind === 'spark-core') {
          /* 中心闪光：短促白核 */
          const k = lifeT
          const a = (1 - k) * 0.9
          const r = p.size * (1.1 - k * 0.5)
          const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 2.2)
          g.addColorStop(0, rgba([255, 255, 255], a))
          g.addColorStop(0.5, rgba([255, 255, 255], a * 0.35))
          g.addColorStop(1, rgba([255, 255, 255], 0))
          ctx.fillStyle = g
          ctx.globalAlpha = 1
          ctx.fillRect(p.x - r * 2.2, p.y - r * 2.2, r * 4.4, r * 4.4)
        } else if (p.kind === 'bubble') {
          /* 琉璃气泡：出生轻盈弹开，上升摇摆渐增，光泽 + 高光 + 反光，
             尽头先轻微压扁再温柔破裂 */
          const born = Math.min(1, p.life / 14)
          const bornScale = easeOutBack(born)
          p.x += p.vx + Math.sin(p.seed + p.life * 0.04) * (0.35 + p.life * 0.006)
          p.y += p.vy
          const wob = 1 + 0.05 * Math.sin(p.seed + p.life * 0.08)
          const r = p.size * bornScale * wob
          const a = (1 - lifeT) * 0.92 * lightK * Math.min(1, born * 1.6)
          const hue = p.hue || 200
          const popping = lifeT > 0.82
          const squash = popping ? 1 - ((lifeT - 0.82) / 0.1) * 0.25 : 1   // 破裂前轻微压扁
          if (popping && !p.popped) {
            p.popped = true
            /* 破裂：散出 5 个小光点 */
            for (let j = 0; j < 5; j++) {
              const pa = Math.random() * Math.PI * 2
              particles.push({
                x: p.x, y: p.y,
                vx: Math.cos(pa) * (0.5 + Math.random() * 1.3),
                vy: Math.sin(pa) * (0.5 + Math.random() * 1.3) - 0.4,
                life: 0, maxLife: Math.round(9 + Math.random() * 7),
                size: Math.max(0.7, p.size * 0.2 * (0.6 + Math.random())),
                color: 'rgba(255,255,255,1)', rgb: [255, 255, 255],
                kind: 'bubble-pop', seed: Math.random() * 100, rot: 0, vrot: 0,
                drag: 0.9, grav: 0.01,
              })
            }
          }
          ctx.save()
          ctx.translate(p.x, p.y)
          ctx.scale(1, Math.max(0.55, squash))
          /* 内部光泽：径向渐变（左上偏亮） */
          const g = ctx.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.1, 0, 0, r)
          g.addColorStop(0, `hsla(${hue}, 75%, 94%, ${a * 0.3})`)
          g.addColorStop(0.7, `hsla(${hue}, 80%, 80%, ${a * 0.12})`)
          g.addColorStop(1, `hsla(${hue}, 95%, 70%, ${a * 0.38})`)
          ctx.beginPath()
          ctx.arc(0, 0, r, 0, Math.PI * 2)
          ctx.fillStyle = g
          ctx.globalAlpha = 1
          ctx.fill()
          /* 外圈细描边 + 发光 */
          ctx.beginPath()
          ctx.arc(0, 0, r, 0, Math.PI * 2)
          ctx.strokeStyle = `hsla(${hue}, 85%, 88%, ${a * 0.65})`
          ctx.globalAlpha = 1
          ctx.lineWidth = Math.max(1, r * 0.1)
          ctx.shadowColor = p.color
          ctx.shadowBlur = 12 * glowF
          ctx.stroke()
          /* 薄膜彩虹弧：边缘一圈彩虹细弧，模拟肥皂泡干涉色（琉璃感） */
          ctx.shadowBlur = 0
          if (a > 0.05 && r > 6) {
            const irColors = ['hsl(0,90%,80%)', 'hsl(42,95%,76%)', 'hsl(85,95%,74%)', 'hsl(150,90%,76%)', 'hsl(210,95%,80%)', 'hsl(275,95%,80%)', 'hsl(330,90%,78%)']
            const irArc = Math.PI * 0.85
            const irStart = -Math.PI * 0.95
            const irW = Math.max(0.8, r * 0.07)
            for (let j = 0; j < irColors.length; j++) {
              const a0 = irStart + (j / irColors.length) * irArc
              const a1 = irStart + ((j + 1) / irColors.length) * irArc
              ctx.beginPath()
              ctx.arc(0, 0, r * 0.96, a0, a1)
              ctx.strokeStyle = irColors[j]
              ctx.globalAlpha = a * 0.3
              ctx.lineWidth = irW
              ctx.stroke()
            }
            /* 左下方对称的一小段彩虹，增强立体感 */
            const irStart2 = Math.PI * 0.35
            for (let j = 0; j < irColors.length; j++) {
              const a0 = irStart2 + (j / irColors.length) * irArc * 0.55
              const a1 = irStart2 + ((j + 1) / irColors.length) * irArc * 0.55
              ctx.beginPath()
              ctx.arc(0, 0, r * 0.96, a0, a1)
              ctx.strokeStyle = irColors[(j + 4) % irColors.length]
              ctx.globalAlpha = a * 0.2
              ctx.lineWidth = irW * 0.85
              ctx.stroke()
            }
          }
          ctx.globalAlpha = 1
          /* 高光弧（左上） */
          ctx.beginPath()
          ctx.arc(0, 0, r * 0.82, -Math.PI * 0.85, -Math.PI * 0.35)
          ctx.strokeStyle = `rgba(255,255,255,${a * 0.85})`
          ctx.lineWidth = Math.max(0.9, r * 0.12)
          ctx.stroke()
          /* 高光点 */
          ctx.beginPath()
          ctx.arc(-r * 0.42, -r * 0.45, Math.max(0.8, r * 0.16), 0, Math.PI * 2)
          ctx.fillStyle = `rgba(255,255,255,${a})`
          ctx.fill()
          /* 底部反光弧 */
          ctx.beginPath()
          ctx.arc(0, 0, r * 0.6, Math.PI * 0.15, Math.PI * 0.85)
          ctx.strokeStyle = `hsla(${hue}, 90%, 72%, ${a * 0.5})`
          ctx.lineWidth = Math.max(0.8, r * 0.1)
          ctx.stroke()
          ctx.restore()
          /* 破裂扩散环 */
          if (popping) {
            const k = (lifeT - 0.82) / 0.18
            ctx.beginPath()
            ctx.arc(p.x, p.y, r * (1 + k * 1.1), 0, Math.PI * 2)
            ctx.strokeStyle = `rgba(255,255,255,${a * (1 - k)})`
            ctx.lineWidth = Math.max(0.5, r * 0.16 * (1 - k))
            ctx.stroke()
          }
        } else if (p.kind === 'bubble-pop') {
          /* 泡泡破裂水珠：白芯 + 色晕双层，短促飞散渐隐 */
          const dr = p.drag || 0.9
          p.vx *= dr
          p.vy = p.vy * dr + (p.grav || 0)
          p.x += p.vx
          p.y += p.vy
          const a = (1 - lifeT) * 0.9
          const hr = Math.max(0.4, p.size * (1 - lifeT * 0.5))
          ctx.beginPath()
          ctx.arc(p.x, p.y, hr, 0, Math.PI * 2)
          ctx.fillStyle = 'rgba(255,255,255,1)'
          ctx.globalAlpha = Math.max(0, a)
          ctx.shadowColor = p.color
          ctx.shadowBlur = 6 * glowF
          ctx.fill()
          ctx.shadowBlur = 0
          ctx.beginPath()
          ctx.arc(p.x, p.y, hr * 1.8, 0, Math.PI * 2)
          ctx.fillStyle = rgba(p.rgb || [180, 220, 255], Math.max(0, a * 0.3))
          ctx.fill()
        } else {
          /* dot：中心闪光（光波矩阵用），原地呼吸闪烁的多层光晕 */
          const tw = 0.6 + 0.4 * Math.sin(p.seed + p.life * 0.35)
          const a = (1 - lifeT) * tw * lightK
          if (a <= 0.02) continue
          const r = p.size * (1 + 0.25 * Math.sin(p.seed + p.life * 0.3))
          const rgb = p.rgb || [255, 255, 255]
          const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 2.4)
          g.addColorStop(0, rgba([255, 255, 255], a))
          g.addColorStop(0.4, rgba(rgb, a * 0.45))
          g.addColorStop(1, rgba(rgb, 0))
          ctx.fillStyle = g
          ctx.globalAlpha = 1
          ctx.fillRect(p.x - r * 2.4, p.y - r * 2.4, r * 4.8, r * 4.8)
        }
      }
      ctx.globalAlpha = 1
      ctx.shadowBlur = 0

      /* 光波矩阵：圆形光波向外扩散，点亮扫过的矩阵小块 */
      for (let i = waves.length - 1; i >= 0; i--) {
        const w = waves[i]
        w.r += w.speed
        const front = w.r        // 光波前缘
        const back = w.r - w.band // 光波后缘
        /* 光波环：前缘亮环 + 内部淡光（光本身半透明） */
        if (front <= w.maxR + w.band) {
          ctx.beginPath()
          ctx.arc(w.x, w.y, front, 0, Math.PI * 2)
          ctx.strokeStyle = 'rgba(255,255,255,0.6)'
          ctx.globalAlpha = 0.3 + 0.3 * (front / w.maxR)
          ctx.lineWidth = Math.max(1.5, w.band * 0.2)
          ctx.shadowColor = 'rgba(255,255,255,0.9)'
          ctx.shadowBlur = 12 * glowF
          ctx.stroke()
          ctx.shadowBlur = 0
        }
        /* 矩阵小块：默认不可见，只有被光波照到的才点亮 */
        for (const c of w.cells) {
          let t = 0
          if (c.d >= back && c.d <= front) t = 1                    // 正在被照亮
          else if (c.d < back) t = Math.max(0, 1 - (back - c.d) / w.decay) // 光波过后渐隐
          if (t <= 0.02) continue
          const grow = 1 + 0.3 * Math.max(0, 1 - (front - c.d) / (w.band * 2))
          const sz = c.size * grow
          ctx.fillStyle = c.color
          ctx.globalAlpha = t * lightK
          ctx.shadowColor = c.color
          ctx.shadowBlur = 10 * glowF * t
          ctx.fillRect(c.x - sz / 2, c.y - sz / 2, sz, sz)
        }
        /* 光波结束后整体移除（此时全部小块已衰减完） */
        if (front > w.maxR + w.band + w.decay + 30) { waves.splice(i, 1); continue }
        ctx.globalAlpha = 1
        ctx.shadowBlur = 0
      }

      /* 极光涟漪：多层彩色光晕环带向外扩散，色相沿环带流动，
         先升后降的呼吸渐隐 —— 细腻梦幻 */
      for (let i = auroras.length - 1; i >= 0; i--) {
        const a = auroras[i]
        const k = (performance.now() - a.start) / a.dur
        if (k >= 1) { auroras.splice(i, 1); continue }
        const ease = 1 - Math.pow(1 - k, 2.2 * a.speedF)
        const R = a.maxR * ease
        const fade = Math.sin(Math.PI * Math.min(1, k * 1.12))
        const alpha = fade * a.amp * lightK
        if (alpha <= 0.012) continue
        const widthF2 = Math.max(0.4, Math.min(3, cfgRef.current.width / 6))
        const [c1, c2] = readColors()
        for (let li = 0; li < a.layers; li++) {
          const t = (li + 0.5) / a.layers
          const ringR = R * (0.3 + 0.7 * t)
          const ringW = Math.max(2.5, 30 * (1 - t * 0.55) * widthF2)
          const la = alpha * (1 - t * 0.4) * (0.72 + 0.28 * Math.sin(a.hueBase + li * 1.9 + k * 7))
          if (la <= 0.012) continue
          let col: string
          if (cfgRef.current.color === 'random') {
            const hue = (a.hueBase + t * 130 + k * 150) % 360
            col = `hsla(${hue}, 92%, 70%, ${la})`
          } else if (cfgRef.current.color === 'custom') {
            col = rgba(a.rgb, la)
          } else {
            col = rgba(mix(c1, c2, (t + k * 0.12) % 1), la)
          }
          ctx.beginPath()
          ctx.arc(a.x, a.y, ringR, 0, Math.PI * 2)
          ctx.strokeStyle = col
          ctx.lineWidth = ringW
          ctx.globalAlpha = 1
          ctx.shadowColor = col
          ctx.shadowBlur = 16 * glowF
          ctx.stroke()
        }
        ctx.shadowBlur = 0
      }

      /* 流光星轨：光点沿螺旋轨道旋转飞出，拖尾形成旋转光带，
         如星轨流光 —— 流畅优雅 */
      for (let i = orbitScenes.length - 1; i >= 0; i--) {
        const o = orbitScenes[i]
        o.life++
        const lifeT = o.life / o.maxLife
        if (lifeT >= 1) { orbitScenes.splice(i, 1); continue }
        const fade = Math.sin(Math.PI * Math.min(1, lifeT * 1.08))
        const a = fade * lightK
        if (a <= 0.02) continue
        const rotF = easeOutCubic(Math.min(1, lifeT * 1.25))
        const growF = easeOutCubic(Math.min(1, lifeT * 1.1))
        for (const pt of o.pts) {
          const ang = pt.ang + pt.vrot * o.life * rotF * 0.9
          const rad = pt.targetR * growF
          const px = o.x + Math.cos(ang) * rad
          const py = o.y + Math.sin(ang) * rad
          pt.trail.push({ x: px, y: py })
          if (pt.trail.length > 7) pt.trail.shift()
          /* 拖尾：由旧到新渐亮渐细，形成旋转光带 */
          if (pt.trail.length > 1) {
            for (let j = 1; j < pt.trail.length; j++) {
              const f = j / pt.trail.length
              const t0 = pt.trail[j - 1], t1 = pt.trail[j]
              ctx.beginPath()
              ctx.moveTo(t0.x, t0.y)
              ctx.lineTo(t1.x, t1.y)
              ctx.strokeStyle = rgba(pt.rgb, a * f * (pt.hot ? 0.85 : 0.5))
              ctx.globalAlpha = 1
              ctx.lineWidth = Math.max(0.3, pt.size * f * 0.8)
              ctx.stroke()
            }
          }
          /* 头部光点：白芯 + 色晕 */
          const hr = pt.size * (1 - lifeT * 0.3)
          ctx.beginPath()
          ctx.arc(px, py, hr, 0, Math.PI * 2)
          ctx.fillStyle = pt.hot ? rgba([255, 255, 255], a) : rgba(pt.rgb, a)
          ctx.shadowColor = rgba(pt.rgb, 0.9)
          ctx.shadowBlur = 8 * glowF
          ctx.fill()
          ctx.shadowBlur = 0
          /* 高亮点：小十字星芒 */
          if (pt.hot && a > 0.1) {
            const sr = hr * (2 + 0.5 * Math.sin(pt.seed + o.life * 0.4))
            ctx.strokeStyle = rgba([255, 255, 255], a * 0.5)
            ctx.lineWidth = Math.max(0.3, hr * 0.25)
            ctx.beginPath()
            ctx.moveTo(px - sr, py); ctx.lineTo(px + sr, py)
            ctx.moveTo(px, py - sr); ctx.lineTo(px, py + sr)
            ctx.stroke()
          }
        }
      }
    }
    tick()

    return () => {
      window.removeEventListener('resize', resize)
      window.removeEventListener('click', handleClick)
      cancelAnimationFrame(raf)
      endAllRipples()
    }
  }, [clickOn])

  if (!clickOn) return null
  return (
    <>
      {/* 水波层：压在壁纸/光晕之上、内容之下，只影响背景不挡文字 */}
      <canvas ref={rippleCanvasRef} className="fixed inset-0 pointer-events-none z-[-1]" />
      {/* 粒子层：内容之上 */}
      <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-[99]" />
    </>
  )
}
