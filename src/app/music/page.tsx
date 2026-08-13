'use client'

import Link from 'next/link'
import { useEffect, useRef, useState, useCallback } from 'react'
import { useMusic } from '@/lib/music-context'
import MusicGlow from '@/components/effects/music-glow'
import AvatarGlow from '@/components/effects/avatar-glow'

/* 歌词解析 */
interface LrcLine { time: number; text: string }
function parseLrc(raw?: string): LrcLine[] {
  if (!raw) return []
  const lines: LrcLine[] = []
  for (const line of raw.split('\n')) {
    const m = line.match(/\[(\d+):(\d+(?:\.\d+)?)\]\s*(.*)/)
    if (m) lines.push({ time: parseInt(m[1]) * 60 + parseFloat(m[2]), text: m[3].trim() })
  }
  return lines.sort((a, b) => a.time - b.time)
}

const BAR_COUNT = 32

export default function MusicPage() {
  const {
    tracks, current, playing, progress, currentTime, duration, loadingCloud,
    track, audioRef, analyserRef, togglePlay, playTrack, next, prev, seekTo,
    formatTime, loadTracks,
  } = useMusic()

  const [lrcLines, setLrcLines] = useState<LrcLine[]>([])
  const [activeLrc, setActiveLrc] = useState(-1)
  const [loaded, setLoaded] = useState(false)

  const barRefs = useRef<(HTMLDivElement | null)[]>([])
  const idleRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const lrcScrollRef = useRef<HTMLDivElement | null>(null)

  /* 首次挂载：加载曲目 */
  useEffect(() => {
    if (loaded) return
    setLoaded(true)
    const fetchSettings = async () => {
      let cloudIds: string[] = []
      try {
        const res = await fetch('/api/settings')
        const data = await res.json()
        if (data.settings?.music_cloud_ids) {
          cloudIds = data.settings.music_cloud_ids.split(',').map((s: string) => s.trim()).filter(Boolean)
        }
      } catch { /* ignore */ }
      loadTracks(cloudIds)
    }
    fetchSettings()
  }, [loaded, loadTracks])

  /* 切歌时更新歌词 */
  useEffect(() => {
    const lines = parseLrc(track?.lrc)
    setLrcLines(lines)
    setActiveLrc(-1)
  }, [current, track])

  /* 律动条 */
  useEffect(() => {
    if (playing) {
      const analyser = analyserRef.current
      if (analyser) {
        const data = new Uint8Array(analyser.frequencyBinCount)
        const tick = () => {
          if (!playing) return
          analyser.getByteFrequencyData(data)
          for (let i = 0; i < BAR_COUNT; i++) {
            const idx = Math.floor((i / BAR_COUNT) * data.length)
            const val = data[idx] || 0
            const bar = barRefs.current[i]
            if (bar) {
              bar.style.height = `${Math.max(3, (val / 255) * 48)}px`
              bar.style.transition = 'height 0.06s linear'
            }
          }
          requestAnimationFrame(tick)
        }
        requestAnimationFrame(tick)
      } else {
        let phase = 0
        idleRef.current = setInterval(() => {
          phase += 0.15
          for (let i = 0; i < BAR_COUNT; i++) {
            const bar = barRefs.current[i]
            if (bar) bar.style.height = `${6 + Math.abs(Math.sin(phase + i * 0.3)) * 24}px`
          }
        }, 80)
      }
    } else {
      if (idleRef.current) { clearInterval(idleRef.current); idleRef.current = null }
      for (let i = 0; i < BAR_COUNT; i++) {
        const bar = barRefs.current[i]
        if (bar) bar.style.height = '4px'
      }
    }
    return () => { if (idleRef.current) { clearInterval(idleRef.current); idleRef.current = null } }
  }, [playing, analyserRef])

  /* 歌词高亮 + 滚动 */
  useEffect(() => {
    if (lrcLines.length === 0) return
    let idx = -1
    for (let i = 0; i < lrcLines.length; i++) {
      if (lrcLines[i].time <= currentTime) idx = i
      else break
    }
    setActiveLrc(idx)
  }, [currentTime, lrcLines])

  useEffect(() => {
    if (activeLrc >= 0 && lrcScrollRef.current) {
      const el = lrcScrollRef.current.children[activeLrc] as HTMLElement
      if (el) {
        lrcScrollRef.current.scrollTo({
          top: el.offsetTop - lrcScrollRef.current.clientHeight / 2 + el.clientHeight / 2,
          behavior: 'smooth',
        })
      }
    }
  }, [activeLrc])

  const loading = !loaded || (loaded && tracks.length === 0 && loadingCloud)

  return (
    <div className="content-container py-10">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--gradient-main)' }}>
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.303z" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>音乐歌单</h1>
            <p className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>{tracks.length} 首曲目 · 网易云 + 本地</p>
          </div>
        </div>
        <Link href="/" className="flex items-center gap-1.5 text-xs px-4 py-2 rounded-full glass-nav" style={{ color: 'var(--text-secondary)' }}>
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          返回首页
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 space-y-6">
          {track ? (
            <div className="glass-card p-6 relative overflow-visible" data-tilt>
              <MusicGlow />
              <div className="flex items-center gap-5">
                <AvatarGlow src={track.cover} alt={track.name} size={96} />

                <div className="flex-1 min-w-0">
                  <p className="text-base font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{track.name}</p>
                  <p className="text-xs mt-1 flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
                    {track.source === 'cloud' && <span className="px-1.5 py-0.5 rounded text-[9px] font-bold" style={{ background: 'var(--accent-muted)', color: 'var(--accent)' }}>云</span>}
                    {track.artist}
                  </p>
                  <div className="mt-3">
                    <div className="h-1.5 rounded-full overflow-hidden cursor-pointer" style={{ background: 'var(--glass-bg)' }}
                      onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect()
                        seekTo((e.clientX - rect.left) / rect.width)
                      }}
                    >
                      <div className="h-full rounded-full transition-all duration-300" style={{ width: `${progress * 100}%`, background: 'var(--gradient-main)' }} />
                    </div>
                    <div className="flex justify-between text-[10px] mt-1" style={{ color: 'var(--text-secondary)' }}>
                      <span>{formatTime(currentTime)}</span>
                      <span>{duration ? formatTime(duration) : '0:00'}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-shrink-0">
                  <button onClick={prev} className="control-btn" style={{ color: 'var(--text-secondary)' }} aria-label="上一首">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 16.811c0 .864-.933 1.406-1.683.977l-7.108-4.062a1.125 1.125 0 010-1.953l7.108-4.062A1.125 1.125 0 0121 8.688v8.123zM11.25 16.811c0 .864-.933 1.406-1.683.977l-7.108-4.062a1.125 1.125 0 010-1.953L9.567 6.71a1.125 1.125 0 011.683.977v8.123z" />
                    </svg>
                  </button>
                  <button onClick={togglePlay} className="w-12 h-12 rounded-full flex items-center justify-center text-white shadow-md transition-all duration-200 hover:scale-105 active:scale-95" style={{ background: 'var(--gradient-main)' }} aria-label="播放/暂停">
                    {playing ? (
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M6.75 5.25a.75.75 0 01.75-.75H9a.75.75 0 01.75.75v13.5A.75.75 0 019 19.5H7.5a.75.75 0 01-.75-.75V5.25zm7.5 0a.75.75 0 01.75-.75H16.5a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75h-1.5a.75.75 0 01-.75-.75V5.25z" /></svg>
                    ) : (
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M8.25 4.5l12 7.5-12 7.5v-15z" /></svg>
                    )}
                  </button>
                  <button onClick={next} className="control-btn" style={{ color: 'var(--text-secondary)' }} aria-label="下一首">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 8.688c0-.864.933-1.406 1.683-.977l7.108 4.062a1.125 1.125 0 010 1.953l-7.108 4.062A1.125 1.125 0 013 16.811V8.688zM12.75 8.688c0-.864.933-1.406 1.683-.977l7.108 4.062a1.125 1.125 0 010 1.953l-7.108 4.062a1.125 1.125 0 01-1.683-.977V8.688z" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="flex items-end justify-center gap-[3px] mt-5 h-12">
                {Array.from({ length: BAR_COUNT }).map((_, i) => (
                  <div key={i} ref={(el) => { barRefs.current[i] = el }} className="w-[4px] rounded-full"
                    style={{ height: '4px', background: 'linear-gradient(to top, var(--accent), var(--accent-2))', opacity: 0.5 + (i / BAR_COUNT) * 0.3, transition: 'height 0.08s ease' }}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="glass-card p-10 text-center relative overflow-visible">
              <MusicGlow />
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{loading ? '加载中…' : '暂无曲目'}</p>
            </div>
          )}

          {lrcLines.length > 0 && (
            <div className="glass-card p-6 relative overflow-visible" data-tilt>
              <MusicGlow />
              <div ref={lrcScrollRef} className="h-48 overflow-y-auto scroll-smooth" style={{ scrollbarWidth: 'none' }}>
                {lrcLines.map((line, i) => (
                  <p key={i} className="text-center text-sm py-1.5 transition-all duration-300"
                    style={{ color: i === activeLrc ? 'var(--accent)' : 'var(--text-secondary)', opacity: i === activeLrc ? 1 : 0.35, fontWeight: i === activeLrc ? 600 : 400, transform: i === activeLrc ? 'scale(1.04)' : 'scale(1)' }}
                  >
                    {line.text || '♪'}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-2">
          <div className="glass-card p-5 relative overflow-visible" data-tilt>
            <MusicGlow />
            <h2 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} style={{ color: 'var(--accent)' }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
              </svg>
              全部曲目
              {tracks.length > 0 && <span className="text-[10px] font-normal" style={{ color: 'var(--text-secondary)' }}>{tracks.length} 首</span>}
            </h2>

            {loading ? (
              <div className="space-y-2">{[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-12 rounded-xl bg-white/10 animate-pulse" />)}</div>
            ) : tracks.length === 0 ? (
              <div className="py-10 text-center"><p className="text-xs" style={{ color: 'var(--text-secondary)' }}>暂无曲目，请到后台「音乐管理」添加</p></div>
            ) : (
              <div className="space-y-1 max-h-[480px] overflow-y-auto">
                {tracks.map((t, i) => (
                  <button key={`${t.name}-${i}`} onClick={() => playTrack(i)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-200 hover:bg-white/10"
                    style={{ background: i === current ? 'var(--accent-muted)' : 'transparent' }}
                  >
                    <span className="w-6 text-center text-xs font-mono" style={{ color: i === current ? 'var(--accent)' : 'var(--text-secondary)' }}>
                      {i === current && playing ? (
                        <svg className="w-3.5 h-3.5 inline-block" fill="currentColor" viewBox="0 0 24 24"><path d="M6.75 5.25a.75.75 0 01.75-.75H9a.75.75 0 01.75.75v13.5A.75.75 0 019 19.5H7.5a.75.75 0 01-.75-.75V5.25zm7.5 0a.75.75 0 01.75-.75H16.5a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75h-1.5a.75.75 0 01-.75-.75V5.25z" /></svg>
                      ) : i === current ? (
                        <svg className="w-3.5 h-3.5 inline-block" fill="currentColor" viewBox="0 0 24 24"><path d="M8.25 4.5l12 7.5-12 7.5v-15z" /></svg>
                      ) : (i + 1)}
                    </span>
                    {t.cover ? (
                      <img src={t.cover} alt="" className="w-9 h-9 rounded-lg object-cover flex-shrink-0" referrerPolicy="no-referrer" />
                    ) : (
                      <span className="w-9 h-9 rounded-lg flex-shrink-0 flex items-center justify-center" style={{ background: 'var(--glass-bg)', color: 'var(--text-secondary)' }}>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.303z" /></svg>
                      </span>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate" style={{ color: i === current ? 'var(--accent)' : 'var(--text-primary)' }}>{t.name}</p>
                      <p className="text-[10px] truncate" style={{ color: 'var(--text-secondary)' }}>{t.artist}</p>
                    </div>
                    {t.source === 'cloud' && <span className="px-1.5 py-0.5 rounded text-[9px] font-bold flex-shrink-0" style={{ background: 'var(--accent-muted)', color: 'var(--accent)' }}>云</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
