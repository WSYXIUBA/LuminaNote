'use client'

import { useState, useEffect, useRef } from 'react'
import { useEffects, THEME_PRESETS, EFFECT_KEYS, CLICK_STYLE_LABELS, CLICK_STYLE_PARAMS, getClickParam, type ClickStyle, type FontChoice } from '@/lib/effects-context'

/* ============================================================
   后台 · 外观定制
   管理员可在此调节所有视觉参数，实时预览，
   并能保存到数据库作为全站访客的默认外观。
   ============================================================ */

function Slider({ label, value, min, max, step = 1, unit = '', onChange }: {
  label: string; value: number; min: number; max: number; step?: number; unit?: string
  onChange: (v: number) => void
}) {
  return (
    <div className="mb-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{label}</span>
        <span className="text-xs font-mono tabular-nums" style={{ color: 'var(--accent)' }}>{value}{unit}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="effect-slider w-full" aria-label={label} />
    </div>
  )
}

function Toggle({ label, on, onChange }: { label: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{label}</span>
      <button onClick={() => onChange(!on)} className="relative w-9 h-5 rounded-full transition-colors duration-300 shrink-0"
        style={{ background: on ? 'var(--accent)' : 'rgba(128,128,140,0.25)' }} aria-pressed={on} aria-label={label}>
        <span className="absolute top-[2px] w-4 h-4 rounded-full bg-white shadow transition-all duration-300"
          style={{ left: on ? '20px' : '2px' }} />
      </button>
    </div>
  )
}

function ColorRow({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{label}</span>
      <label className="flex items-center gap-2 cursor-pointer relative">
        <span className="text-xs font-mono uppercase" style={{ color: 'var(--text-secondary)' }}>{value}</span>
        <span className="w-7 h-7 rounded-lg border border-white/20 shadow-inner" style={{ background: value }} />
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)}
          className="w-0 h-0 opacity-0 absolute" aria-label={label} />
      </label>
    </div>
  )
}

