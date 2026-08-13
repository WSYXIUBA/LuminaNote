import { NextRequest, NextResponse } from 'next/server'

// 网易云音频流代理：服务端带 Referer/UA 请求外链（302→CDN），转发音频流
const NET_EASE_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  Referer: 'https://music.163.com/',
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  }

  try {
    // 服务端请求网易云外链，自动跟随 302 到 CDN 音频地址
    const upstream = await fetch(
      `https://music.163.com/song/media/outer/url?id=${id}.mp3`,
      {
        headers: NET_EASE_HEADERS,
        redirect: 'follow',
        signal: AbortSignal.timeout(15000),
      }
    )

    if (!upstream.ok) {
      return NextResponse.json({ error: `upstream ${upstream.status}` }, { status: upstream.status })
    }

    const contentType = upstream.headers.get('content-type') || 'audio/mpeg'

    // 转发音频流（支持 Range 请求由上游处理）
    return new NextResponse(upstream.body, {
      status: upstream.status,
      headers: {
        'Content-Type': contentType,
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=3600',
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch {
    return NextResponse.json({ error: 'stream failed' }, { status: 502 })
  }
}