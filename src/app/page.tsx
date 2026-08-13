'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import ProfileCard from '@/components/home/profile-card'
import MusicPlayer from '@/components/home/music-player'
import AlbumShowcase from '@/components/home/album-showcase'

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
}

const item = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.21, 0.47, 0.32, 0.98] as const } },
}

interface RawPost {
  id: number
  slug: string
  title: string
  excerpt?: string | null
  cover?: string | null
  category?: string | null
  views: number
  createdAt: string
}

interface Track {
  name: string
  artist: string
  url: string
}

export default function HomePage() {
  const router = useRouter()
  const [latestPosts, setLatestPosts] = useState<RawPost[]>([])
  const [postsLoading, setPostsLoading] = useState(true)
  const [musicTracks, setMusicTracks] = useState<Track[]>([])
  const [cloudIds, setCloudIds] = useState<string[]>([])
  const [settingsLoaded, setSettingsLoaded] = useState(false)

  useEffect(() => {
    fetch('/api/posts?pageSize=3')
      .then((res) => res.json())
      .then((data) => { if (data.posts) setLatestPosts(data.posts) })
      .catch(() => {})
      .finally(() => setPostsLoading(false))

    fetch('/api/settings')
      .then((res) => res.json())
      .then((data) => {
        if (data.settings?.music_list) {
          try {
            const parsed = JSON.parse(data.settings.music_list)
            if (Array.isArray(parsed)) setMusicTracks(parsed)
          } catch { /* ignore */ }
        }
        if (data.settings?.music_cloud_ids) {
          setCloudIds(data.settings.music_cloud_ids.split(',').map((s: string) => s.trim()).filter(Boolean))
        }
      })
      .catch(() => {})
      .finally(() => setSettingsLoaded(true))
  }, [])

  return (
    <div className="w-full">
      <div className="content-container">
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="flex flex-col gap-7"
        >
          {/* ① Hero 名片区（居中精致） */}
          <motion.div variants={item}>
            <ProfileCard />
          </motion.div>

          {/* ② 音乐 + 相册（等高双卡） */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-7 items-stretch">
            <motion.div variants={item} className="h-full">
              <MusicPlayer cloudIds={cloudIds} />
            </motion.div>
            <motion.div variants={item} className="h-full">
              <AlbumShowcase />
            </motion.div>
          </div>

          {/* ③ 最新文章（横向卡片，整卡点击进入博客） */}
          <motion.div variants={item}>
            <div
              className="glass-card glass-card-hover p-6 transition-all duration-500 cursor-pointer"
              data-tilt
              onClick={() => router.push('/blog')}
            >
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} style={{ color: 'var(--accent)' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                    </svg>
                    最新文章
                  </h2>
                  <Link href="/blog" className="text-[11px] hover:opacity-70 transition-opacity flex items-center gap-1" style={{ color: 'var(--accent)' }} onClick={(e) => e.stopPropagation()}>
                    全部
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                    </svg>
                  </Link>
                </div>

                {postsLoading ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="rounded-xl overflow-hidden" style={{ background: 'var(--glass-bg)' }}>
                        <div className="h-24 bg-white/20 animate-pulse" />
                        <div className="p-4 space-y-2">
                          <div className="h-3 bg-white/20 rounded w-3/4 animate-pulse" />
                          <div className="h-2 bg-white/20 rounded w-1/2 animate-pulse" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : latestPosts.length === 0 ? (
                  <div className="flex items-center justify-center py-10">
                    <div className="text-center">
                      <svg className="w-8 h-8 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1} style={{ color: 'var(--text-secondary)' }}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                      </svg>
                      <p className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>还没有文章，敬请期待</p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {latestPosts.map((post) => (
                      <Link
                        key={post.id}
                        href={`/blog/${post.slug}`}
                        className="group rounded-xl overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
                        style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {/* 封面 */}
                        <div className="relative h-28 overflow-hidden">
                          {post.cover ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={post.cover}
                              alt={post.title}
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center" style={{ background: 'var(--accent-muted)', color: 'var(--accent)' }}>
                              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                              </svg>
                            </div>
                          )}
                          {post.category && (
                            <span className="absolute top-2 left-2 px-2 py-0.5 text-[10px] font-medium rounded-full backdrop-blur-md"
                              style={{ background: 'rgba(0,0,0,0.45)', color: '#fff' }}
                            >
                              {post.category}
                            </span>
                          )}
                        </div>
                        {/* 内容 */}
                        <div className="p-4">
                          <h3 className="text-sm font-medium leading-snug line-clamp-1 transition-colors group-hover:text-[color:var(--accent)]" style={{ color: 'var(--text-primary)' }}>
                            {post.title}
                          </h3>
                          <div className="flex items-center justify-between mt-2 text-[10px]" style={{ color: 'var(--text-secondary)' }}>
                            <span>{new Date(post.createdAt).toLocaleDateString('zh-CN')}</span>
                            <span className="flex items-center gap-1">
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                              {post.views}
                            </span>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  )
}