/* 胶囊按钮组（选项单选） */
function OptionGroup<T extends string | number>({ label, options, value, onChange }: {
  label: string
  options: readonly { value: T; label: string }[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div className="mb-3">
      <span className="text-xs font-medium block mb-1" style={{ color: 'var(--text-secondary)' }}>{label}</span>
      <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
        {options.map((o) => (
          <button key={String(o.value)} onClick={() => onChange(o.value)}
            className="py-1.5 rounded-lg text-xs font-medium transition-all duration-200 cursor-pointer whitespace-nowrap"
            style={{
              background: value === o.value ? 'var(--accent)' : 'rgba(128,128,140,0.1)',
              color: value === o.value ? '#fff' : 'var(--text-secondary)',
            }}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}

const FONT_CHOICES_UI = [
  { value: 'default', label: '默认' },
  { value: 'sans', label: '思源黑体' },
  { value: 'serif', label: '思源宋体' },
  { value: 'mono', label: '等宽' },
  { value: 'system', label: '系统' },
] as const
const WEIGHT_CHOICES_UI = [
  { value: 0, label: '默认' },
  { value: 300, label: '细' },
  { value: 400, label: '常规' },
  { value: 500, label: '中等' },
  { value: 700, label: '加粗' },
  { value: 900, label: '特粗' },
] as const

/* 文字颜色模式（后台「文字颜色」面板） */
const TEXT_COLOR_MODES_UI = [
  { value: 'default', label: '默认' },
  { value: 'solid', label: '单色' },
  { value: 'gradient', label: '渐变' },
  { value: 'transparent', label: '透明' },
] as const
const HALO_MODE_UI = [
  { value: 'auto', label: '自动' },
  { value: 'black', label: '黑色' },
  { value: 'white', label: '白色' },
] as const

/* 字体分类面板：字体族 + 字号缩放 + 字重（标题额外字距） */
function FontPanel({ title, desc, font, scale, weight, onFont, onScale, onWeight, showTracking = false, tracking, onTracking }: {
  title: string
  desc: string
  font: FontChoice
  scale: number
  weight: number
  onFont: (v: FontChoice) => void
  onScale: (v: number) => void
  onWeight: (v: number) => void
  showTracking?: boolean
  tracking?: number
  onTracking?: (v: number) => void
}) {
  return (
    <div className="rounded-xl p-4 mb-3" style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}>
      <div className="flex items-baseline justify-between mb-3">
        <span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>{title}</span>
        <span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>{desc}</span>
      </div>
      <OptionGroup label="字体" options={FONT_CHOICES_UI} value={font} onChange={onFont} />
      <Slider label="字号" value={scale} min={80} max={150} unit="%" onChange={onScale} />
      <OptionGroup label="字重" options={WEIGHT_CHOICES_UI} value={weight} onChange={onWeight} />
      {showTracking && onTracking && tracking !== undefined && (
        <Slider label="字距" value={tracking} min={-10} max={10} step={1} unit=" 0.01em" onChange={onTracking} />
      )}
    </div>
  )
}

/* 可折叠分类卡片：点击标题展开/收起，状态记住到 localStorage */
function Section({ id, icon, title, badge, defaultOpen = true, children }: {
  id: string; icon: string; title: string; badge?: string; defaultOpen?: boolean; children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)

  // 恢复上次折叠状态
  useEffect(() => {
    try {
      const v = localStorage.getItem(`adm-sec-${id}`)
      if (v !== null) setOpen(v === '1')
    } catch { /* ignore */ }
  }, [id])

  // 响应「全部展开 / 全部折叠」按钮
  useEffect(() => {
    const h = (e: Event) => setOpen((e as CustomEvent<boolean>).detail)
    window.addEventListener('adm-sections-all', h)
    return () => window.removeEventListener('adm-sections-all', h)
  }, [])

  const toggle = () => {
    const next = !open
    setOpen(next)
    try { localStorage.setItem(`adm-sec-${id}`, next ? '1' : '0') } catch { /* ignore */ }
  }

  return (
    <div className="glass-card p-5 rounded-2xl">
      <button onClick={toggle} aria-expanded={open}
        className="w-full flex items-center justify-between gap-2 cursor-pointer select-none group">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-base shrink-0">{icon}</span>
          <h3 className="text-sm font-bold truncate" style={{ color: 'var(--text-primary)' }}>{title}</h3>
          {badge && (
            <span className="text-[10px] px-2 py-0.5 rounded-full shrink-0"
              style={{ background: 'var(--accent-muted)', color: 'var(--accent)' }}>{badge}</span>
          )}
        </div>
        <span className="text-xs shrink-0 transition-transform duration-300"
          style={{ transform: open ? 'rotate(180deg)' : 'none', color: 'var(--text-secondary)' }}>▾</span>
      </button>
      <div className="grid transition-all duration-300 ease-in-out"
        style={{ gridTemplateRows: open ? '1fr' : '0fr' }}>
        <div className="overflow-hidden min-h-0">
          <div className="pt-4">{children}</div>
        </div>
      </div>
    </div>
  )
}

export default function AdminAppearancePage() {
  const fx = useEffects()
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [uploading, setUploading] = useState(false)   // 壁纸上传中
  const fileInputRef = useRef<HTMLInputElement>(null) // 隐藏的壁纸文件选择框
  const [captionsText, setCaptionsText] = useState('')
  const [captionSize, setCaptionSize] = useState(1.4)
  const [allOpen, setAllOpen] = useState(true)

  // 加载已保存的字幕配置
  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((data) => {
        const cfg = data.settings?.captions_config
        if (cfg) {
          try {
            const parsed = JSON.parse(cfg)
            if (Array.isArray(parsed.rows) && parsed.rows.length > 0) {
              setCaptionsText(parsed.rows.map((r: any) => r.text).join('\n'))
              const size = parseFloat(parsed.rows[0]?.size)
              if (!isNaN(size)) setCaptionSize(size)
            }
          } catch { /* ignore */ }
        }
      })
      .catch(() => {})
  }, [])

  const handleSaveToDb = async () => {
    setSaving(true)
    setMsg('')
    try {
      const state = fx.exportState()
      const payload: Record<string, string> = {}
      for (const key of EFFECT_KEYS) {
        const v = (state as any)[key]
        // 嵌套对象（clickParams）序列化为 JSON，其余转字符串
        payload[key] = typeof v === 'object' && v !== null ? JSON.stringify(v) : String(v)
      }
      // 字幕自定义配置：每行一条文字，自动均匀分布，统一字号
      const rows = captionsText.split('\n').map((s) => s.trim()).filter(Boolean)
      const captionsConfig = rows.length > 0
        ? JSON.stringify({
            rows: rows.map((text, i) => ({
              text,
              size: `${captionSize}rem`,
              top: `${5 + (i * 90) / Math.max(rows.length - 1, 1)}%`,
              duration: 40,
              weight: 300,
            })),
          })
        : ''
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settings: {
            effects_config: JSON.stringify(payload),
            captions_config: captionsConfig,
          },
        }),
      })
      if (res.ok) {
        // 同步写入当前浏览器 localStorage，让管理员自己也立即看到全局配置效果
        fx.syncLocalState()
        setMsg('已保存为全站默认外观，你当前浏览器也已同步此配置')
        setTimeout(() => setMsg(''), 4000)
      } else {
        setMsg('保存失败，请重试')
      }
    } catch {
      setMsg('网络错误')
    } finally {
      setSaving(false)
    }
  }

  const handleApplyGlobal = async () => {
    setMsg('')
    try {
      const res = await fetch('/api/settings')
      const data = await res.json()
      const cfg = data.settings?.effects_config
      if (!cfg) {
        setMsg('数据库中还没有全局外观配置，请先点击「保存为全站默认」')
        setTimeout(() => setMsg(''), 4000)
        return
      }
      const parsed = JSON.parse(cfg)
      fx.loadState(parsed)
      fx.syncLocalState()
      setMsg('已应用全站默认外观')
      setTimeout(() => setMsg(''), 3000)
    } catch {
      setMsg('读取失败')
    }
  }

  const handleReset = () => {
    fx.resetAll()
    setMsg('已重置为默认值（尚未保存到数据库）')
    setTimeout(() => setMsg(''), 3000)
  }

  /* 上传本地图片作为自定义壁纸：走 /api/upload（自动生成缩略图），
     成功后加入自定义列表并立即应用 */
  const handleWallpaperUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      const data = await res.json()
      if (res.ok && data.url) {
        fx.addWallpaper(data.url)
        fx.setWallpaper(data.url)
        setMsg('壁纸已添加并应用')
        setTimeout(() => setMsg(''), 3000)
      } else {
        setMsg(data.error || '上传失败')
        setTimeout(() => setMsg(''), 3000)
      }
    } catch {
      setMsg('上传失败，请重试')
      setTimeout(() => setMsg(''), 3000)
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const toggleAll = () => {
    const next = !allOpen
    setAllOpen(next)
    window.dispatchEvent(new CustomEvent('adm-sections-all', { detail: next }))
  }

  return (
    <div className="max-w-5xl">
      {/* 顶部操作栏：sticky 毛玻璃（与全站 glass-card 一致，跟随明暗主题） */}
      <div className="sticky top-0 z-30 -mx-1 px-1 pt-1 pb-4 mb-5">
        <div className="glass-card px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>外观定制</h1>
              <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                分类折叠 · 实时预览 · 保存为全站默认
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={toggleAll}
                className="px-4 py-2 rounded-full text-sm font-medium transition-all hover:brightness-110"
                style={{ color: 'var(--text-primary)', border: '1px solid var(--glass-border)', background: 'var(--glass-bg)' }}>
                {allOpen ? '全部折叠' : '全部展开'}
              </button>
              <button onClick={handleApplyGlobal}
                className="px-4 py-2 rounded-full text-sm font-medium transition-all hover:brightness-110"
                style={{ color: 'var(--text-primary)', border: '1px solid var(--glass-border)', background: 'var(--glass-bg)' }}>
                应用全站默认
              </button>
              <button onClick={handleReset}
                className="px-4 py-2 rounded-full text-sm font-medium transition-all hover:brightness-110"
                style={{ color: 'var(--text-primary)', border: '1px solid var(--glass-border)', background: 'var(--glass-bg)' }}>
                重置默认
              </button>
              <button onClick={handleSaveToDb} disabled={saving}
                className="btn-primary text-sm px-5 py-2">
                {saving ? '保存中...' : '保存为全站默认'}
              </button>
            </div>
          </div>
          {msg && (
            <div className="mt-3 px-4 py-2.5 rounded-xl text-sm font-medium"
              style={{
                background: msg.includes('失败') || msg.includes('错误')
                  ? 'color-mix(in srgb, #ef4444 14%, transparent)'
                  : 'color-mix(in srgb, #22c55e 14%, transparent)',
                color: msg.includes('失败') || msg.includes('错误') ? '#f87171' : '#4ade80',
              }}>
              {msg}
            </div>
          )}
        </div>
      </div>

{/* 分类瀑布流：左右两列独立堆叠（flex），展开/折叠互不影响，折叠组件始终紧凑不留空洞 */}
      <div className="flex flex-col lg:flex-row gap-4 items-start [&>*]:min-w-0">

        {/* 左列：配色 / 玻璃 / 文字颜色 / 音乐 / 雨幕 */}
        <div className="flex-1 min-w-0 flex flex-col gap-4">
          <Section id="theme" icon="🎨" title="配色主题">
                    <div className="grid grid-cols-3 gap-2 mb-4">
                      {THEME_PRESETS.map((t) => (
                        <button key={t.name} onClick={() => fx.applyTheme(t)}
                          className="flex flex-col items-center gap-1.5 px-2 py-2.5 rounded-xl transition-all duration-200 hover:bg-white/10"
                          style={{
                            background: fx.accent === t.accent && fx.accent2 === t.accent2 ? 'var(--accent-muted)' : 'rgba(128,128,140,0.08)',
                          }}>
                          <span className="w-6 h-6 rounded-full" style={{ background: `linear-gradient(135deg, ${t.accent}, ${t.accent2})` }} />
                          <span className="text-[11px] font-medium" style={{ color: 'var(--text-secondary)' }}>{t.name}</span>
                        </button>
                      ))}
                    </div>
                    <ColorRow label="主色调" value={fx.accent} onChange={fx.setAccent} />
                    <ColorRow label="辅助色" value={fx.accent2} onChange={fx.setAccent2} />
                    <div className="h-3 rounded-full" style={{ background: `linear-gradient(90deg, ${fx.accent}, ${fx.accent2})` }} />
                  </Section>

          <Section id="glass" icon="💎" title="玻璃质感">
                    <Slider label="玻璃透明度" value={fx.glassOpacity} min={10} max={90} unit="%" onChange={fx.setGlassOpacity} />
                    <Slider label="玻璃模糊" value={fx.glassBlur} min={0} max={60} unit="px" onChange={fx.setGlassBlur} />
                    <Slider label="玻璃饱和度" value={fx.glassSaturate} min={100} max={250} unit="%" onChange={fx.setGlassSaturate} />
                    <Slider label="玻璃磨砂" value={fx.glassFrost} min={0} max={100} unit="%" onChange={fx.setGlassFrost} />
                    <Slider label="边框亮度" value={fx.glassBorder} min={0} max={100} unit="%" onChange={fx.setGlassBorder} />
                    <Slider label="阴影强度" value={fx.glassShadow} min={0} max={100} unit="%" onChange={fx.setGlassShadow} />
                    <Slider label="卡片圆角" value={fx.glassRadius} min={0} max={40} unit="px" onChange={fx.setGlassRadius} />
                    <Slider label="导航栏透明度" value={fx.navOpacity} min={10} max={100} unit="%" onChange={fx.setNavOpacity} />
                  </Section>

          <Section id="textcolor" icon="🎨" title="文字颜色"
                    badge={fx.textColorMode === 'default' ? undefined : fx.textColorMode === 'solid' ? '单色' : fx.textColorMode === 'gradient' ? '渐变' : '透明'}>
                    <div className="rounded-xl p-4 mb-3" style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}>
                      <div className="flex items-baseline justify-between mb-3">
                        <span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>颜色模式</span>
                        <span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>默认 = 跟随主题，不动就不变；渐变静态不闪烁</span>
                      </div>
                      <OptionGroup label="模式" options={TEXT_COLOR_MODES_UI} value={fx.textColorMode} onChange={fx.setTextColorMode} />
                      {fx.textColorMode === 'solid' && (
                        <ColorRow label="单色" value={fx.textColorSolid} onChange={fx.setTextColorSolid} />
                      )}
                      {fx.textColorMode === 'gradient' && (
                        <>
                          <ColorRow label="渐变起色" value={fx.textGradFrom} onChange={fx.setTextGradFrom} />
                          <ColorRow label="渐变止色" value={fx.textGradTo} onChange={fx.setTextGradTo} />
                          <Slider label="渐变角度" value={fx.textGradAngle} min={0} max={360} unit="°" onChange={fx.setTextGradAngle} />
                        </>
                      )}
                      {fx.textColorMode === 'transparent' && (
                        <>
                          <ColorRow label="叠加颜色" value={fx.textTransColor} onChange={fx.setTextTransColor} />
                          <Slider label="透明度" value={fx.textTransOpacity} min={0} max={100} unit="%" onChange={fx.setTextTransOpacity} />
                          <Slider label="亮度" value={fx.textTransBrightness} min={0} max={100} unit="%" onChange={fx.setTextTransBrightness} />
                          <Slider label="暗度" value={fx.textTransDarkness} min={0} max={100} unit="%" onChange={fx.setTextTransDarkness} />
                          <Slider label="对比度" value={fx.textTransContrast} min={0} max={100} unit="%" onChange={fx.setTextTransContrast} />
                          <Slider label="光晕范围" value={fx.textTransHalo} min={0} max={30} step={1} unit="px" onChange={fx.setTextTransHalo} />
                          <OptionGroup label="衬底颜色" options={HALO_MODE_UI} value={fx.textTransHaloMode} onChange={fx.setTextTransHaloMode} />
                          <Slider label="轮廓描边" value={fx.textTransOutline} min={0} max={8} step={0.5} unit="px" onChange={fx.setTextTransOutline} />
                          <ColorRow label="发光颜色" value={fx.textTransGlowColor} onChange={fx.setTextTransGlowColor} />
                          <Slider label="发光强度" value={fx.textTransGlow} min={0} max={100} unit="%" onChange={fx.setTextTransGlow} />
                          <Slider label="立体深度" value={fx.textTransEmboss} min={0} max={14} step={1} unit="px" onChange={fx.setTextTransEmboss} />
                          <Slider label="玻璃度" value={fx.textTransGlass} min={0} max={100} unit="%" onChange={fx.setTextTransGlass} />
                          <Slider label="模糊度" value={fx.textTransBlur} min={0} max={8} step={0.5} unit="px" onChange={fx.setTextTransBlur} />
                        </>
                      )}
                      {fx.textColorMode !== 'default' && fx.textColorMode !== 'transparent' && (
                        <>
                          <Toggle label="文字描边" on={fx.textStrokeOn} onChange={fx.setTextStrokeOn} />
                          {fx.textStrokeOn && (
                            <>
                              <Slider label="描边粗细" value={fx.textStrokeWidth} min={0} max={3} step={0.5} unit="px" onChange={fx.setTextStrokeWidth} />
                              <ColorRow label="描边颜色" value={fx.textStrokeColor} onChange={fx.setTextStrokeColor} />
                            </>
                          )}
                        </>
                      )}
                    </div>
                    <p className="text-[11px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                      渐变只作用于纯文字元素（标题 / 正文 / 链接 / 时间），按钮、徽标、代码等自带背景的元素保持原样；
                      透明模式：亮度/暗度同时调制衬底明暗，即使透明度 0% 也有效果；
                      对比度光晕 / 彩色发光 / 立体浮雕 / 玻璃度 / 轮廓描边都是独立图层，
                      透明度 0% 时通过这些拉条照样能让文字清晰可见、玩出各种花样。
                    </p>
                  </Section>

          <Section id="musicfx" icon="🎵" title="音乐光效"
                    badge={fx.glowOn || fx.avatarGlowOn ? '已开启' : undefined}>
                    <Toggle label="音乐卡片边缘光效" on={fx.glowOn} onChange={fx.setGlowOn} />
                    {fx.glowOn && (
                      <>
                        <div className="mb-3">
                          <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>光效颜色</span>
                          <div className="grid grid-cols-4 gap-2 mt-1.5">
                            {([['accent', '主题'], ['warm', '暖橙'], ['cyan', '冰蓝'], ['pink', '樱粉'], ['green', '荧光'], ['white', '纯白'], ['custom', '自定义'], ['random', '🎲 随机']] as const).map(([c, label]) => (
                              <button key={c} onClick={() => fx.setGlowStyle(c)}
                                className="py-2 rounded-xl text-xs font-medium transition-all duration-200"
                                style={{ background: fx.glowStyle === c ? 'var(--accent)' : 'rgba(128,128,140,0.1)', color: fx.glowStyle === c ? '#fff' : 'var(--text-secondary)' }}>
                                {label}
                              </button>
                            ))}
                          </div>
                        </div>
                        {fx.glowStyle === 'custom' && (
                          <div className="mb-3 flex items-center gap-2">
                            <input
                              type="color"
                              value={fx.glowCustomColor}
                              onChange={(e) => fx.setGlowCustomColor(e.target.value)}
                              className="w-10 h-8 rounded-md cursor-pointer bg-transparent border-0 p-0"
                              aria-label="自定义光效颜色"
                            />
                            <span className="text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>{fx.glowCustomColor}</span>
                          </div>
                        )}
                        <Slider label="光效亮度" value={fx.glowIntensity} min={20} max={100} unit="%" onChange={fx.setGlowIntensity} />
                        <Slider label="光效扩散" value={fx.glowSpread} min={20} max={100} unit="%" onChange={fx.setGlowSpread} />
                        <Toggle label="随音乐律动" on={fx.glowMusic} onChange={fx.setGlowMusic} />
                        {fx.glowMusic && (
                          <Slider label="律动灵敏度" value={fx.glowSens} min={10} max={100} unit="%" onChange={fx.setGlowSens} />
                        )}
                        <Toggle label="待机呼吸" on={fx.glowBreathe} onChange={fx.setGlowBreathe} />
                      </>
                    )}

                    <div className="border-t pt-3 mt-3" style={{ borderColor: 'var(--glass-border)' }}>
                      <Toggle label="音乐头像光效" on={fx.avatarGlowOn} onChange={fx.setAvatarGlowOn} />
                      {fx.avatarGlowOn && (
                        <>
                          <div className="mb-3">
                            <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>效果风格</span>
                            <div className="grid grid-cols-3 gap-2 mt-1.5">
                              {([['ring', '霓虹星环'], ['rainbow', '彩虹流光'], ['comet', '彗星扫光'], ['pulse', '心跳呼吸'], ['orbit', '行星轨道'], ['rays', '光芒四射'], ['flame', '火焰燃烧'], ['aurora', '极光流动'], ['stardust', '星尘环绕']] as const).map(([s, label]) => (
                                <button key={s} onClick={() => fx.setAvatarStyle(s)}
                                  className="py-2 rounded-xl text-xs font-medium transition-all duration-200"
                                  style={{ background: fx.avatarStyle === s ? 'var(--accent)' : 'rgba(128,128,140,0.1)', color: fx.avatarStyle === s ? '#fff' : 'var(--text-secondary)' }}>
                                  {label}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div className="mb-3">
                            <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>光效颜色</span>
                            <div className="grid grid-cols-4 gap-2 mt-1.5">
                              {([['accent', '主题'], ['warm', '暖橙'], ['cyan', '冰蓝'], ['pink', '樱粉'], ['green', '荧光'], ['white', '纯白'], ['custom', '自定义'], ['random', '🎲 随机']] as const).map(([c, label]) => (
                                <button key={c} onClick={() => fx.setAvatarColor(c)}
                                  className="py-2 rounded-xl text-xs font-medium transition-all duration-200"
                                  style={{ background: fx.avatarColor === c ? 'var(--accent)' : 'rgba(128,128,140,0.1)', color: fx.avatarColor === c ? '#fff' : 'var(--text-secondary)' }}>
                                  {label}
                                </button>
                              ))}
                            </div>
                          </div>
                          {fx.avatarColor === 'custom' && (
                            <div className="mb-3 flex items-center gap-2">
                              <input
                                type="color"
                                value={fx.avatarCustomColor}
                                onChange={(e) => fx.setAvatarCustomColor(e.target.value)}
                                className="w-10 h-8 rounded-md cursor-pointer bg-transparent border-0 p-0"
                                aria-label="自定义头像光效颜色"
                              />
                              <span className="text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>{fx.avatarCustomColor}</span>
                            </div>
                          )}
                          <Slider label="光效亮度" value={fx.avatarIntensity} min={20} max={100} unit="%" onChange={fx.setAvatarIntensity} />
                          <Slider label="光环厚度" value={fx.avatarSize} min={1} max={100} unit="%" onChange={fx.setAvatarSize} />
                          <Slider label="动画速度" value={fx.avatarSpeed} min={0} max={100} unit="%" onChange={fx.setAvatarSpeed} />
                          <Toggle label="随音乐律动" on={fx.avatarMusic} onChange={fx.setAvatarMusic} />
                          {fx.avatarMusic && (
                            <Slider label="律动灵敏度" value={fx.avatarSens} min={10} max={100} unit="%" onChange={fx.setAvatarSens} />
                          )}
                        </>
                      )}
                    </div>
                  </Section>

          <Section id="rain" icon="🌧️" title="雨幕特效（背景雨）"
                    badge={fx.rainOn ? '已开启' : undefined}>
                    <Toggle label="雨幕特效（背景雨，渲染在内容层之下，不遮挡阅读）" on={fx.rainOn} onChange={fx.setRainOn} />
                    {fx.rainOn && (
                      <>
                        <p className="text-xs mb-3" style={{ color: 'var(--text-secondary)', opacity: 0.75 }}>
                          模拟雨打在窗外玻璃上：雨丝先落到玻璃（打屏概率），打上的水滴吸收雨量长大，
                          部分会流下（流动概率），合并到足够大时强制流下；流下的水吞并沿途水滴，
                          把玻璃上的水蒸气冲开，并在流过的位置留下折射水痕（慢慢变干消散）。
                          水蒸气默认没有，按生成速度累积到最大浓度阈值。
                        </p>
                        <Slider label="雨量密度" value={fx.rainDensity} min={10} max={100} unit="%" onChange={fx.setRainDensity} />
                        <Slider label="下落速度" value={fx.rainSpeed} min={10} max={100} unit="%" onChange={fx.setRainSpeed} />
                        <Slider label="水滴大小" value={fx.rainSize} min={10} max={100} unit="%" onChange={fx.setRainSize} />
                        <Slider label="积水速度（水滴吸雨长大的速度）" value={fx.rainAmount} min={10} max={100} unit="%" onChange={fx.setRainAmount} />
                        <Slider label="打屏概率（雨滴落到玻璃上）" value={fx.rainHitChance} min={0} max={100} unit="%" onChange={fx.setRainHitChance} />
                        <Slider label="流动概率（打上的水滴往下流）" value={fx.rainFlowChance} min={0} max={100} unit="%" onChange={fx.setRainFlowChance} />
                        <Slider label="强制流动阈值（0 = 关闭强制）" value={fx.rainFlowForce} min={0} max={100} unit="%" onChange={fx.setRainFlowForce} />
                        <Slider label="折射畸变强度（水滴透镜扭曲背景）" value={fx.rainRefract} min={0} max={100} unit="%" onChange={fx.setRainRefract} />
                        <Slider label="水痕留存（流过痕迹消散速度，越高留越久）" value={fx.rainWet} min={0} max={100} unit="%" onChange={fx.setRainWet} />
                        <Slider label="水蒸气生成速度（0 = 无雾）" value={fx.rainFogGrow} min={0} max={100} unit="%" onChange={fx.setRainFogGrow} />
                        <Slider label="水蒸气最大浓度（阈值）" value={fx.rainFogMax} min={0} max={100} unit="%" onChange={fx.setRainFogMax} />
                        <Slider label="风力（雨丝与水流倾斜度）" value={fx.rainWind} min={0} max={100} unit="%" onChange={fx.setRainWind} />
                        <Slider label="雨丝拖尾（残影长度）" value={fx.rainTrail} min={10} max={100} unit="%" onChange={fx.setRainTrail} />
                      </>
                    )}
                  </Section>
        </div>

        {/* 右列：背景 / 字体 / 粒子 / 鼠标 / 字幕 */}
        <div className="flex-1 min-w-0 flex flex-col gap-4">
          <Section id="background" icon="🌌" title="背景与壁纸"
                    badge={fx.bgMode === 'wallpaper' ? '壁纸' : fx.bgMode === 'gradient' ? '动态渐变' : '纯色'}>
                    <div className="grid grid-cols-3 gap-2 mb-4">
                      {([['gradient', '动态渐变'], ['wallpaper', '壁纸'], ['plain', '纯色']] as const).map(([mode, label]) => (
                        <button key={mode} onClick={() => fx.setBgMode(mode)}
                          className="py-2 rounded-xl text-xs font-medium transition-all duration-200"
                          style={{ background: fx.bgMode === mode ? 'var(--accent)' : 'rgba(128,128,140,0.1)', color: fx.bgMode === mode ? '#fff' : 'var(--text-secondary)' }}>
                          {label}
                        </button>
                      ))}
                    </div>

                    {fx.bgMode === 'plain' && <ColorRow label="背景色" value={fx.plainColor} onChange={fx.setPlainColor} />}

                    {fx.bgMode === 'wallpaper' && (
                      <>
                        <div className="grid grid-cols-3 gap-2 mb-2">
                          {fx.wallpapers.length === 0 && (
                            <div className="col-span-3 h-16 rounded-xl border border-dashed flex items-center justify-center text-xs"
                              style={{ borderColor: 'var(--glass-border)', color: 'var(--text-secondary)' }}>
                              暂无壁纸，点击右侧「＋ 添加壁纸」上传
                            </div>
                          )}
                          {fx.wallpapers.map((wp) => (
                            <div key={wp} className="relative h-16 rounded-xl overflow-hidden transition-all duration-200"
                              style={{ outline: fx.wallpaper === wp ? '2px solid var(--accent)' : '1px solid var(--glass-border)', outlineOffset: 1 }}>
                              <button onClick={() => fx.setWallpaper(wp)} className="w-full h-full block" aria-label="选择此壁纸">
                                <img src={wp} alt="壁纸预览" className="w-full h-full object-cover" />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); fx.removeWallpaper(wp) }}
                                className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white text-[11px] leading-none flex items-center justify-center hover:bg-red-500 transition-colors"
                                aria-label="删除此壁纸" title="删除此壁纸">✕</button>
                            </div>
                          ))}
                          {/* 添加入口：隐藏的文件选择框 */}
                          <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
                            className="relative h-16 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-0.5 transition-all duration-200 hover:bg-white/5 disabled:opacity-60"
                            style={{ borderColor: 'var(--glass-border)' }}>
                            {uploading ? (
                              <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>上传中…</span>
                            ) : (
                              <>
                                <span className="text-lg leading-none" style={{ color: 'var(--accent)' }}>＋</span>
                                <span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>添加壁纸</span>
                              </>
                            )}
                          </button>
                          <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
                            onChange={handleWallpaperUpload} />
                        </div>
                        <p className="text-[10px] mb-3" style={{ color: 'var(--text-secondary)' }}>
                          可上传 jpg/png/webp/gif（≤10MB）；点击「✕」删除壁纸（预设壁纸也可删除），删除后需「保存为全站默认」才会同步给访客。
                        </p>
                        <Slider label="壁纸透明度" value={fx.wallpaperOpacity} min={0} max={100} unit="%" onChange={fx.setWallpaperOpacity} />
                        <Slider label="壁纸模糊" value={fx.wallpaperBlur} min={0} max={60} unit="px" onChange={fx.setWallpaperBlur} />
                        <Slider label="壁纸磨砂" value={fx.wallpaperFrost} min={0} max={100} unit="%" onChange={fx.setWallpaperFrost} />
                        <Slider label="文字对比衬底" value={fx.wallpaperScrim} min={0} max={60} unit="%" onChange={fx.setWallpaperScrim} />
                      </>
                    )}

                    {fx.bgMode === 'gradient' && (
                      <>
                        <Slider label="动效强度" value={fx.bgDynamics} min={0} max={100} unit="%" onChange={fx.setBgDynamics} />
                        <Slider label="流动速度" value={fx.bgSpeed} min={0} max={100} unit="%" onChange={fx.setBgSpeed} />
                      </>
                    )}
                  </Section>

          <Section id="font" icon="🔤" title="字体"
                    badge={fx.fontBody !== 'default' || fx.fontHeading !== 'default' || fx.fontNav !== 'default' || fx.fontAux !== 'default' || fx.fontBtn !== 'default' || fx.fontMono !== 'default' || fx.scaleBody !== 100 || fx.scaleHeading !== 100 || fx.scaleNav !== 100 || fx.scaleAux !== 100 || fx.scaleBtn !== 100 || fx.scaleMono !== 100 || fx.weightBody !== 0 || fx.weightHeading !== 0 || fx.weightNav !== 0 || fx.weightAux !== 0 || fx.weightBtn !== 0 || fx.weightMono !== 0 || fx.trackingHeading !== -2 ? '已自定义' : undefined}>
                    <p className="text-[10px] mb-4 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                      默认值 = 当前效果，不动就不变；只影响字体本身，不碰颜色/阴影/渐变等。
                    </p>
                    <FontPanel title="正文" desc="段落 · 卡片描述 · 列表"
                      font={fx.fontBody} scale={fx.scaleBody} weight={fx.weightBody}
                      onFont={fx.setFontBody} onScale={fx.setScaleBody} onWeight={fx.setWeightBody} />
                    <FontPanel title="标题" desc="h1-h4 · 页面大标题 · 卡片标题"
                      font={fx.fontHeading} scale={fx.scaleHeading} weight={fx.weightHeading}
                      onFont={fx.setFontHeading} onScale={fx.setScaleHeading} onWeight={fx.setWeightHeading}
                      showTracking tracking={fx.trackingHeading} onTracking={fx.setTrackingHeading} />
                    <FontPanel title="导航" desc="前台导航栏 · 后台菜单"
                      font={fx.fontNav} scale={fx.scaleNav} weight={fx.weightNav}
                      onFont={fx.setFontNav} onScale={fx.setScaleNav} onWeight={fx.setWeightNav} />
                    <FontPanel title="辅助小字" desc="时间 · 标签 · 徽标 · 元信息"
                      font={fx.fontAux} scale={fx.scaleAux} weight={fx.weightAux}
                      onFont={fx.setFontAux} onScale={fx.setScaleAux} onWeight={fx.setWeightAux} />
                    <FontPanel title="按钮" desc="按钮 · 操作链接"
                      font={fx.fontBtn} scale={fx.scaleBtn} weight={fx.weightBtn}
                      onFont={fx.setFontBtn} onScale={fx.setScaleBtn} onWeight={fx.setWeightBtn} />
                    <FontPanel title="数字/代码" desc="等宽数字 · 代码块"
                      font={fx.fontMono} scale={fx.scaleMono} weight={fx.weightMono}
                      onFont={fx.setFontMono} onScale={fx.setScaleMono} onWeight={fx.setWeightMono} />
                  </Section>

          <Section id="particles" icon="🌸" title="氛围粒子"
                    badge={fx.effectsOn ? '已开启' : undefined}>
                    <Toggle label="粒子特效（樱花/萤火虫）" on={fx.effectsOn} onChange={fx.setEffectsOn} />
                    {fx.effectsOn && (
                      <>
                        <Slider label="粒子密度" value={fx.effectDensity} min={0} max={100} unit="%" onChange={fx.setEffectDensity} />
                        <Slider label="萤火虫大小" value={fx.fireflySize} min={1} max={12} unit="px" onChange={fx.setFireflySize} />
                        <Slider label="萤火虫亮度" value={fx.fireflyBrightness} min={20} max={100} unit="%" onChange={fx.setFireflyBrightness} />
                        <div className="mb-3">
                          <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>萤火虫颜色</span>
                          <div className="grid grid-cols-5 gap-2 mt-1.5">
                            {([['green', '青绿'], ['warm', '暖黄'], ['cyan', '冰蓝'], ['white', '纯白'], ['random', '🎲 随机']] as const).map(([c, label]) => (
                              <button key={c} onClick={() => fx.setFireflyColor(c)}
                                className="py-2 rounded-xl text-xs font-medium transition-all duration-200"
                                style={{ background: fx.fireflyColor === c ? 'var(--accent)' : 'rgba(128,128,140,0.1)', color: fx.fireflyColor === c ? '#fff' : 'var(--text-secondary)' }}>
                                {label}
                              </button>
                            ))}
                          </div>
                        </div>
                        <Toggle label="萤火虫音乐频闪（随音乐呼吸）" on={fx.fireflyMusic} onChange={fx.setFireflyMusic} />
                        {fx.fireflyMusic && (
                          <Slider label="频闪灵敏度" value={fx.fireflyMusicSens} min={10} max={100} unit="%" onChange={fx.setFireflyMusicSens} />
                        )}
                        <div className="mb-3 mt-3">
                          <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>落叶类型</span>
                          <div className="grid grid-cols-3 gap-2 mt-1.5">
                            {([['sakura', '🌸 樱花'], ['leaf', '🍃 绿叶'], ['mix', '✨ 混合']] as const).map(([type, label]) => (
                              <button key={type} onClick={() => fx.setLeafType(type)}
                                className="py-2 rounded-xl text-xs font-medium transition-all duration-200"
                                style={{ background: fx.leafType === type ? 'var(--accent)' : 'rgba(128,128,140,0.1)', color: fx.leafType === type ? '#fff' : 'var(--text-secondary)' }}>
                                {label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </Section>

          <Section id="mousefx" icon="🖱️" title="鼠标交互"
                    badge={fx.tiltOn || fx.trailOn || fx.clickOn ? '已开启' : undefined}>
                    <Toggle label="卡片 3D 下压（鼠标指向一角下压）" on={fx.tiltOn} onChange={fx.setTiltOn} />
                    <Toggle label="鼠标拖尾" on={fx.trailOn} onChange={fx.setTrailOn} />
                    {fx.trailOn && (
                      <>
                        <div className="mb-3">
                          <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>拖尾风格</span>
                          <div className="grid grid-cols-5 gap-2 mt-1">
                            {([
                              ['dots', '光点链'],
                              ['ribbon', '丝带'],
                              ['sparkle', '星尘'],
                              ['comet', '彗星'],
                              ['neon', '霓虹'],
                            ] as const).map(([v, label]) => (
                              <button key={v} onClick={() => fx.setTrailStyle(v)}
                                className="py-2 rounded-lg text-xs font-medium transition-all duration-200"
                                style={{ background: fx.trailStyle === v ? 'var(--accent)' : 'rgba(128,128,140,0.1)', color: fx.trailStyle === v ? '#fff' : 'var(--text-secondary)' }}>
                                {label}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="mb-3">
                          <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>拖尾颜色</span>
                          <div className="grid grid-cols-2 gap-2 mt-1">
                            <button onClick={() => fx.setTrailColor('accent')}
                              className="py-2 rounded-lg text-xs font-medium transition-all duration-200"
                              style={{ background: fx.trailColor === 'accent' ? 'var(--accent)' : 'rgba(128,128,140,0.1)', color: fx.trailColor === 'accent' ? '#fff' : 'var(--text-secondary)' }}>
                              跟随主色
                            </button>
                            <button onClick={() => fx.setTrailColor('gradient')}
                              className="py-2 rounded-lg text-xs font-medium transition-all duration-200"
                              style={{ background: fx.trailColor === 'gradient' ? 'var(--accent)' : 'rgba(128,128,140,0.1)', color: fx.trailColor === 'gradient' ? '#fff' : 'var(--text-secondary)' }}>
                              主色渐变
                            </button>
                            <button onClick={() => fx.setTrailColor('random')}
                              className="py-2 rounded-lg text-xs font-medium transition-all duration-200"
                              style={{ background: fx.trailColor === 'random' ? 'var(--accent)' : 'rgba(128,128,140,0.1)', color: fx.trailColor === 'random' ? '#fff' : 'var(--text-secondary)' }}>
                              🎲 随机彩色
                            </button>
                            <button onClick={() => fx.setTrailColor('custom')}
                              className="py-2 rounded-lg text-xs font-medium transition-all duration-200"
                              style={{ background: fx.trailColor === 'custom' ? 'var(--accent)' : 'rgba(128,128,140,0.1)', color: fx.trailColor === 'custom' ? '#fff' : 'var(--text-secondary)' }}>
                              自定义
                            </button>
                          </div>
                          {fx.trailColor === 'custom' && (
                            <div className="flex items-center gap-2 mt-1.5">
                              <input type="color" value={fx.trailCustomColor}
                                onChange={(e) => fx.setTrailCustomColor(e.target.value)}
                                className="w-10 h-8 rounded-md cursor-pointer bg-transparent border-0 p-0" aria-label="自定义拖尾颜色" />
                              <span className="text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>{fx.trailCustomColor}</span>
                            </div>
                          )}
                        </div>
                        <Slider label="拖尾长度" value={fx.trailLength} min={5} max={30} onChange={fx.setTrailLength} />
                        <Slider label="粒子大小" value={fx.trailSize} min={1} max={10} onChange={fx.setTrailSize} />
                        <Slider label="透明度" value={fx.trailOpacity} min={10} max={100} onChange={fx.setTrailOpacity} />
                        <Slider label="发光强度" value={fx.trailGlow} min={0} max={30} onChange={fx.setTrailGlow} />
                      </>
                    )}

                    <div className="border-t pt-3 mt-2" style={{ borderColor: 'var(--glass-border)' }}>
                      <Toggle label="点击特效" on={fx.clickOn} onChange={fx.setClickOn} />
                      {fx.clickOn && (
                        <>
                          <div className="mb-3">
                            <Toggle label="特效叠加（不打断）" on={fx.clickStack} onChange={fx.setClickStack} />
                            <p className="text-[11px] mt-1 leading-relaxed" style={{ color: 'var(--text-secondary)', opacity: 0.8 }}>
                              开启：连续点击时多个特效同时播放、互不打断（如两个水波重叠）；关闭：新特效打断上一个特效
                            </p>
                          </div>
                          <div className="mb-3">
                            <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>点击风格</span>
                            <div className="grid grid-cols-3 gap-2 mt-1">
                              {(Object.keys(CLICK_STYLE_PARAMS) as ClickStyle[]).map((v) => (
                                <button key={v} onClick={() => fx.setClickStyle(v)}
                                  className="py-2 rounded-lg text-xs font-medium transition-all duration-200"
                                  style={{ background: fx.clickStyle === v ? 'var(--accent)' : 'rgba(128,128,140,0.1)', color: fx.clickStyle === v ? '#fff' : 'var(--text-secondary)' }}>
                                  {CLICK_STYLE_LABELS[v]}
                                </button>
                              ))}
                            </div>
                          </div>
                          {fx.clickStyle === 'ripple' && (
                            <div className="mb-3 rounded-lg p-2.5" style={{ background: 'rgba(128,128,140,0.06)' }}>
                              <Toggle label="水波扭曲组件层" on={fx.clickRippleContent} onChange={fx.setClickRippleContent} />
                              <p className="text-[11px] mt-1 leading-relaxed" style={{ color: 'var(--text-secondary)', opacity: 0.8 }}>
                                开启：点击水波连带扭曲组件（毛玻璃卡片）一起荡漾；关闭：只扭曲背景层，组件保持清晰
                              </p>
                            </div>
                          )}
                          <div className="mb-3">
                            <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>点击颜色</span>
                            <div className="grid grid-cols-3 gap-2 mt-1">
                              <button onClick={() => fx.setClickColor('accent')}
                                className="py-2 rounded-lg text-xs font-medium transition-all duration-200"
                                style={{ background: fx.clickColor === 'accent' ? 'var(--accent)' : 'rgba(128,128,140,0.1)', color: fx.clickColor === 'accent' ? '#fff' : 'var(--text-secondary)' }}>
                                跟随主色
                              </button>
                              <button onClick={() => fx.setClickColor('random')}
                                className="py-2 rounded-lg text-xs font-medium transition-all duration-200"
                                style={{ background: fx.clickColor === 'random' ? 'var(--accent)' : 'rgba(128,128,140,0.1)', color: fx.clickColor === 'random' ? '#fff' : 'var(--text-secondary)' }}>
                                🎲 随机彩色
                              </button>
                              <button onClick={() => fx.setClickColor('custom')}
                                className="py-2 rounded-lg text-xs font-medium transition-all duration-200"
                                style={{ background: fx.clickColor === 'custom' ? 'var(--accent)' : 'rgba(128,128,140,0.1)', color: fx.clickColor === 'custom' ? '#fff' : 'var(--text-secondary)' }}>
                                自定义
                              </button>
                            </div>
                            {fx.clickColor === 'custom' && (
                              <div className="flex items-center gap-2 mt-1.5">
                                <input type="color" value={fx.clickCustomColor}
                                  onChange={(e) => fx.setClickCustomColor(e.target.value)}
                                  className="w-10 h-8 rounded-md cursor-pointer bg-transparent border-0 p-0" aria-label="自定义点击颜色" />
                                <span className="text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>{fx.clickCustomColor}</span>
                              </div>
                            )}
                          </div>
                          {/* 风格自适应参数：每种风格显示自己的滑块（水波纹→范围+强度，烟花→大小+数量…） */}
                          {CLICK_STYLE_PARAMS[fx.clickStyle].map((p) => {
                            const { value, set } = getClickParam(fx, fx.clickStyle, p)
                            return <Slider key={p.key} label={p.label} value={value} min={p.min} max={p.max} onChange={set} />
                          })}
                        </>
                      )}
                    </div>
                  </Section>

          <Section id="captions" icon="📝" title="背景字幕"
                    badge={fx.captionsOn ? '已开启' : undefined}>
                    <Toggle label="背景字幕（全屏滚动文字）" on={fx.captionsOn} onChange={fx.setCaptionsOn} />
                    {fx.captionsOn && (
                      <>
                        <Slider label="字幕透明度" value={fx.captionsOpacity} min={0} max={40} unit="%" onChange={fx.setCaptionsOpacity} />
                        <Slider label="字幕速度" value={fx.captionSpeed} min={10} max={100} unit="%" onChange={fx.setCaptionSpeed} />
                      </>
                    )}
                    <div className="border-t pt-3 mt-2" style={{ borderColor: 'var(--glass-border)' }}>
                      <p className="text-xs mb-3" style={{ color: 'var(--text-secondary)' }}>
                        每行一条字幕文字（空行忽略），保存后前台全屏背景滚动显示
                      </p>
                      <textarea
                        value={captionsText}
                        onChange={(e) => setCaptionsText(e.target.value)}
                        rows={7}
                        className="w-full px-4 py-3 rounded-xl text-sm leading-relaxed resize-y outline-none font-mono"
                        style={{
                          background: 'var(--glass-bg)',
                          border: '1px solid var(--glass-border)',
                          color: 'var(--text-primary)',
                        }}
                        placeholder={'例如：\n肆一纸心の栖息居\n用文字记录时光 · 用镜头定格瞬间\nBLOG · GALLERY · GUESTBOOK'}
                        aria-label="字幕文字"
                      />
                      <div className="mt-3">
                        <Slider label="字幕字号" value={captionSize} min={0.8} max={3} step={0.1} unit="rem" onChange={setCaptionSize} />
                      </div>
                    </div>
                  </Section>
        </div>

      </div>

      <p className="text-xs mb-8" style={{ color: 'var(--text-secondary)', opacity: 0.6 }}>
        提示：页面上的所有调节都会实时预览，并自动保存到你当前浏览器。
        点击顶部「保存为全站默认」后，新访客打开网站时会自动应用此配置（仍可在前台面板自行调整）。
      </p>
    </div>
  )
}
