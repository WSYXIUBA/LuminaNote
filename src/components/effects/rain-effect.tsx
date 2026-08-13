'use client'

import { useEffect, useRef } from 'react'
import { useEffects } from '@/lib/effects-context'

/**
 * 雨幕特效（第 2 层 · 背景雨）—— 自清洁玻璃模型
 *
 * 用户需求模型（每个环节都可调）：
 * 0. 玻璃开局干净：没有预置水渍，所有水滴都由雨丝打屏产生（概率可调）
 * 1. 雨幕本身纯透明：canvas 只画内容物（雨丝/水滴/雾），无整层底色
 * 2. 背景雨（雨丝）：细线滑落，密度/速度/大小/风力/拖尾可调
 * 3. 打屏：每根雨丝划过屏幕时按「打屏概率」落到玻璃上 → 生成水滴
 * 4. 水滴状态机：
 *    - falling  刚打上，还在滑落（减速至停）
 *    - stuck    粘在玻璃上，吸收雨量长大；出生时按「流动概率」决定是否会动
 *    - flowing  沿随机蜿蜒轨迹流下
 * 5. 合并：stuck 水滴相遇 → 面积守恒融合成大雨滴
 * 6. 强制流动：水滴大到「强制阈值」→ 无论是否会动，强制流下
 * 7. 吞并：流下的水碰到沿途水滴 → 吸收合并继续变大
 * 8. 折射畸变：水滴内部 = 放大背景（凸透镜），强度可调，影响图层 1/2
 * 9. 水蒸气（雾）：默认没有，按「生成速度」随时间累积到「最大浓度」阈值；
 *    水流过的地方雾被冲刷消失变透明（destination-out 擦除）
 */
interface RainStreak {
  x: number
  y: number
  len: number
  vy: number
  alpha: number
  w: number
  tilt: number // 风致倾斜角
  hitChecked: boolean // 是否已做过"打屏"判定（每根雨丝划过屏幕判定一次）
}

interface StreamSeg {
  x: number
  w: number // 半宽
}

type DropState = 'falling' | 'stuck' | 'flowing'

interface GlassDrop {
  x: number
  y: number
  r: number
  seed: number
  wobN: number // 轮廓起伏频率
  wobA: number // 轮廓起伏幅度
  wobP: number // 相位
  rot: number // 精灵旋转
  twin: boolean // 伴生小滴（融合形）
  born: number // 出生时间（淡入动画）
  state: DropState
  vy: number // falling 下落速度
  willFlow: boolean // 是否会自发流动（出生时按流动概率决定）
  flowSpeed: number
  flowPhase: number
  path: StreamSeg[] // 水流历史（索引 0 = 头部）
  step: number // 已流步数
  pulse: number // 吸收水滴后的加宽脉冲（帧数）
  drift: number // 流动时恒定的小侧向速度（受重力压制，很小）
  fading: boolean // 水流离开屏幕后残留变干中
  life: number // 残留寿命（帧数）
  age: number // stuck 存活帧数（老化滑落用，防止水滴堆满玻璃）
  maxLen: number // 本次流动的最大行程（到点停住 → 断续水痕）
  trailLife: number // 停住后水痕残留寿命（帧），0 = 无残留
}

/* 解析 CSS linear-gradient 字符串 → 角度 + 色标 */
function parseLinearGradient(img: string): { angle: number; stops: { c: string; p: number }[] } | null {
  const m = img.match(/linear-gradient\(\s*([^,]+),\s*(.*)\)\s*$/)
  if (!m) return null
  const angM = m[1].match(/(-?[\d.]+)deg/)
  const angle = angM ? parseFloat(angM[1]) : -45
  const stops: { c: string; p: number }[] = []
  const re = /(rgba?\([^)]*\)|hsla?\([^)]*\)|#[0-9a-fA-F]{3,8}|transparent)\s+([\d.]+)%/g
  let mm: RegExpExecArray | null
  while ((mm = re.exec(m[2])) !== null) {
    stops.push({ c: mm[1], p: Math.min(1, Math.max(0, parseFloat(mm[2]) / 100)) })
  }
  if (stops.length === 0) return null
  return { angle, stops }
}

