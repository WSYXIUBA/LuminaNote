import { NextRequest, NextResponse } from 'next/server'

// 网易云音乐抓取（服务端代理，参考 XHBlogs 方案）
const NET_EASE_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  Referer: 'https://music.163.com/',
}

// 内存缓存：避免每次刷新都请求网易云（30 分钟有效，避免触发限流）
const cache = new Map<string, { data: unknown; expires: number }>()
const CACHE_TTL = 30 * 60 * 1000 // 30min

type SongResult = {
  id: string
  name?: string
  artist?: string
  cover?: string
  url?: string
  lrc?: string
  playable?: boolean
  error?: string
}

/* 详情接口多级 fallback：
   1. v3 新版详情（字段: songs[].name / ar[].name / al.picUrl）
   2. 旧版详情（字段: songs[].name / artists[].name / album.picUrl）
   返回统一结构 { name, artist, cover } */
async function fetchSongMeta(songId: string): Promise<{ name: string; artist: string; cover: string } | null> {
  const attempts: { url: string; parse: (j: any) => any }[] = [
    {
      url: `https://music.163.com/api/v3/song/detail?c=${encodeURIComponent(JSON.stringify([{ id: Number(songId) }]))}`,
      parse: (j) => j?.songs?.[0],
    },
    {
      url: `https://music.163.com/api/song/detail/?id=${songId}&ids=[${songId}]`,
      parse: (j) => j?.songs?.[0],
    },
  ]

  for (const attempt of attempts) {
    try {
      const res = await fetch(attempt.url, {
        headers: NET_EASE_HEADERS,
        signal: AbortSignal.timeout(5000),
      })
      if (!res.ok) continue
      const json = await res.json()
      const song = attempt.parse(json)
      if (!song) continue

      const artist =
        (song.ar?.[0]?.name as string) ||
        (song.artists?.[0]?.name as string) ||
        '未知歌手'
      const cover =
        (song.al?.picUrl as string) ||
        (song.album?.picUrl as string) ||
        ''
      return { name: song.name || `歌曲 ${songId}`, artist, cover }
    } catch {
      continue
    }
  }
  return null
}

/* 歌词接口（可选，失败不影响） */
async function fetchLyric(songId: string): Promise<string> {
  try {
    const res = await fetch(`https://music.163.com/api/song/lyric?id=${songId}&lv=-1&kv=-1&tv=-1`, {
      headers: NET_EASE_HEADERS,
      signal: AbortSignal.timeout(4000),
    })
    if (!res.ok) return ''
    const data = await res.json()
    return data?.lrc?.lyric || ''
  } catch {
    return ''
  }
}

export async function GET(request: NextRequest) {
  const ids = request.nextUrl.searchParams.get('ids')
  if (!ids) {
    return NextResponse.json({ error: 'Missing ids parameter' }, { status: 400 })
  }

  const songIds = ids.split(',').map((id) => id.trim()).filter(Boolean)
  const cacheKey = songIds.join(',')

  // 命中缓存直接返回
  const cached = cache.get(cacheKey)
  if (cached && cached.expires > Date.now()) {
    return NextResponse.json(cached.data)
  }

  // 并发抓取，单个失败快速返回不阻塞
  const results: SongResult[] = await Promise.all(
    songIds.map(async (songId): Promise<SongResult> => {
      try {
        const meta = await fetchSongMeta(songId)
        if (!meta) {
          return { id: songId, error: 'not_found' }
        }
        const lrc = await fetchLyric(songId)
        return {
          id: songId,
          name: meta.name,
          artist: meta.artist,
          cover: meta.cover,
          url: `/api/music/stream/${songId}`,
          playable: true,
          lrc,
        }
      } catch {
        return { id: songId, error: 'network_timeout' }
      }
    }),
  )

  // 写缓存（避免频繁打网易云触发限流）
  cache.set(cacheKey, { data: results, expires: Date.now() + CACHE_TTL })

  return NextResponse.json(results)
}
