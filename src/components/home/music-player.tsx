'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMusic } from '@/lib/music-context'
import MusicGlow from '@/components/effects/music-glow'
import AvatarGlow from '@/components/effects/avatar-glow'

const BAR_COUNT = 32

export default function MusicPlayer({ cloudIds = [] }: { cloudIds?: string[] }) {
  const router = useRouter()
  const {
    tracks, current, playing, progress, loadingCloud, track,
    audioRef, analyserRef, togglePlay, playTrack, next, prev, handleFile,
    formatTime, loadTracks,
  } = useMusic()

  const [showList, setShowList] = useState(false)
  const barRefs = useRef<(HTMLDivElement | null)[]>([])
  const idleRef = useRef<ReturnType<typeof setInterval> | null>(null)

  /* 首次拿到 cloudIds 时加载曲目 */
  const loadedRef = useRef(false)
  useEffect(() => {
    if (loadedRef.current) return
    if (cloudIds.length === 0) return  // 等首页 fetch 完 settings 再触发
    loadedRef.current = true
    loadTracks(cloudIds)
  }, [cloudIds, loadTracks])

  /* 也在歌单页场景下直接 fetch settings 加载 */
  useEffect(() => {
    if (loadedRef.current) return
    if (cloudIds.length > 0) return  // 首页会触发
    loadedRef.current = true
    const fetchAndLoad = async () => {
      try {
        const res = await fetch('/api/settings')
        const data = await res.json()
        let ids: string[] = []
        if (data.settings?.music_cloud_ids) {
          ids = data.settings.music_cloud_ids.split(',').map((s: string) => s.trim()).filter(Boolean)
        }
        loadTracks(ids)
      } catch { /* ignore */ }
    }
    fetchAndLoad()
  }, [cloudIds, loadTracks])

  /* 律动条动画 */
  useEffect(() => {
    if (!playing) {
      idleRef.current = setInterval(() => {
        barRefs.current.forEach((bar) => {
          if (bar) {
            const h = 4 + Math.random() * 24
            bar.style.height = `${h}px`
            bar.style.transition = 'height 0.35s ease'
          }
        })
      }, 380)
      return () => { if (idleRef.current) clearInterval(idleRef.current) }
    }

    let raf = 0
    const tick = () => {
      const analyser = analyserRef.current
      if (analyser) {
        const data = new Uint8Array(analyser.frequencyBinCount)
        analyser.getByteFrequencyData(data)
        barRefs.current.forEach((bar, i) => {
          if (bar) {
            const idx = Math.floor((i / BAR_COUNT) * data.length)
            const val = data[idx] || 0
            bar.style.height = `${Math.max(4, (val / 255) * 52)}px`
            bar.style.transition = 'height 0.08s ease'
          }
        })
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [playing])

  const formatTimeSafe = formatTime || ((s: number) => '0:00')

  if (tracks.length === 0) {
    return (
      <div className="relative h-full">
        <div
          className="glass-card glass-card-hover p-5 md:p-6 h-full flex flex-col items-center justify-center gap-2 relative overflow-visible transition-all duration-500 cursor-pointer"
          data-tilt
          onClick={() => router.push('/music')}
        >
        <MusicGlow />
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--accent-muted)', color: 'var(--accent)' }}>
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.303z" />
          </svg>
        </div>
        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
          {loadingCloud ? '正在连接网易云…' : '点击进入歌单'}
        </p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative h-full">
      <div
        className="glass-card glass-card-hover p-5 md:p-6 h-full flex flex-col relative overflow-visible transition-all duration-500 cursor-pointer"
        data-tilt
        onClick={() => router.push('/music')}
      >
      <MusicGlow />
      <div className="relative z-10 flex flex-col h-full gap-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <span className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent-muted)', color: 'var(--accent)' }}>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.303z" />
              </svg>
            </span>
            音乐
          </h3>
          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setShowList(!showList)}
              className="text-[10px] px-2.5 py-1 rounded-full transition-all"
              style={{ color: showList ? 'var(--accent)' : 'var(--text-secondary)', background: 'var(--glass-bg)' }}
            >
              歌单 ({tracks.length})
            </button>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <AvatarGlow src={track?.cover} alt={track?.name} size={56} />

          <div className="flex items-end justify-center gap-[3px] h-14 flex-1">
            {Array.from({ length: BAR_COUNT }).map((_, i) => (
              <div
                key={i}
                ref={(el) => { barRefs.current[i] = el }}
                className="flex-1 min-w-[3px] max-w-[7px] rounded-full"
                style={{ height: '6px', background: 'linear-gradient(to top, var(--accent), var(--accent-2))', opacity: 0.8 }}
              />
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>
              {track?.name || '无曲目'}
            </p>
            <p className="text-[10px] mt-0.5 flex items-center gap-1" style={{ color: 'var(--text-secondary)' }}>
              {track?.source === 'cloud' && (
                <span className="px-1 py-0.5 rounded text-[8px] font-bold" style={{ background: 'var(--accent-muted)', color: 'var(--accent)' }}>云</span>
              )}
              {track?.artist || ''}
            </p>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
            <button onClick={prev} className="control-btn" style={{ color: 'var(--text-secondary)' }}>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 16.811c0 .864-.933 1.406-1.683.977l-7.108-4.062a1.125 1.125 0 010-1.953l7.108-4.062A1.125 1.125 0 0121 8.688v8.123zM11.25 16.811c0 .864-.933 1.406-1.683.977l-7.108-4.062a1.125 1.125 0 010-1.953L9.567 6.71a1.125 1.125 0 011.683.977v8.123z" />
              </svg>
            </button>
            <button
              onClick={togglePlay}
              className="w-9 h-9 rounded-full flex items-center justify-center text-white shadow-sm transition-all duration-200 hover:scale-105 active:scale-95"
              style={{ background: 'var(--gradient-main)' }}
            >
              {playing ? (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6.75 5.25a.75.75 0 01.75-.75H9a.75.75 0 01.75.75v13.5A.75.75 0 019 19.5H7.5a.75.75 0 01-.75-.75V5.25zm7.5 0a.75.75 0 01.75-.75H16.5a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75h-1.5a.75.75 0 01-.75-.75V5.25z" /></svg>
              ) : (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8.25 4.5l12 7.5-12 7.5v-15z" /></svg>
              )}
            </button>
            <button onClick={next} className="control-btn" style={{ color: 'var(--text-secondary)' }}>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8.688c0-.864.933-1.406 1.683-.977l7.108 4.062a1.125 1.125 0 010 1.953l-7.108 4.062A1.125 1.125 0 013 16.811V8.688zM12.75 8.688c0-.864.933-1.406 1.683-.977l7.108 4.062a1.125 1.125 0 010 1.953l-7.108 4.062a1.125 1.125 0 01-1.683-.977V8.688z" />
              </svg>
            </button>
          </div>
        </div>

        {track && (
          <div>
            <div className="h-1 rounded-full overflow-hidden" style={{ background: 'var(--glass-bg)' }}>
              <div className="h-full rounded-full transition-all duration-300" style={{ width: `${progress * 100}%`, background: 'var(--gradient-main)' }} />
            </div>
            <div className="flex justify-between text-[9px] mt-1" style={{ color: 'var(--text-secondary)' }}>
              <span>{formatTimeSafe(audioRef.current?.currentTime || 0)}</span>
              <span>{audioRef.current?.duration ? formatTimeSafe(audioRef.current.duration) : '0:00'}</span>
            </div>
          </div>
        )}

        {showList && tracks.length > 0 && (
          <div className="max-h-28 overflow-y-auto space-y-0.5 mt-1 rounded-lg p-1.5" style={{ background: 'var(--glass-bg)' }} onClick={(e) => e.stopPropagation()}>
            {tracks.map((t, i) => (
              <button
                key={`${t.name}-${i}`}
                onClick={() => playTrack(i)}
                className={`w-full text-left px-3 py-1.5 rounded-md text-[10px] truncate transition-colors ${i === current ? '' : 'hover:bg-white/10'}`}
                style={{ color: i === current ? 'var(--accent)' : 'var(--text-secondary)', background: i === current ? 'var(--accent-muted)' : 'transparent' }}
              >
                {i === current && '♪ '}{t.name}{t.source === 'cloud' && <span className="ml-1 text-[8px] opacity-60">[云]</span>}
              </button>
            ))}
          </div>
        )}
      </div>
      </div>
    </div>
  )
}
