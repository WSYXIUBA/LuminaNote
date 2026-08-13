'use client'

import { ThemeProvider } from '@/lib/theme-context'
import { WallpaperProvider } from '@/lib/wallpaper-context'
import { EffectsProvider } from '@/lib/effects-context'
import { MusicProvider } from '@/lib/music-context'
import { WallpaperRenderer } from '@/components/layout/wallpaper-renderer'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <WallpaperProvider>
        <EffectsProvider>
          <MusicProvider>
            <WallpaperRenderer />
            {children}
          </MusicProvider>
        </EffectsProvider>
      </WallpaperProvider>
    </ThemeProvider>
  )
}