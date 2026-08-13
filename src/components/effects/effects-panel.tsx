'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useEffects, THEME_PRESETS, CLICK_STYLE_LABELS, CLICK_STYLE_PARAMS, getClickParam, type ClickStyle } from '@/lib/effects-context'

/* ============================================================
   外观定制面板 — 右下角浮动按钮 + 毛玻璃抽屉
   配色主题 / 第 1 层背景 / 第 2 层壁纸效果 / 第 3 层组件玻璃 / 氛围
   ============================================================ */

/* ---------- 滑块 ---------- */
function Slider({
  label, value, min, max, step = 1, unit = '', onChange,
}: {
  label: string; value: number; min: number; max: number; step?: number; unit?: string
  onChange: (v: number) => void
}) {
  return (
    <div className="mb-2.5">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11.5px] font-medium" style={{ color: 'var(--text-secondary)' }}>{label}</span>
        <span className="text-[10.5px] font-mono tabular-nums" style={{ color: 'var(--accent)' }}>{value}{unit}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="effect-slider w-full" aria-label={label} />
    </div>
  )
}

/* ---------- 开关 ---------- */
function Toggle({ label, on, onChange }: { label: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-[11.5px] font-medium" style={{ color: 'var(--text-secondary)' }}>{label}</span>
      <button onClick={() => onChange(!on)} className="relative w-8 h-[18px] rounded-full transition-colors duration-300 shrink-0"
        style={{ background: on ? 'var(--accent)' : 'rgba(128,128,140,0.25)' }} aria-pressed={on} aria-label={label}>
        <span className="absolute top-[2px] w-[14px] h-[14px] rounded-full bg-white shadow transition-all duration-300"
          style={{ left: on ? '16px' : '2px' }} />
      </button>
    </div>
  )
}

/* ---------- 取色行 ---------- */
function ColorRow({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center justify-between mb-2">
      <span className="text-[11.5px] font-medium" style={{ color: 'var(--text-secondary)' }}>{label}</span>
      <label className="flex items-center gap-2 cursor-pointer relative">
        <span className="text-[10px] font-mono uppercase" style={{ color: 'var(--text-secondary)' }}>{value}</span>
        <span className="w-6 h-6 rounded-lg border border-white/20 shadow-inner" style={{ background: value }} />
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)}
          className="w-0 h-0 opacity-0 absolute" aria-label={label} />
      </label>
    </div>
  )
}

/* ---------- 分区标题 ---------- */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="w-1 h-3 rounded-full" style={{ background: 'var(--accent)' }} />
        <h4 className="text-[12.5px] font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</h4>
      </div>
      {children}
    </div>
  )
}