/* 把第 1/2 层背景（环境光 + 壁纸）画进离屏画布，作为水滴的"透镜内容" */
function buildBgSnapshot(
  bg: HTMLCanvasElement,
  b: CanvasRenderingContext2D,
  dpr: number,
  W: number,
  H: number,
): void {
  b.setTransform(dpr, 0, 0, dpr, 0, 0)
  b.clearRect(0, 0, W, H)
  const cs = getComputedStyle(document.documentElement)
  const mode = document.documentElement.dataset.bgMode || 'gradient'

  /* 1. 底色 */
  const base = cs.getPropertyValue('--bg-base').trim() || '#0d1020'
  const ambient = document.querySelector('.ambient-bg')
  const ambientOp = ambient ? parseFloat(getComputedStyle(ambient).opacity || '1') : 1
  b.save()
  b.globalAlpha = ambientOp
  b.fillStyle = base
  b.fillRect(0, 0, W, H)
  b.restore()

  /* 2. 流动渐变（还原角度 / 尺寸 / 位置） */
  const gradEl = document.querySelector('.ambient-gradient')
  if (gradEl && getComputedStyle(gradEl).display !== 'none') {
    const gcs = getComputedStyle(gradEl)
    const parsed = parseLinearGradient(gcs.backgroundImage)
    if (parsed) {
      const diag = Math.hypot(W, H)
      const sizeF = parseFloat((gcs.backgroundSize || '400%').split(' ')[0]) / 100 || 4
      const posPct = parseFloat((gcs.backgroundPosition || '50%').split(' ')[0]) / 100 || 0.5
      const rad = (parsed.angle * Math.PI) / 180
      const dirx = Math.sin(rad)
      const diry = -Math.cos(rad)
      const cx = W / 2
      const cy = H / 2
      const L = diag * sizeF
      let sx = cx - dirx * (L / 2)
      let sy = cy - diry * (L / 2)
      const offset = -(L - diag) * posPct
      sx -= dirx * offset
      sy -= diry * offset
      const g = b.createLinearGradient(sx, sy, sx + dirx * L, sy + diry * L)
      for (const st of parsed.stops) g.addColorStop(st.p, st.c)
      b.save()
      b.globalAlpha = ambientOp * (parseFloat(gcs.opacity || '1') || 1)
      b.fillStyle = g
      b.fillRect(0, 0, W, H)
      b.restore()
    }
  }

  /* 3. 大模糊光晕圆（还原动画 transform / 模糊 / 颜色） */
  for (const sel of ['.glow-1', '.glow-2']) {
    const el = document.querySelector(sel)
    if (!el || getComputedStyle(el).display === 'none') continue
    const ecs = getComputedStyle(el)
    const w = parseFloat(ecs.width) || 0
    const h = parseFloat(ecs.height) || 0
    if (w <= 0 || h <= 0) continue
    const left = parseFloat(ecs.left) || 0
    const top = parseFloat(ecs.top) || 0
    let a = 1, bb = 0, cc = 0, dd = 1, ee = 0, ff = 0
    const tm = ecs.transform
    if (tm && tm !== 'none') {
      const parts = tm.match(/matrix\(([^)]+)\)/)
      if (parts) {
        const v = parts[1].split(',').map((s) => parseFloat(s))
        ;[a, bb, cc, dd, ee, ff] = v
      }
    }
    const blur = parseFloat((ecs.filter.match(/blur\(([\d.]+)px\)/) || [])[1] || '100')
    const color = ecs.backgroundColor || 'rgba(128,128,170,0.2)'
    const op = (parseFloat(ecs.opacity || '1') || 1) * ambientOp
    b.save()
    b.translate(left + w / 2, top + h / 2)
    b.transform(a, bb, cc, dd, ee, ff)
    b.translate(-w / 2, -h / 2)
    b.globalAlpha = op
    b.filter = `blur(${blur}px)`
    b.fillStyle = color
    b.fillRect(0, 0, w, h)
    b.restore()
    b.filter = 'none'
  }

  /* 4. 壁纸（壁纸模式）：背景图 + 透明度 + 模糊 + 对比纱幕 */
  const wl = document.getElementById('wallpaper-bg')
  if (wl && mode === 'wallpaper') {
    const wcs = getComputedStyle(wl)
    const op = parseFloat(wcs.opacity || '0')
    const blur = parseFloat((wcs.filter.match(/blur\(([\d.]+)px\)/) || [])[1] || '0')
    const m = (wcs.backgroundImage || '').match(/url\(["']?([^"')]+)["']?\)/)
    const scrim = getComputedStyle(wl, '::before').backgroundColor
    if (m && op > 0.01) {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        b.save()
        b.globalAlpha = op
        if (blur > 0.5) b.filter = `blur(${blur}px)`
        const ir = img.width / img.height
        const wr = W / H
        let dw = W, dh = H
        if (ir > wr) { dh = H; dw = H * ir } else { dw = W; dh = W / ir }
        b.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh)
        b.restore()
        b.filter = 'none'
        if (scrim && scrim !== 'rgba(0, 0, 0, 0)') {
          b.fillStyle = scrim
          b.fillRect(0, 0, W, H)
        }
      }
      img.onerror = () => {}
      img.src = m[1]
    }
  }
}

/* 静止水滴轮廓：上尖下圆泪滴形 —— 重力把水拉向下端（下端圆鼓），
   上端水膜薄收成尖顶（表面张力）。真实玻璃上的水珠就是这样：
   小水珠接近正圆，越大尖顶越明显；wobble 只留极轻微质感（无锯齿）。 */
function traceDrop(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  wobN: number,
  wobA: number,
  wobP: number,
  squash: number,
) {
  const n = 26
  ctx.beginPath()
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2
    /* 光滑为主：wobble 缩到 1/4，只留极轻微质感，不产生花瓣/锯齿 */
    const w = 1 + wobA * 0.28 * (0.62 * Math.sin(wobN * a + wobP) + 0.38 * Math.sin(wobN * 2.3 * a + wobP * 3.1))
    /* 上端收尖：顶部（-90°）半径缩到 ~0.55r（水膜薄），下端（+90°）圆鼓保持 ~1r */
    const topF = 1 - 0.45 * Math.pow(Math.max(0, -Math.sin(a)), 2.0)
    const px = x + Math.cos(a) * r * topF * w
    const py = y + Math.sin(a) * r * topF * w * squash
    if (i === 0) ctx.moveTo(px, py)
    else ctx.lineTo(px, py)
  }
  ctx.closePath()
}

/* 滑落水滴轮廓：蝌蚪形 —— 圆头朝下（前进方向，水团聚集处）、
   上端拖一条逐渐变细的水膜尾巴。真实玻璃上正在滑落的水滴就是这样：
   底部是圆润鼓起的球冠，顶部是细尾（不是上圆下尖的“泪滴”）。
   尾巴随 wobP 晃动、长度脉动；每滴有固定偏侧 lean（惯性残留）。 */
function traceSlideDrop(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  wobP: number,
  wobA: number,
  lean: number,
) {
  /* 圆头：圆心偏下，半径接近 r（大头）—— 真实玻璃水滴是“大头短尾” */
  const hy = r * 0.45
  const hr = r * 0.9
  /* 尾巴：短但可辨（大头短尾更真实，小滴几乎没尾），随时间脉动 */
  const tailLen = r * (0.45 + 0.35 * Math.min(1, r / 4)) * (1 + 0.18 * Math.sin(wobP * 0.8))
  /* 尾巴尖横向晃动 + 二次微颤 */
  const wob = Math.sin(wobP) * wobA * r * 0.55
  const wob2 = Math.sin(wobP * 1.4 + 1.3) * wobA * r * 0.22
  const l = lean * r
  const tipX = x + wob + l
  const tipY = y - tailLen + wob2
  const cx = x + l * 0.35
  ctx.beginPath()
  ctx.moveTo(cx - hr, y + hy)
  /* 圆头下半圆（左 → 底部 → 右） */
  ctx.arc(cx, y + hy, hr, Math.PI, 0, false)
  /* 右侧向上收细到尾巴尖（先微鼓再收——水滴尾部有“颈”） */
  ctx.bezierCurveTo(
    cx + hr * 0.8, y + hy - hr * 0.5,
    cx + hr * 0.4 + wob * 0.5, y + hy - hr * 0.92,
    tipX, tipY,
  )
  /* 尾巴尖回左侧 */
  ctx.bezierCurveTo(
    cx - hr * 0.4 + wob * 0.5, y + hy - hr * 0.92,
    cx - hr * 0.8, y + hy - hr * 0.5,
    cx - hr, y + hy,
  )
  ctx.closePath()
}

