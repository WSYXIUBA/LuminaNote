'use client'

import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react'

/* ============================================================
   全局音乐播放器 Context
   audio 元素挂载在 Provider（根布局）中，页面跳转时不会卸载，
   音乐持续播放。首页音乐卡和 /music 歌单页共享同一状态。
   ============================================================ */

export interface Track {
  name: string
  artist: string
  url: string
  cover?: string
  source?: 'local' | 'cloud'
  playable?: boolean
  lrc?: string
}

interface MusicContextType {
  tracks: Track[]
  current: number
  playing: boolean
  progress: number
  currentTime: number
  duration: number
  loadingCloud: boolean
  track: Track | undefined
  audioRef: React.RefObject<HTMLAudioElement | null>
  analyserRef: React.RefObject<AnalyserNode | null>
  togglePlay: () => Promise<void>
  playTrack: (i: number) => void
  next: () => void
  prev: () => void
  seekTo: (ratio: number) => void
  handleFile: (e: React.ChangeEvent<HTMLInputElement>) => void
  formatTime: (s: number) => string
  loadTracks: (cloudIds: string[]) => void
}

const MusicContext = createContext<MusicContextType>({
  tracks: [],
  current: 0,
  playing: false,
  progress: 0,
  currentTime: 0,
  duration: 0,
  loadingCloud: false,
  track: undefined,
  audioRef: { current: null },
  analyserRef: { current: null },
  togglePlay: async () => {},
  playTrack: () => {},
  next: () => {},
  prev: () => {},
  seekTo: () => {},
  handleFile: () => {},
  formatTime: () => '0:00',
  loadTracks: () => {},
})

export function useMusic() {
  return useContext(MusicContext)
}

export function MusicProvider({ children }: { children: React.ReactNode }) {
  const [tracks, setTracks] = useState<Track[]>([])
  const [current, setCurrent] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [loadingCloud, setLoadingCloud] = useState(false)

  const audioRef = useRef<HTMLAudioElement>(null)
  const ctxRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)

  const track = tracks[current]

  /* 初始化 AudioContext + Analyser（首次播放时调用，只能调一次） */
  const ensureAudioContext = useCallback(() => {
    if (ctxRef.current) return ctxRef.current
    const audio = audioRef.current
    if (!audio) return null
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
      const source = ctx.createMediaElementSource(audio)
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 128
      analyser.smoothingTimeConstant = 0.78
      source.connect(analyser)
      analyser.connect(ctx.destination)
      ctxRef.current = ctx
      analyserRef.current = analyser
      return ctx
    } catch {
      return null
    }
  }, [])

  /* 加载曲目（本地 + 网易云） */
  const loadTracks = useCallback((cloudIds: string[]) => {
    const local: Track[] = []
    try {
      const saved = localStorage.getItem('music_tracks')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed)) local.push(...parsed)
      }
    } catch { /* ignore */ }

    const load = async () => {
      let cloud: Track[] = []
      if (cloudIds.length > 0) {
        setLoadingCloud(true)
        try {
          const controller = new AbortController()
          const timer = setTimeout(() => controller.abort(), 5000)
          const res = await fetch(`/api/music?ids=${cloudIds.join(',')}`, { signal: controller.signal })
          clearTimeout(timer)
          const data = await res.json()
          if (Array.isArray(data)) {
            cloud = data
              .filter((s: any) => s && !s.error)
              .map((s: any) => ({
                name: s.name || '未知歌曲',
                artist: s.artist || '未知歌手',
                url: s.url || '',
                cover: s.cover || '',
                source: 'cloud' as const,
                playable: Boolean(s.url),
                lrc: s.lrc || '',
              }))
          }
        } catch { /* ignore */ }
        setLoadingCloud(false)
      }
      const merged = [...cloud, ...local]
      if (merged.length > 0) {
        setTracks((prev) => (prev.length > 0 ? prev : merged))
      }
    }
    load()
  }, [])

  const togglePlay = useCallback(async () => {
    const audio = audioRef.current
    if (!audio || !track) return
    if (!track.url) {
      alert(`「${track.name}」受版权保护，无法在线播放。\n请点击「导入」添加本地音频。`)
      return
    }
    const ctx = ensureAudioContext()
    if (ctx && ctx.state === 'suspended') await ctx.resume()
    if (audio.paused) {
      try { await audio.play(); setPlaying(true) } catch { /* ignore */ }
    } else {
      audio.pause()
      setPlaying(false)
    }
  }, [track, ensureAudioContext])

  const playTrack = useCallback((i: number) => {
    const t = tracks[i]
    if (!t) return
    if (!t.url) {
      alert(`「${t.name}」受版权保护，无法在线播放。\n请添加本地音频。`)
      return
    }
    setCurrent(i)
    setProgress(0)
    const audio = audioRef.current
    if (audio) {
      audio.load()
      // 切歌后如果之前在播放，自动播放新歌
      if (playing) {
        setTimeout(() => audio.play().catch(() => {}), 80)
      }
    }
  }, [tracks, playing])

  const next = useCallback(() => {
    if (tracks.length === 0) return
    playTrack((current + 1) % tracks.length)
  }, [tracks.length, current, playTrack])

  const prev = useCallback(() => {
    if (tracks.length === 0) return
    playTrack((current - 1 + tracks.length) % tracks.length)
  }, [tracks.length, current, playTrack])

  const seekTo = useCallback((ratio: number) => {
    const audio = audioRef.current
    if (!audio || !audio.duration) return
    audio.currentTime = ratio * audio.duration
  }, [])

  const handleFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    const newTracks: Track[] = []
    Array.from(files).forEach((file) => {
      if (file.type.startsWith('audio/')) {
        const url = URL.createObjectURL(file)
        newTracks.push({
          name: file.name.replace(/\.[^.]+$/, ''),
          artist: '本地音乐',
          url,
          source: 'local',
        })
      }
    })
    if (newTracks.length > 0) {
      setTracks((prev) => {
        const merged = [...prev, ...newTracks]
        localStorage.setItem('music_tracks', JSON.stringify(merged.filter((t) => t.source === 'local')))
        return merged
      })
    }
    e.target.value = ''
  }, [])

  const formatTime = useCallback((s: number) => {
    if (!s || isNaN(s)) return '0:00'
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${sec.toString().padStart(2, '0')}`
  }, [])

  /* audio 事件监听 */
  const onTimeUpdate = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    const cur = audio.currentTime
    const dur = audio.duration || 1
    setCurrentTime(cur)
    setProgress(cur / dur)
  }, [])

  const onLoadedMetadata = useCallback(() => {
    const audio = audioRef.current
    if (audio) setDuration(audio.duration || 0)
  }, [])

  const onEnded = useCallback(() => {
    next()
  }, [next])

  const value: MusicContextType = {
    tracks,
    current,
    playing,
    progress,
    currentTime,
    duration,
    loadingCloud,
    track,
    audioRef,
    analyserRef,
    togglePlay,
    playTrack,
    next,
    prev,
    seekTo,
    handleFile,
    formatTime,
    loadTracks,
  }

  return (
    <MusicContext.Provider value={value}>
      {children}
      {/* 全局 audio 元素：挂载在 Provider 中，页面跳转不卸载 */}
      <audio
        ref={audioRef}
        src={track?.url}
        onTimeUpdate={onTimeUpdate}
        onLoadedMetadata={onLoadedMetadata}
        onEnded={onEnded}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        crossOrigin="anonymous"
        style={{ display: 'none' }}
      />
    </MusicContext.Provider>
  )
}