export default function EffectsPanel() {
  const [open, setOpen] = useState(false)
  const fx = useEffects()

  return (
    <>
      <motion.button
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-6 right-6 z-[80] flex items-center justify-center w-12 h-12 rounded-full glass-nav cursor-pointer"
        whileHover={{ scale: 1.08, rotate: open ? 0 : 30 }}
        whileTap={{ scale: 0.94 }}
        aria-label="外观定制" title="外观定制"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} style={{ color: 'var(--text-primary)' }}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42" />
        </svg>
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            transition={{ duration: 0.22, ease: [0.21, 0.47, 0.32, 0.98] }}
            className="fixed bottom-24 right-6 z-[80] w-[320px] max-h-[78vh] overflow-y-auto rounded-2xl glass-card p-4"
          >
            <div className="flex items-center justify-between mb-3.5">
              <h3 className="text-[13.5px] font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <span className="gradient-text">外观定制</span>
              </h3>
              <button onClick={() => fx.resetAll()}
                className="text-[10.5px] px-2.5 py-1 rounded-full transition-colors hover:bg-white/10"
                style={{ color: 'var(--text-secondary)', border: '1px solid var(--glass-border)' }}>
                重置默认
              </button>
            </div>

            {/* 配色主题 */}
            <Section title="配色主题">
              <div className="grid grid-cols-3 gap-1.5 mb-2.5">
                {THEME_PRESETS.map((t) => (
                  <button key={t.name} onClick={() => fx.applyTheme(t)}
                    className="flex items-center gap-1 px-1.5 py-1.5 rounded-lg text-[10px] font-medium transition-all duration-200 hover:bg-white/10"
                    style={{
                      background: fx.accent === t.accent && fx.accent2 === t.accent2 ? 'var(--accent-muted)' : 'rgba(128,128,140,0.1)',
                      color: 'var(--text-secondary)',
                    }}>
                    <span className="w-3 h-3 rounded-full shrink-0" style={{ background: `linear-gradient(135deg, ${t.accent}, ${t.accent2})` }} />
                    {t.name}
                  </button>
                ))}
              </div>
              <ColorRow label="主色调" value={fx.accent} onChange={fx.setAccent} />
              <ColorRow label="辅助色" value={fx.accent2} onChange={fx.setAccent2} />
              <div className="h-2 rounded-full mt-1.5" style={{ background: `linear-gradient(90deg, ${fx.accent}, ${fx.accent2})` }} />
            </Section>

            {/* 第 1 层：背景 */}
            <Section title="第 1 层 · 背景">
              <div className="grid grid-cols-3 gap-1.5 mb-2.5">
                {([['gradient', '动态渐变'], ['wallpaper', '壁纸'], ['plain', '纯色']] as const).map(([mode, label]) => (
                  <button key={mode} onClick={() => fx.setBgMode(mode)}
                    className="py-1.5 rounded-lg text-[11px] font-medium transition-all duration-200"
                    style={{ background: fx.bgMode === mode ? 'var(--accent)' : 'rgba(128,128,140,0.12)', color: fx.bgMode === mode ? '#fff' : 'var(--text-secondary)' }}>
                    {label}
                  </button>
                ))}
              </div>

              <AnimatePresence>
                {fx.bgMode === 'plain' && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.18 }} className="overflow-hidden">
                    <ColorRow label="背景色" value={fx.plainColor} onChange={fx.setPlainColor} />
                  </motion.div>
                )}
                {fx.bgMode === 'wallpaper' && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.18 }} className="overflow-hidden">
                    {fx.wallpapers.length === 0 ? (
                      <p className="text-[11px] mb-2" style={{ color: 'var(--text-secondary)' }}>
                        暂无壁纸，请在后台「外观定制」中添加
                      </p>
                    ) : (
                      <div className="grid grid-cols-3 gap-1.5 mb-2">
                        {fx.wallpapers.map((wp) => (
                          <button key={wp} onClick={() => fx.setWallpaper(wp)}
                            className="relative h-11 rounded-lg overflow-hidden transition-all duration-200"
                            style={{ outline: fx.wallpaper === wp ? '2px solid var(--accent)' : '1px solid var(--glass-border)', outlineOffset: 1 }}>
                            <img src={wp} alt="壁纸预览" className="w-full h-full object-cover" />
                          </button>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}
                {fx.bgMode === 'gradient' && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.18 }} className="overflow-hidden">
                    <Slider label="动效强度" value={fx.bgDynamics} min={0} max={100} unit="%" onChange={fx.setBgDynamics} />
                    <Slider label="流动速度" value={fx.bgSpeed} min={0} max={100} unit="%" onChange={fx.setBgSpeed} />
                  </motion.div>
                )}
              </AnimatePresence>
            </Section>

            {/* 第 2 层：壁纸效果（仅壁纸模式生效） */}
            <Section title="第 2 层 · 壁纸效果">
              {fx.bgMode === 'wallpaper' ? (
                <>
                  <Slider label="壁纸透明度" value={fx.wallpaperOpacity} min={0} max={100} unit="%" onChange={fx.setWallpaperOpacity} />
                  <Slider label="壁纸模糊" value={fx.wallpaperBlur} min={0} max={60} unit="px" onChange={fx.setWallpaperBlur} />
                  <Slider label="壁纸磨砂" value={fx.wallpaperFrost} min={0} max={100} unit="%" onChange={fx.setWallpaperFrost} />
                </>
              ) : (
                <p className="text-[10.5px] py-1.5 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  当前背景为「{fx.bgMode === 'gradient' ? '动态渐变' : '纯色'}」，壁纸效果不生效。
                  请在上方切换到「壁纸」模式后再调节。
                </p>
              )}
            </Section>

            {/* 第 3 层：组件毛玻璃 */}
            <Section title="第 3 层 · 组件玻璃">
              <Slider label="玻璃透明度" value={fx.glassOpacity} min={10} max={90} unit="%" onChange={fx.setGlassOpacity} />
              <Slider label="玻璃模糊" value={fx.glassBlur} min={0} max={60} unit="px" onChange={fx.setGlassBlur} />
              <Slider label="玻璃饱和度" value={fx.glassSaturate} min={100} max={250} unit="%" onChange={fx.setGlassSaturate} />
              <Slider label="玻璃磨砂" value={fx.glassFrost} min={0} max={100} unit="%" onChange={fx.setGlassFrost} />
              <Slider label="边框亮度" value={fx.glassBorder} min={0} max={100} unit="%" onChange={fx.setGlassBorder} />
              <Slider label="阴影强度" value={fx.glassShadow} min={0} max={100} unit="%" onChange={fx.setGlassShadow} />
              <Slider label="卡片圆角" value={fx.glassRadius} min={0} max={40} unit="px" onChange={fx.setGlassRadius} />
              <Slider label="导航栏透明度" value={fx.navOpacity} min={10} max={100} unit="%" onChange={fx.setNavOpacity} />
            </Section>

            {/* 氛围 */}
            <Section title="氛围">
              <Toggle label="背景字幕" on={fx.captionsOn} onChange={fx.setCaptionsOn} />
              {fx.captionsOn && (
                <>
                  <Slider label="字幕透明度" value={fx.captionsOpacity} min={0} max={40} unit="%" onChange={fx.setCaptionsOpacity} />
                  <Slider label="字幕速度" value={fx.captionSpeed} min={10} max={100} unit="%" onChange={fx.setCaptionSpeed} />
                </>
              )}
              <Toggle label="粒子特效" on={fx.effectsOn} onChange={fx.setEffectsOn} />
              {fx.effectsOn && (
                <>
                  <Slider label="粒子密度" value={fx.effectDensity} min={0} max={100} unit="%" onChange={fx.setEffectDensity} />
                  <Slider label="萤火虫大小" value={fx.fireflySize} min={1} max={12} unit="px" onChange={fx.setFireflySize} />
                  <Slider label="萤火虫亮度" value={fx.fireflyBrightness} min={20} max={100} unit="%" onChange={fx.setFireflyBrightness} />
                  <div className="mb-2">
                    <span className="text-[11.5px] font-medium" style={{ color: 'var(--text-secondary)' }}>萤火虫颜色</span>
                    <div className="grid grid-cols-5 gap-1.5 mt-1">
                      {([['green', '青绿'], ['warm', '暖黄'], ['cyan', '冰蓝'], ['white', '纯白'], ['random', '🎲']] as const).map(([c, label]) => (
                        <button key={c} onClick={() => fx.setFireflyColor(c)}
                          className="py-1.5 rounded-lg text-[10.5px] font-medium transition-all duration-200"
                          style={{ background: fx.fireflyColor === c ? 'var(--accent)' : 'rgba(128,128,140,0.12)', color: fx.fireflyColor === c ? '#fff' : 'var(--text-secondary)' }}>
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <Toggle label="音乐频闪（随音乐呼吸）" on={fx.fireflyMusic} onChange={fx.setFireflyMusic} />
                  {fx.fireflyMusic && (
                    <Slider label="频闪灵敏度" value={fx.fireflyMusicSens} min={10} max={100} unit="%" onChange={fx.setFireflyMusicSens} />
                  )}
                  <div className="border-t mt-2 pt-2" style={{ borderColor: 'var(--glass-border)' }}>
                    <Toggle label="音乐卡片边缘光效" on={fx.glowOn} onChange={fx.setGlowOn} />
                    {fx.glowOn && (
                      <>
                        <div className="mb-2">
                          <span className="text-[11.5px] font-medium" style={{ color: 'var(--text-secondary)' }}>光效颜色</span>
                          <div className="grid grid-cols-4 gap-1.5 mt-1">
                            {([['accent', '主题'], ['warm', '暖橙'], ['cyan', '冰蓝'], ['pink', '樱粉'], ['green', '荧光'], ['white', '纯白'], ['custom', '自定义'], ['random', '🎲']] as const).map(([c, label]) => (
                              <button key={c} onClick={() => fx.setGlowStyle(c)}
                                className="py-1.5 rounded-lg text-[10.5px] font-medium transition-all duration-200"
                                style={{ background: fx.glowStyle === c ? 'var(--accent)' : 'rgba(128,128,140,0.12)', color: fx.glowStyle === c ? '#fff' : 'var(--text-secondary)' }}>
                                {label}
                              </button>
                            ))}
                          </div>
                        </div>
                        {fx.glowStyle === 'custom' && (
                          <div className="mb-2 flex items-center gap-2">
                            <input
                              type="color"
                              value={fx.glowCustomColor}
                              onChange={(e) => fx.setGlowCustomColor(e.target.value)}
                              className="w-8 h-7 rounded-md cursor-pointer bg-transparent border-0 p-0"
                              aria-label="自定义光效颜色"
                            />
                            <span className="text-[10.5px] font-mono" style={{ color: 'var(--text-secondary)' }}>{fx.glowCustomColor}</span>
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
                  </div>
                  <div className="border-t mt-2 pt-2" style={{ borderColor: 'var(--glass-border)' }}>
                    <Toggle label="音乐头像光效" on={fx.avatarGlowOn} onChange={fx.setAvatarGlowOn} />
                    {fx.avatarGlowOn && (
                      <>
                        <div className="mb-2">
                          <span className="text-[11.5px] font-medium" style={{ color: 'var(--text-secondary)' }}>效果风格</span>
                          <div className="grid grid-cols-3 gap-1.5 mt-1">
                            {([['ring', '霓虹星环'], ['rainbow', '彩虹流光'], ['comet', '彗星扫光'], ['pulse', '心跳呼吸'], ['orbit', '行星轨道'], ['rays', '光芒四射'], ['flame', '火焰燃烧'], ['aurora', '极光流动'], ['stardust', '星尘环绕']] as const).map(([s, label]) => (
                              <button key={s} onClick={() => fx.setAvatarStyle(s)}
                                className="py-1.5 rounded-lg text-[10.5px] font-medium transition-all duration-200"
                                style={{ background: fx.avatarStyle === s ? 'var(--accent)' : 'rgba(128,128,140,0.12)', color: fx.avatarStyle === s ? '#fff' : 'var(--text-secondary)' }}>
                                {label}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="mb-2">
                          <span className="text-[11.5px] font-medium" style={{ color: 'var(--text-secondary)' }}>光效颜色</span>
                          <div className="grid grid-cols-4 gap-1.5 mt-1">
                            {([['accent', '主题'], ['warm', '暖橙'], ['cyan', '冰蓝'], ['pink', '樱粉'], ['green', '荧光'], ['white', '纯白'], ['custom', '自定义'], ['random', '🎲']] as const).map(([c, label]) => (
                              <button key={c} onClick={() => fx.setAvatarColor(c)}
                                className="py-1.5 rounded-lg text-[10.5px] font-medium transition-all duration-200"
                                style={{ background: fx.avatarColor === c ? 'var(--accent)' : 'rgba(128,128,140,0.12)', color: fx.avatarColor === c ? '#fff' : 'var(--text-secondary)' }}>
                                {label}
                              </button>
                            ))}
                          </div>
                        </div>
                        {fx.avatarColor === 'custom' && (
                          <div className="mb-2 flex items-center gap-2">
                            <input
                              type="color"
                              value={fx.avatarCustomColor}
                              onChange={(e) => fx.setAvatarCustomColor(e.target.value)}
                              className="w-8 h-7 rounded-md cursor-pointer bg-transparent border-0 p-0"
                              aria-label="自定义头像光效颜色"
                            />
                            <span className="text-[10.5px] font-mono" style={{ color: 'var(--text-secondary)' }}>{fx.avatarCustomColor}</span>
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
                </>
              )}
              {/* 落叶类型 */}
              {fx.effectsOn && (
                <div className="mb-2">
                  <span className="text-[11.5px] font-medium" style={{ color: 'var(--text-secondary)' }}>落叶类型</span>
                  <div className="grid grid-cols-3 gap-1.5 mt-1">
                    {([['sakura', '🌸 樱花'], ['leaf', '🍃 绿叶'], ['mix', '✨ 混合']] as const).map(([type, label]) => (
                      <button key={type} onClick={() => fx.setLeafType(type)}
                        className="py-1.5 rounded-lg text-[10.5px] font-medium transition-all duration-200"
                        style={{ background: fx.leafType === type ? 'var(--accent)' : 'rgba(128,128,140,0.12)', color: fx.leafType === type ? '#fff' : 'var(--text-secondary)' }}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {/* 交互特效 */}
              <div className="border-t mt-1 pt-2" style={{ borderColor: 'var(--glass-border)' }}>
                <Toggle label="卡片 3D 下压" on={fx.tiltOn} onChange={fx.setTiltOn} />
                <Toggle label="鼠标拖尾" on={fx.trailOn} onChange={fx.setTrailOn} />
                {fx.trailOn && (
                  <>
                    <div className="mb-2">
                      <span className="text-[11.5px] font-medium" style={{ color: 'var(--text-secondary)' }}>拖尾风格</span>
                      <div className="grid grid-cols-5 gap-1.5 mt-1">
                        {([
                          ['dots', '光点链'],
                          ['ribbon', '丝带'],
                          ['sparkle', '星尘'],
                          ['comet', '彗星'],
                          ['neon', '霓虹'],
                        ] as const).map(([v, label]) => (
                          <button key={v} onClick={() => fx.setTrailStyle(v)}
                            className="py-1.5 rounded-lg text-[10.5px] font-medium transition-all duration-200"
                            style={{ background: fx.trailStyle === v ? 'var(--accent)' : 'rgba(128,128,140,0.12)', color: fx.trailStyle === v ? '#fff' : 'var(--text-secondary)' }}>
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="mb-2">
                      <span className="text-[11.5px] font-medium" style={{ color: 'var(--text-secondary)' }}>拖尾颜色</span>
                      <div className="grid grid-cols-2 gap-1.5 mt-1">
                        <button onClick={() => fx.setTrailColor('accent')}
                          className="py-1.5 rounded-lg text-[10.5px] font-medium transition-all duration-200"
                          style={{ background: fx.trailColor === 'accent' ? 'var(--accent)' : 'rgba(128,128,140,0.12)', color: fx.trailColor === 'accent' ? '#fff' : 'var(--text-secondary)' }}>
                          跟随主色
                        </button>
                        <button onClick={() => fx.setTrailColor('gradient')}
                          className="py-1.5 rounded-lg text-[10.5px] font-medium transition-all duration-200"
                          style={{ background: fx.trailColor === 'gradient' ? 'var(--accent)' : 'rgba(128,128,140,0.12)', color: fx.trailColor === 'gradient' ? '#fff' : 'var(--text-secondary)' }}>
                          主色渐变
                        </button>
                        <button onClick={() => fx.setTrailColor('random')}
                          className="py-1.5 rounded-lg text-[10.5px] font-medium transition-all duration-200"
                          style={{ background: fx.trailColor === 'random' ? 'var(--accent)' : 'rgba(128,128,140,0.12)', color: fx.trailColor === 'random' ? '#fff' : 'var(--text-secondary)' }}>
                          🎲 随机彩色
                        </button>
                        <button onClick={() => fx.setTrailColor('custom')}
                          className="py-1.5 rounded-lg text-[10.5px] font-medium transition-all duration-200"
                          style={{ background: fx.trailColor === 'custom' ? 'var(--accent)' : 'rgba(128,128,140,0.12)', color: fx.trailColor === 'custom' ? '#fff' : 'var(--text-secondary)' }}>
                          自定义
                        </button>
                      </div>
                      {fx.trailColor === 'custom' && (
                        <div className="flex items-center gap-2 mt-1.5">
                          <input type="color" value={fx.trailCustomColor}
                            onChange={(e) => fx.setTrailCustomColor(e.target.value)}
                            className="w-9 h-7 rounded-md cursor-pointer bg-transparent border-0 p-0" aria-label="自定义拖尾颜色" />
                          <span className="text-[10.5px] font-mono" style={{ color: 'var(--text-secondary)' }}>{fx.trailCustomColor}</span>
                        </div>
                      )}
                    </div>
                    <Slider label="拖尾长度" value={fx.trailLength} min={5} max={30} onChange={fx.setTrailLength} />
                    <Slider label="粒子大小" value={fx.trailSize} min={1} max={10} onChange={fx.setTrailSize} />
                    <Slider label="透明度" value={fx.trailOpacity} min={10} max={100} onChange={fx.setTrailOpacity} />
                    <Slider label="发光强度" value={fx.trailGlow} min={0} max={30} onChange={fx.setTrailGlow} />
                  </>
                )}

                <div className="border-t mt-2 pt-2" style={{ borderColor: 'var(--glass-border)' }}>
                  <Toggle label="点击特效" on={fx.clickOn} onChange={fx.setClickOn} />
                  {fx.clickOn && (
                    <>
                      <div className="mb-2">
                        <span className="text-[11.5px] font-medium" style={{ color: 'var(--text-secondary)' }}>点击风格</span>
                        <div className="grid grid-cols-3 gap-1.5 mt-1">
                          {(Object.keys(CLICK_STYLE_PARAMS) as ClickStyle[]).map((v) => (
                            <button key={v} onClick={() => fx.setClickStyle(v)}
                              className="py-1.5 rounded-lg text-[10.5px] font-medium transition-all duration-200"
                              style={{ background: fx.clickStyle === v ? 'var(--accent)' : 'rgba(128,128,140,0.12)', color: fx.clickStyle === v ? '#fff' : 'var(--text-secondary)' }}>
                              {CLICK_STYLE_LABELS[v]}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="mb-2">
                        <span className="text-[11.5px] font-medium" style={{ color: 'var(--text-secondary)' }}>点击颜色</span>
                        <div className="grid grid-cols-3 gap-1.5 mt-1">
                          <button onClick={() => fx.setClickColor('accent')}
                            className="py-1.5 rounded-lg text-[10.5px] font-medium transition-all duration-200"
                            style={{ background: fx.clickColor === 'accent' ? 'var(--accent)' : 'rgba(128,128,140,0.12)', color: fx.clickColor === 'accent' ? '#fff' : 'var(--text-secondary)' }}>
                            跟随主色
                          </button>
                          <button onClick={() => fx.setClickColor('random')}
                            className="py-1.5 rounded-lg text-[10.5px] font-medium transition-all duration-200"
                            style={{ background: fx.clickColor === 'random' ? 'var(--accent)' : 'rgba(128,128,140,0.12)', color: fx.clickColor === 'random' ? '#fff' : 'var(--text-secondary)' }}>
                            🎲 随机彩色
                          </button>
                          <button onClick={() => fx.setClickColor('custom')}
                            className="py-1.5 rounded-lg text-[10.5px] font-medium transition-all duration-200"
                            style={{ background: fx.clickColor === 'custom' ? 'var(--accent)' : 'rgba(128,128,140,0.12)', color: fx.clickColor === 'custom' ? '#fff' : 'var(--text-secondary)' }}>
                            自定义
                          </button>
                        </div>
                        {fx.clickColor === 'custom' && (
                          <div className="flex items-center gap-2 mt-1.5">
                            <input type="color" value={fx.clickCustomColor}
                              onChange={(e) => fx.setClickCustomColor(e.target.value)}
                              className="w-9 h-7 rounded-md cursor-pointer bg-transparent border-0 p-0" aria-label="自定义点击颜色" />
                            <span className="text-[10.5px] font-mono" style={{ color: 'var(--text-secondary)' }}>{fx.clickCustomColor}</span>
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
              </div>
            </Section>

            <p className="text-[10px] text-center mt-2" style={{ color: 'var(--text-secondary)' }}>
              实时生效 · 自动保存到浏览器
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