/* ============================================================
   水滴渲染：纯折射透镜 —— 水 = 折射率变化，不画任何"颜色"
   - 水滴内部 = 放大背景（凸透镜），这是水滴唯一的"本体"
   - 边缘 = 极淡菲涅尔边（物理真实的透镜边缘暗环，很淡）
   - 顶部 = 极淡反光弧（水-空气界面的物理反光，很淡，用于定位）
   没有白色水膜 / 高光点 / caustic 亮弧 —— 水滴不发亮、不发黑，只是透镜。
   refractF：折射强度 0-1
   shape: 'round'（粘住的球冠）| 'slide'（正在滑落的蝌蚪形：圆头朝下 + 上端细尾）
   ============================================================ */
function drawDrop(
  ctx: CanvasRenderingContext2D,
  d: GlassDrop,
  fadeIn: number,
  bgLayer: HTMLCanvasElement | null,
  dpr: number,
  refractF: number,
  stretchY = 1,
  isTwin = false,
  shape: 'round' | 'slide' = 'round',
) {
  const r = d.r
  if (r < 0.55) return
  /* 椭圆度随机：粘住的水滴受表面张力略扁；滑落的水滴由蝌蚪形自带纵向长度，
     只轻微拉长（stretchY 对 slide 只生效一半，避免变成超长怪形） */
  const elVar = 0.94 + 0.12 * ((d.seed % 10) / 10)
  /* 滑落中的水滴会呼吸（表面张力与重力动态平衡），形状持续微变 */
  const breathe = shape === 'slide' ? 1 + 0.06 * Math.sin(performance.now() * 0.005 + d.seed * 5) : 1
  const stretchEff = shape === 'slide' ? 1 + (stretchY - 1) * 0.55 : stretchY
  /* 静止水滴：重力让球冠轻微变扁（接近圆，小水珠几乎正圆）；滑落水滴由蝌蚪形自带纵向长度 */
  const squash = (1 - 0.1 * Math.min(1, r / 8)) * stretchEff * elVar * breathe
  /* 小滴淡出（真实玻璃上细小雨点几乎看不清） */
  const sizeA = Math.max(0.6, Math.min(1, (r - 1.1) / 2.8))
  const oa = fadeIn * sizeA

  /* 融合对：先画伴生小滴（两滴正在融合） */
  if (d.twin && !isTwin && r >= 3.4) {
    const tR = r * (0.42 + (d.seed % 37) / 150)
    const tA = (d.seed * 2.399) % (Math.PI * 2)
    const twin: GlassDrop = { ...d, x: d.x + Math.cos(tA) * r * 0.8, y: d.y + Math.sin(tA) * r * 0.7, r: tR, twin: false, wobP: d.wobP + 1.7 }
    drawDrop(ctx, twin, fadeIn, bgLayer, dpr, refractF, 1, true, 'round')
  }

  ctx.save()
  ctx.translate(d.x, d.y)
  if (shape === 'round') ctx.rotate(d.rot)
  ctx.scale(1, squash)
  /* 滑落水滴的摆动相位：每滴不同（seed），随时间持续变化；
     lean：每滴固定的偏侧方向（真实水滴的惯性残留，轻微不对称） */
  const wobP = performance.now() * 0.003 + d.seed * 7
  const wobA = 0.1 + (d.seed % 5) * 0.045
  const lean = ((d.seed % 7) / 3 - 1) * 0.18 // -0.18 ~ +0.18
  const trace = (c: CanvasRenderingContext2D) => {
    if (shape === 'slide') traceSlideDrop(c, 0, 0, r, wobP, wobA, lean)
    else traceDrop(c, 0, 0, r, d.wobN, d.wobA, d.wobP, 1)
  }

  /* 透镜折射（水珠内部 = 放大背景）—— 水滴唯一的"本体"。
     真实凸透镜：中心放大 + 边缘折光更强 + 底部柱面把图像下拉。
     做法：整体放大 1.35x，采样区整体下移并带每滴固定横向偏移（折射方向），
     内部纹理明显比外部"大而歪" —— 这就是可感知的折射畸变。 */
  if (bgLayer && r >= 2.2 && refractF > 0.01) {
    trace(ctx)
    ctx.clip()
    const mag = 1 + 1.35 * refractF
    const R = r + 1
    const srcR = (R / mag) * dpr
    /* 柱面透镜：把背后图像下拉（重力感）+ 每滴固定横向偏移（水滴形状不对称 → 折射方向固定） */
    const shiftY = r * 0.22 * dpr
    const shiftX = lean * r * 0.5 * dpr
    ctx.drawImage(
      bgLayer,
      d.x * dpr - srcR - shiftX, d.y * dpr - srcR - shiftY, srcR * 2, srcR * 2,
      -R, -R, R * 2, R * 2,
    )
    /* 极淡体散射（物理：水膜散射环境光，水珠内部比周围略亮——不是贴图高光） */
    const g = ctx.createRadialGradient(0, -r * 0.2, r * 0.1, 0, 0, r * 1.05)
    g.addColorStop(0, `rgba(255,255,255,${0.09 * oa})`)
    g.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = g
    ctx.fill()
  }

  /* 极淡菲涅尔边：透镜边缘的暗环（物理真实——水滴边缘光线全反射，
     形成一圈微暗轮廓，这是"水珠感"的关键，但克制不贴图） */
  if (r >= 1.8 && oa > 0.06) {
    ctx.strokeStyle = `rgba(14,28,52,${0.16 * oa})`
    ctx.lineWidth = Math.max(0.5, r * 0.06)
    trace(ctx)
    ctx.stroke()
  }

  /* 极淡顶部反光弧：水-空气界面的物理反光，用于定位水滴。
     round：弧在上端圆鼓区（尖顶下方）；slide：弧在圆头前缘（下方鼓出处上方） */
  if (r >= 2.0 && oa > 0.06) {
    const glowY = shape === 'slide' ? r * 0.12 : -r * 0.32
    const glowR = shape === 'slide' ? r * 0.52 : r * 0.55
    ctx.strokeStyle = `rgba(255,255,255,${0.14 * oa})`
    ctx.lineWidth = Math.max(0.7, r * 0.1)
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.arc(0, glowY, glowR, Math.PI * 1.1, Math.PI * 1.6)
    ctx.stroke()
  }
  ctx.restore()
}

/* ============================================================
   水流渲染（流下的水）：纯折射透镜 + 极淡水膜
   - 水流本体几乎不可见（真实玻璃上的水流 = 擦掉雾的透明通道 +
     极淡的水膜折射），只是"雾被擦掉"的载体
   - 头部：蝌蚪形水滴（正在滑落，圆头朝下 + 上端细尾）
   关键：水流不产生白色拖尾 —— 拖尾感来自"水痕"，而水痕 = 雾被
   擦掉的区域 + 雾慢慢重新凝结（见 tick 中的 fogRecover）
   ============================================================ */
function drawStream(
  ctx: CanvasRenderingContext2D,
  d: GlassDrop,
  fadeIn: number,
  bgLayer: HTMLCanvasElement | null,
  dpr: number,
  refractF: number,
  trailFade = 1,
  headStretch = 1.3,
) {
  const stepY = 2.5
  const n = d.path.length
  if (n < 3) {
    drawDrop(ctx, d, fadeIn, bgLayer, dpr, refractF, 1.15, false, 'slide')
    return
  }
  const pts: { x: number; y: number; w: number }[] = []
  const tNow = performance.now()
  for (let i = 0; i < n; i++) {
    const y = d.y - i * stepY
    if (y < -14) break
    const seg = d.path[i]
    /* 平滑渐细 + 不规则粗细起伏（伪随机）+ 时间脉动（活水：粗细随帧变化） */
    const t = i / Math.max(1, n)
    const swell = (1 + 0.3 * Math.sin(d.seed * 12.9898 + i * 0.53) * Math.cos(d.seed * 78.233 + i * 0.21))
      * (1 + 0.22 * Math.sin(tNow * 0.004 + i * 0.42 + d.seed * 3.1))
    pts.push({ x: seg.x, y, w: Math.max(0.5, seg.w * (1 - t * 0.45) * Math.max(0.62, swell)) })
  }
  if (pts.length < 3) {
    drawDrop(ctx, d, fadeIn, bgLayer, dpr, refractF, 1.15, false, 'slide')
    return
  }
  const tf = Math.max(0, trailFade) * fadeIn

  /* 水流视觉 = 头部粗、向下渐细渐淡的水膜（真实玻璃水流从圆头拖出，
     越往下越薄，最终消失）—— 不是从头到尾等宽的细条 */
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  const segN = Math.min(26, pts.length)
  for (let i = 0; i < segN; i++) {
    const t = i / segN
    /* 水流本体 = 极淡水膜折射：几乎不可见（用户要求：水不是颜色，只是折射率变化） */
    const a = (1 - t) * (1 - t) * 0.022 * tf
    if (a < 0.003) break
    ctx.strokeStyle = `rgba(235,244,255,${a})`
    ctx.lineWidth = Math.max(0.4, pts[i].w * (1 - t * 0.55))
    ctx.beginPath()
    ctx.moveTo(pts[i].x, pts[i].y)
    const j = Math.min(i + 2, pts.length - 1)
    ctx.lineTo(pts[j].x, pts[j].y)
    ctx.stroke()
  }

  /* 头部水滴：蝌蚪形（正在滑落，圆头朝下 + 上端细尾）
     拉伸带脉冲：水流量大时头部胀大拉长、流量小时回缩 —— 形状持续变化 */
  if (!d.fading) {
    const headPulse = 1 + 0.14 * Math.sin(tNow * 0.006 + d.seed * 2.7)
    drawDrop(ctx, d, fadeIn, bgLayer, dpr, refractF, headStretch * headPulse, false, 'slide')
  }
}

export default function RainEffect() {
  const {
    rainOn, rainDensity, rainSpeed, rainAmount, rainSize,
    rainHitChance, rainFlowChance, rainFlowForce,
    rainFogGrow, rainFogMax, rainWind, rainTrail, rainRefract, rainWet,
  } = useEffects()
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!rainOn) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = Math.min(1.75, window.devicePixelRatio || 1)
    let W = 0
    let H = 0

    /* 背景快照（水滴的透镜内容），每 ~2.5s 重建以跟随渐变动画 */
    let bgLayer: HTMLCanvasElement | null = null
    let lastBg = 0
    const rebuildBg = () => {
      if (!bgLayer) {
        bgLayer = document.createElement('canvas')
        bgLayer.width = canvas.width
        bgLayer.height = canvas.height
      }
      const b = bgLayer.getContext('2d')
      if (b) buildBgSnapshot(bgLayer, b, dpr, W, H)
    }

    const resize = () => {
      W = window.innerWidth
      H = window.innerHeight
      canvas.width = Math.max(1, Math.round(W * dpr))
      canvas.height = Math.max(1, Math.round(H * dpr))
      canvas.style.width = `${W}px`
      canvas.style.height = `${H}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      bgLayer = null
      lastBg = 0
    }
    resize()

    /* 雾层（水蒸气）：1/2 分辨率，可被水流冲刷擦除，擦除后慢慢重新凝结 */
    let fogCv: HTMLCanvasElement | null = null
    let fogCtx: CanvasRenderingContext2D | null = null
    let fogW = 0
    let fogH = 0
    let fogBase = 0 // 均匀水汽累计量（0~1）
    let fogBlobs: { x: number; y: number; r: number; a: number }[] = []
    /* 被水流擦掉的雾 → 记录路径，随时间重新凝结（水痕流干） */
    const fogRecover: { pts: { x: number; y: number }[]; born: number; life: number; w: number }[] = []
    const ensureFog = () => {
      fogW = Math.max(2, Math.ceil(W / 2))
      fogH = Math.max(2, Math.ceil(H / 2))
      if (!fogCv) {
        fogCv = document.createElement('canvas')
        fogCtx = fogCv.getContext('2d')
      }
      fogCv.width = fogW
      fogCv.height = fogH
      if (fogCtx) fogCtx.clearRect(0, 0, fogW, fogH)
      fogBase = 0
      fogBlobs = []
    }
    ensureFog()

    /* 湿痕层（流过痕迹）：水流过的地方留下水膜。
       水膜 = 背景放大采样（透过水看背景微微放大 → 折射畸变）+ 极淡白膜提亮；
       每帧整体缓慢蒸发 → 水痕慢慢变干消散（消散速度受 rainWet 控制）。 */
    let wetCv: HTMLCanvasElement | null = null
    let wetCtx: CanvasRenderingContext2D | null = null
    const ensureWet = () => {
      if (!wetCv) {
        wetCv = document.createElement('canvas')
        wetCtx = wetCv.getContext('2d')
      }
      wetCv.width = canvas.width
      wetCv.height = canvas.height
      if (wetCtx) {
        wetCtx.setTransform(dpr, 0, 0, dpr, 0, 0)
        wetCtx.clearRect(0, 0, W, H)
      }
    }
    ensureWet()

    window.addEventListener('resize', () => {
      resize()
      ensureFog()
      ensureWet()
    })

    /* 雨丝精灵：柔和光柱（横向软边 + 头部亮尾），预渲染一次 */
    const streakSprite = document.createElement('canvas')
    streakSprite.width = 32
    streakSprite.height = 128
    {
      const sc = streakSprite.getContext('2d')
      if (sc) {
        const hg = sc.createLinearGradient(0, 0, 32, 0)
        hg.addColorStop(0, 'rgba(255,255,255,0)')
        hg.addColorStop(0.5, 'rgba(255,255,255,1)')
        hg.addColorStop(1, 'rgba(255,255,255,0)')
        sc.fillStyle = hg
        sc.fillRect(0, 0, 32, 128)
        sc.globalCompositeOperation = 'source-in'
        const vg = sc.createLinearGradient(0, 0, 0, 128)
        vg.addColorStop(0, 'rgba(255,255,255,0)')
        vg.addColorStop(0.4, 'rgba(255,255,255,0.68)')
        vg.addColorStop(1, 'rgba(255,255,255,1)')
        sc.fillStyle = vg
        sc.fillRect(0, 0, 32, 128)
        sc.globalCompositeOperation = 'source-over'
      }
    }

    /* 参数换算（50 = 默认） */
    const densityF = rainDensity / 50
    const speedF = rainSpeed / 50
    const amountF = rainAmount / 50
    const sizeF = rainSize / 50
    const windF = rainWind / 50
    const trailF = rainTrail / 50
    const hitF = rainHitChance / 100
    const flowF = rainFlowChance / 100
    const forceF = rainFlowForce / 100
    const fogGrowF = rainFogGrow / 100
    const fogMaxF = rainFogMax / 100
    const refractF = rainRefract / 100
    const wetF = rainWet / 100

    /* ---------- 雨丝（背景雨） ---------- */
    const streakCount = Math.round(Math.min(150, Math.max(16, (W / 15) * densityF)))
    const streaks: RainStreak[] = []
    const makeStreak = (anywhere: boolean): RainStreak => ({
      x: Math.random() * W,
      y: anywhere ? Math.random() * H : -Math.random() * 80 - 20,
      len: 50 + Math.random() * 55,
      vy: (12 + Math.random() * 15) * speedF,
      /* 雨丝清晰可见（背景雨，但太淡会像屏幕灰尘） */
      alpha: 0.24 + Math.random() * 0.14,
      w: 1.8 + Math.random() * 1.0,
      tilt: (Math.random() - 0.5) * 0.18 * Math.max(0.3, windF),
      hitChecked: false,
    })
    for (let i = 0; i < streakCount; i++) streaks.push(makeStreak(true))

    /* ---------- 玻璃水滴 ---------- */
    const maxDrops = Math.round(Math.min(80, Math.max(16, (W / 26) * densityF * (0.5 + 0.6 * hitF))))
    const drops: GlassDrop[] = []

    const makeDrop = (opts: { x: number; y: number; r: number; willFlow: boolean; state: DropState; vy?: number }): GlassDrop => {
      const { x, y, r, willFlow, state, vy = 0 } = opts
      return {
        x, y, r,
        seed: Math.random() * 100,
        wobN: 4 + Math.floor(Math.random() * 4),
        wobA: 0.05 + Math.random() * 0.08,
        wobP: Math.random() * Math.PI * 2,
        rot: Math.random() * 0.4 - 0.2,
        twin: r >= 3.4 && Math.random() < 0.2,
        born: performance.now(),
        state,
        vy,
        willFlow,
        flowSpeed: 0,
        flowPhase: Math.random() * Math.PI * 2,
        path: [],
        step: 0,
        pulse: 0,
        drift: (Math.random() - 0.5) * 0.3,
        fading: false,
        life: 0,
        age: 0,
        maxLen: (180 + r * 14) * (0.6 + Math.random() * 1.3),
        trailLife: 0,
      }
    }

    /* 汇流：新开始流动的水滴，若附近已有水流则并入它（真实玻璃上水滴会汇入已有水流，
       形成少数几条"主水流"，而不是到处都开新水痕） */
    const tryJoinStream = (d: GlassDrop): boolean => {
      for (const o of drops) {
        if (o === d || o.state !== 'flowing' || o.fading) continue
        if (Math.abs(o.x - d.x) < 15 && o.y < d.y) {
          o.r = Math.min(15, Math.sqrt(o.r * o.r + d.r * d.r * 0.8))
          o.pulse = 14
          o.flowSpeed = Math.min(3.6 * speedF, o.flowSpeed + 0.02)
          return true
        }
      }
      return false
    }

    /* 强制流动阈值（半径）：0 = 关闭强制 */
    const forceThreshold = forceF <= 0 ? Infinity : (2.6 + 6.6 * forceF) * sizeF

    /* 玻璃开局是干净的：没有任何预置水渍。
       所有水滴只来自"雨丝打屏"（概率 = 打屏概率），打上后才长大/流动/合并。 */

    const stepY = 2.5

    /* 打屏速率限制：玻璃从干净开始，水滴一颗颗"被打上"（过程可见） */
    const spawnRate = (0.8 + hitF * 8) * (0.5 + 0.5 * densityF) // 每秒最多生成数
    let nextSpawnAt = performance.now() + 250

    /* 打屏水花：雨点落上玻璃的瞬间小涟漪，让"水渍是怎么来的"一目了然 */
    const impacts: { x: number; y: number; t0: number }[] = []

    /* 新水滴打上玻璃（雨丝打屏 → falling） */
    const spawnFromRain = (x: number, y: number) => {
      const nowT = performance.now()
      if (nowT < nextSpawnAt) return
      nextSpawnAt = nowT + (1000 / Math.max(1, spawnRate)) * (0.6 + Math.random() * 0.8)
      if (drops.length >= maxDrops) return
      impacts.push({ x, y, t0: nowT })
      const r = sizeF * (3.2 + Math.pow(Math.random(), 1.3) * 9.0)
      drops.push(makeDrop({
        x: Math.max(2, Math.min(W - 2, x)),
        y: Math.max(2, Math.min(H - 2, y)),
        r,
        willFlow: Math.random() < flowF * 0.55,
        state: 'falling',
        vy: 0.5 + Math.random() * 0.45,
      }))
    }

    let raf = 0

    const tick = (now: number) => {
      /* 背景快照重建（跟得上流动渐变），供透镜使用 */
      if (!bgLayer || now - lastBg > 2500) {
        rebuildBg()
        lastBg = now
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, W, H)

      /* ========== 雾层更新（水蒸气） ==========
         生成：fogGrow>0 时缓慢累积（均匀水汽 + 随机雾斑），上限 fogMax
         消散：缓慢蒸发（destination-out）+ 水流冲刷（flowing 滴擦除） */
      if (fogCtx && fogCv) {
        /* 蒸发（fogGrow=0 时雾逐渐消失 → 默认无雾） */
        fogCtx.globalCompositeOperation = 'destination-out'
        fogCtx.fillStyle = 'rgba(0,0,0,0.0009)'
        fogCtx.fillRect(0, 0, fogW, fogH)
        fogCtx.globalCompositeOperation = 'source-over'
        /* 生成 */
        if (fogGrowF > 0) {
          const baseTarget = fogMaxF * 0.45
          if (fogBase < baseTarget) {
            const inc = Math.min(fogGrowF * 0.0012, baseTarget - fogBase)
            fogBase += inc
            fogCtx.fillStyle = `rgba(236,243,252,${inc})`
            fogCtx.fillRect(0, 0, fogW, fogH)
          }
          const blobMax = Math.round(fogMaxF * 50)
          if (fogBlobs.length < blobMax && Math.random() < fogGrowF * 0.045) {
            const b = {
              x: Math.random() * fogW,
              y: Math.random() * fogH * 0.9,
              r: 30 + Math.random() * 170,
              a: 0.16 + Math.random() * 0.08,
            }
            fogBlobs.push(b)
            const g = fogCtx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r)
            g.addColorStop(0, `rgba(240,246,255,${b.a})`)
            g.addColorStop(1, 'rgba(240,246,255,0)')
            fogCtx.fillStyle = g
            fogCtx.beginPath()
            fogCtx.arc(b.x, b.y, b.r, 0, Math.PI * 2)
            fogCtx.fill()
          }
        }
        /* 恢复：被水流擦掉的雾慢慢重新凝结（= 水痕流干的过程）。
           先慢后快（p^2 缓动），恢复到接近原来的雾浓度，之后继续被全局蒸发带走 */
        for (let i = fogRecover.length - 1; i >= 0; i--) {
          const rc = fogRecover[i]
          const p = (now - rc.born) / rc.life
          if (p >= 1) { fogRecover.splice(i, 1); continue }
          const a = p * p * (0.16 + 0.30 * fogMaxF) * fogGrowF
          if (a <= 0.004) continue
          fogCtx.globalCompositeOperation = 'source-over'
          fogCtx.strokeStyle = `rgba(236,243,252,${Math.min(0.4, a)})`
          fogCtx.lineWidth = rc.w
          fogCtx.lineCap = 'round'
          fogCtx.beginPath()
          fogCtx.moveTo(rc.pts[0].x, rc.pts[0].y)
          for (let k = 1; k < rc.pts.length; k++) fogCtx.lineTo(rc.pts[k].x, rc.pts[k].y)
          fogCtx.stroke()
        }
      }

      /* ========== 湿痕蒸发（水痕变干消散） ==========
         水流留下的水膜每帧缓慢变淡，最终完全消失。
         消散速度 = (2 - wetF) 系数：wetF 越高（水痕留存拉满）消散越慢。 */
      if (wetCtx && wetCv) {
        wetCtx.globalCompositeOperation = 'destination-out'
        wetCtx.fillStyle = `rgba(0,0,0,${0.0042 * (2 - wetF)})`
        wetCtx.fillRect(0, 0, W, H)
        wetCtx.globalCompositeOperation = 'source-over'
      }

      /* 1. 雨丝：细、淡、长；划过屏幕时按打屏概率落到玻璃上 */
      for (const s of streaks) {
        s.y += s.vy
        s.x += Math.sin(s.y * 0.018) * 0.14 * windF + (Math.random() - 0.5) * 0.05 * windF
        /* 打屏判定：雨丝进入屏幕中部区域后判定一次 */
        if (!s.hitChecked && s.y > H * 0.12 && s.y < H * 0.6) {
          s.hitChecked = true
          if (Math.random() < hitF) {
            spawnFromRain(s.x, s.y)
          }
        }
        if (s.y - s.len > H) Object.assign(s, makeStreak(false))
        /* 光晕层（宽而淡）+ 核心层（细而亮），带风致倾斜 */
        const tail = s.len * (0.4 + 1.2 * trailF)
        ctx.save()
        ctx.translate(s.x, s.y)
        ctx.rotate(s.tilt)
        ctx.globalAlpha = s.alpha * 0.3
        ctx.drawImage(streakSprite, -s.w * 1.1, -tail, s.w * 2.2, tail)
        ctx.globalAlpha = s.alpha
        ctx.drawImage(streakSprite, -s.w / 2, -tail, s.w, tail)
        ctx.restore()
        ctx.globalAlpha = 1
      }

      /* 1.5 打屏涟漪：雨点落上玻璃瞬间的小水花 */
      for (let i = impacts.length - 1; i >= 0; i--) {
        const im = impacts[i]
        const age = now - im.t0
        if (age > 420) { impacts.splice(i, 1); continue }
        const k = age / 420
        ctx.strokeStyle = `rgba(222,234,250,${0.22 * (1 - k)})`
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.ellipse(im.x, im.y, 2 + k * 7, 1 + k * 3.2, 0, 0, Math.PI * 2)
        ctx.stroke()
      }

      /* 2. 水滴物理：打屏下落 / 粘住长大 / 自发流动 / 强制流动 / 吞并 */
      for (let i = 0; i < drops.length; i++) {
        const d = drops[i]

        if (d.state === 'falling') {
          /* 刚打上玻璃，还在滑落：慢速下滑（让蝌蚪形可辨），减速至停 → 粘住 */
          d.y += d.vy
          d.vy *= 0.98
          d.x += Math.sin(now * 0.004 + d.seed * 7) * 0.25 * windF
          if (d.vy < 0.08) {
            d.state = 'stuck'
            d.born = now
            /* 落定后与附近水滴融合（打上的水融入已有水） */
            for (let j = drops.length - 1; j >= 0; j--) {
              const o = drops[j]
              if (o === d || o.state !== 'stuck') continue
              if (Math.hypot(d.x - o.x, d.y - o.y) < d.r + o.r) {
                if (d.r >= o.r) {
                  d.r = Math.min(15, Math.sqrt(d.r * d.r + o.r * o.r))
                  drops.splice(j, 1)
                }
                break
              }
            }
          }
          continue
        }

        if (d.state === 'flowing') {
          /* 残留变干中的水流：路径冻结，不再更新（湿痕静止、缓慢变干） */
          if (d.fading) continue
          /* 真实水流：重力主导向下 + 小幅平滑噪波侧摆。
             横向用低频正弦组合（每滴相位/频率不同），幅度远小于下落速度
             （横向 ≈ 纵向的 15-25%），产生自然的 S 弯但绝不歪七八扭偏离主方向。 */
          const sway = (Math.sin(now * 0.0021 + d.seed * 11) * 1.15 + Math.sin(now * 0.0043 + d.seed * 29) * 0.55) * windF
          d.x += sway * 0.42 + d.drift * 0.12
          d.flowSpeed = Math.min(3.4 * speedF, d.flowSpeed + 0.0015 * speedF)
          d.y += d.flowSpeed
          d.step++
          const wF = 0.55 + 0.25 * Math.sin(d.seed * 13)
          const segW = Math.max(0.6, d.r * wF * (d.pulse > 0 ? 1.5 : 1))
          d.path.unshift({ x: d.x + (Math.random() - 0.5) * 0.5, w: segW })
          if (d.pulse > 0) d.pulse--
          const maxSegs = Math.ceil((140 + d.r * 12) / stepY)
          if (d.path.length > maxSegs) d.path.length = maxSegs

          /* 到行程终点：停住（真实玻璃上水流常在半途停住，水积成珠，留下断续水痕） */
          if (d.step * stepY >= d.maxLen && d.y < H - 20) {
            d.state = 'stuck'
            d.trailLife = 260
            continue
          }

          /* 冲刷雾：只擦除水滴实际经过的地方（水流路径本身）。
             关键：
             1. 雾层是半分辨率，lineWidth 必须换算成雾层坐标（×0.5）；
             2. 擦除宽度随路径**渐细**（真实水流头部粗、尾部细），分段绘制；
             3. alpha 克制（保留薄雾），水痕是"雾变薄"的柔和过渡，
                不是擦出深色硬条纹（背景暗时全擦会露深色，很假）。 */
          if (fogCtx && fogCv && d.path.length > 1) {
            const lim = Math.min(d.path.length, 180)
            const w0 = d.path[0].w * 0.5 // 头部宽度 → 雾层坐标
            const segs = 6
            for (let s = 0; s < segs; s++) {
              const st = Math.floor((lim * s) / segs)
              const en = Math.min(lim - 1, Math.floor((lim * (s + 1)) / segs))
              if (en <= st) break
              const t = s / (segs - 1) // 0 = 头部 → 1 = 尾部
              const lw = Math.max(0.45, w0 * (1 - t * 0.55))
              const a = 0.5 * (1 - t * 0.45)
              fogCtx!.globalCompositeOperation = 'destination-out'
              fogCtx!.strokeStyle = `rgba(0,0,0,${a})`
              fogCtx!.lineWidth = lw
              fogCtx!.lineCap = 'round'
              fogCtx!.beginPath()
              fogCtx!.moveTo(d.path[st].x * 0.5, (d.y - st * stepY) * 0.5)
              for (let k = st + 1; k <= en; k++) {
                const yy = (d.y - k * stepY) * 0.5
                if (yy < 0) break
                fogCtx!.lineTo(d.path[k].x * 0.5, yy)
              }
              fogCtx!.stroke()
              fogCtx!.globalCompositeOperation = 'source-over'
            }
            /* 记录被擦区域：雾随后慢慢重新凝结（水痕流干 → 雾气恢复）
               恢复宽度 = 头部擦除宽度（略宽于最宽擦除），保证整条擦痕都能重新凝雾 */
            const rpts: { x: number; y: number }[] = []
            for (let k = 0; k < lim; k++) {
              const yy = (d.y - k * stepY) * 0.5
              if (yy < 0) break
              rpts.push({ x: d.path[k].x * 0.5, y: yy })
            }
            if (rpts.length > 4) {
              fogRecover.push({ pts: rpts, born: now, life: 3800 + Math.random() * 2600, w: Math.max(1.2, w0 * 1.3) })
              if (fogRecover.length > 80) fogRecover.shift()
            }
          }

          /* 留水痕：把背景放大采样画到湿痕层（水膜折射：透过水看背景微微放大）
             + 极淡白膜提亮；湿痕随后被上面的蒸发逻辑慢慢消散（水痕变干）。
             只画路径覆盖的区域（头部向下回溯 lim 段），新位置每帧累积成连续湿痕 */
          if (wetCtx && wetCv && bgLayer && d.path.length > 1) {
            const wetMag = 1 + 0.1 * refractF     // 放大倍数（受折射强度影响）
            const lim = Math.min(d.path.length, 90)
            const segStep = Math.max(1, Math.floor(lim / 12))
            wetCtx.globalCompositeOperation = 'source-over'
            wetCtx.globalAlpha = 0.5 * (0.4 + 0.6 * wetF)
            for (let k = 0; k < lim; k += segStep) {
              const seg = d.path[k]
              const yy = d.y - k * stepY
              if (yy < -20) break
              const wr = Math.max(2.2, seg.w * 1.6)   // 采样半径（略大于水痕宽度）
              const srcR = (wr / wetMag) * dpr
              wetCtx.drawImage(
                bgLayer,
                seg.x * dpr - srcR, yy * dpr - srcR, srcR * 2, srcR * 2,
                seg.x - wr, yy - wr, wr * 2, wr * 2,
              )
            }
            /* 极淡白膜：水膜让湿痕区域微微提亮（隔着水看），加强"湿"感 */
            wetCtx.globalAlpha = 0.07 * (0.3 + 0.7 * wetF)
            wetCtx.strokeStyle = 'rgba(228,240,252,1)'
            wetCtx.lineWidth = Math.max(1, d.path[0].w * 1.25)
            wetCtx.lineCap = 'round'
            wetCtx.beginPath()
            wetCtx.moveTo(d.path[0].x, d.y)
            const kk = Math.min(4, d.path.length - 1)
            wetCtx.lineTo(d.path[kk].x, d.y - kk * stepY)
            wetCtx.stroke()
            wetCtx.globalAlpha = 1
          }

          /* 吞并：流下时吸收沿途水滴，合并变大 */
          for (let j = drops.length - 1; j >= 0; j--) {
            const o = drops[j]
            if (o === d || o.state === 'flowing') continue
            if (o.y < d.y && o.y > d.y - d.path.length * stepY) {
              const idx = Math.min(Math.round((d.y - o.y) / stepY), d.path.length - 1)
              const seg = d.path[idx]
              if (seg && Math.abs(o.x - seg.x) < seg.w + o.r) {
                d.r = Math.min(15, Math.sqrt(d.r * d.r + o.r * o.r * 0.6))
                d.flowSpeed = Math.min(3.6 * speedF, d.flowSpeed + 0.012)
                d.pulse = 9
                drops.splice(j, 1)
              }
            }
          }

          /* 流到底部：不消失，湿痕残留并缓慢变干（真实玻璃会留下水痕） */
          if (d.y - d.path.length * stepY > H + 40 && !d.fading) {
            d.fading = true
            d.life = 300
            d.y = H + 40
            continue
          }
        } else {
          /* stuck：粘在玻璃上，吸收雨量长大 */
          /* 停住的水流：残留水痕缓慢变淡，之后水珠继续吸收雨量 */
          if (d.trailLife > 0) {
            d.trailLife--
            if (d.trailLife === 0) d.path = []
          }
          /* 老化滑落：粘在玻璃上太久的小水滴会自然开始滑动
             （真实玻璃上水珠不会永久停着），防止水滴堆成一片 */
          d.age++
          if (d.age > 540 && d.r > 2.2 && Math.random() < 0.006 * (d.age / 540)) {
            d.state = 'flowing'
            d.maxLen = (120 + d.r * 10) * (0.6 + Math.random() * 1.2)
            d.flowSpeed = 0.6 * speedF
            d.path = [{ x: d.x, w: Math.max(0.8, d.r * 0.6) }]
            d.step = 0
            continue
          }
          d.x += Math.sin(d.seed * 2 + now * 0.0004) * 0.05 + (Math.random() - 0.5) * 0.05
          d.r += 0.022 * amountF
          /* 合并：相遇的水滴融合（面积守恒） */
          for (let j = i + 1; j < drops.length; j++) {
            const o = drops[j]
            if (o.state !== 'stuck') continue
            const dx = d.x - o.x
            const dy = d.y - o.y
            if (Math.hypot(dx, dy) < d.r + o.r) {
              const big = d.r >= o.r ? d : o
              const small = big === d ? o : d
              big.r = Math.min(15, Math.sqrt(big.r * big.r + small.r * small.r))
              big.x = (big.x + small.x) / 2
              big.y = (big.y + small.y) / 2
              big.wobN = 4 + Math.floor(Math.random() * 4)
              big.wobP = Math.random() * Math.PI * 2
              drops.splice(j, 1)
              j--
              if (drops.length <= 5) break
            }
          }
          /* 强制流动：大到阈值 → 无论是否会动，强制流下 */
          if (d.r >= forceThreshold && d.state === 'stuck') {
            /* 附近有水流就汇入，不开新水痕 */
            if (tryJoinStream(d)) {
              drops.splice(i, 1)
              i--
              continue
            }
            d.state = 'flowing'
            d.flowSpeed = Math.max(1.1, (d.r - forceThreshold) * 0.22 + 1.2) * speedF * (0.8 + 0.4 * ((d.seed % 50) / 50))
            d.path = [{ x: d.x, w: d.r * 0.9 }]
            d.step = 0
            d.pulse = 0
            d.trailLife = 0
            continue
          }
          /* 自发流动：会动的水滴（流动概率决定）长大后触发 */
          if (d.willFlow && d.r >= 3.6 && Math.random() < 0.005 * speedF) {
            /* 附近有水流就汇入，不开新水痕 */
            if (tryJoinStream(d)) {
              drops.splice(i, 1)
              i--
              continue
            }
            d.state = 'flowing'
            d.flowSpeed = Math.max(1.0, (d.r - 2) * 0.2 + 1.0) * speedF * (0.8 + 0.4 * ((d.seed % 50) / 50))
            d.path = [{ x: d.x, w: d.r * 0.9 }]
            d.step = 0
            d.pulse = 0
            d.trailLife = 0
          }
        }
      }

      /* 掉出屏幕的 stuck / 消失的 falling / 变干的水痕 清理 */
      for (let i = drops.length - 1; i >= 0; i--) {
        const d = drops[i]
        if (d.fading) {
          d.life--
          if (d.life <= 0) {
            drops[i] = makeDrop({
              x: Math.random() * W,
              y: -20 - Math.random() * 40,
              r: sizeF * (3.6 + Math.pow(Math.random(), 1.3) * 9.5),
              willFlow: Math.random() < flowF * 0.55,
              state: 'falling',
              vy: 0.5 + Math.random() * 0.45,
            })
          }
        } else if (d.state === 'stuck' && (d.y > H + 20 || d.r < 0.4)) {
          drops[i] = makeDrop({
            x: Math.random() * W,
            y: -20 - Math.random() * 40,
            r: sizeF * (3.6 + Math.pow(Math.random(), 1.3) * 9.5),
            willFlow: Math.random() < flowF * 0.55,
            state: 'falling',
            vy: 0.5 + Math.random() * 0.45,
          })
        } else if (d.state === 'falling' && d.y > H + 30) {
          drops.splice(i, 1)
        }
      }

      /* 3. 铺雾层 → 湿痕层 → 水滴（水流不产生白色拖尾：
         拖尾感来自"水痕"，而水痕 = 雾被擦掉的区域 + 湿痕层的折射水膜，
         水膜随后缓慢蒸发消散） */
      if (fogCv) ctx.drawImage(fogCv, 0, 0, W, H)
      if (wetCv) ctx.drawImage(wetCv, 0, 0, W, H)

      /* 4. 画水滴：滑落中的用泪滴形（上圆下尖），粘住的用不规则圆 */
      for (const d of drops) {
        const fadeIn = Math.min(1, (performance.now() - d.born) / 500)
        const visF = d.fading ? Math.max(0, d.life / 300) : 1
        const trailFade = d.trailLife > 0 ? d.trailLife / 260 : 1
        const hasTrail = d.path.length > 1
        if (d.state === 'flowing' || (d.state === 'stuck' && hasTrail)) {
          drawStream(ctx, d, fadeIn * visF, bgLayer, dpr, refractF, trailFade, d.state === 'flowing' ? 1.55 : 1.2)
        } else {
          drawDrop(ctx, d, fadeIn, bgLayer, dpr, refractF, d.state === 'falling' ? 1.25 : 1, false, d.state === 'falling' ? 'slide' : 'round')
        }
      }

      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      ctx.clearRect(0, 0, canvas.width, canvas.height)
    }
  }, [
    rainOn, rainDensity, rainSpeed, rainAmount, rainSize,
    rainHitChance, rainFlowChance, rainFlowForce,
    rainFogGrow, rainFogMax, rainWind, rainTrail, rainRefract, rainWet,
  ])

  if (!rainOn) return null
  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-[-1]"
      aria-hidden="true"
    />
  )
}
