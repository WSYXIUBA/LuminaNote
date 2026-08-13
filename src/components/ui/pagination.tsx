'use client'

import Link from 'next/link'

export interface PaginationProps {
  currentPage: number
  totalPages: number
  basePath: string
}

export default function Pagination({
  currentPage,
  totalPages,
  basePath,
}: PaginationProps) {
  if (totalPages <= 1) return null

  const getPageUrl = (page: number) => {
    const separator = basePath.includes('?') ? '&' : '?'
    return `${basePath}${separator}page=${page}`
  }

  /** 生成显示的页码，首尾固定，当前页前后各显示 1 页 */
  const getPageNumbers = (): (number | 'ellipsis')[] => {
    const pages: (number | 'ellipsis')[] = [1]
    const delta = 1

    const start = Math.max(2, currentPage - delta)
    const end = Math.min(totalPages - 1, currentPage + delta)

    if (start > 2) pages.push('ellipsis')

    for (let i = start; i <= end; i++) {
      pages.push(i)
    }

    if (end < totalPages - 1) pages.push('ellipsis')

    if (totalPages > 1) pages.push(totalPages)

    return pages
  }

  const pageNumbers = getPageNumbers()

  return (
    <nav className="flex items-center justify-center gap-2" aria-label="分页导航">
      {/* 上一页 */}
      {currentPage > 1 ? (
        <Link
          href={getPageUrl(currentPage - 1)}
          className="btn-ghost px-3 py-2 text-sm"
          aria-label="上一页"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.75 19.5L8.25 12l7.5-7.5"
            />
          </svg>
          <span className="hidden sm:inline">上一页</span>
        </Link>
      ) : (
        <span
          className="inline-flex items-center gap-1 px-3 py-2 text-sm rounded-full opacity-40 cursor-not-allowed"
          style={{ color: 'var(--text-secondary)' }}
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.75 19.5L8.25 12l7.5-7.5"
            />
          </svg>
          <span className="hidden sm:inline">上一页</span>
        </span>
      )}

      {/* 页码 */}
      <div className="flex items-center gap-1">
        {pageNumbers.map((page, idx) =>
          page === 'ellipsis' ? (
            <span
              key={`ellipsis-${idx}`}
              className="inline-flex items-center justify-center w-9 h-9 text-sm"
              style={{ color: 'var(--text-secondary)' }}
            >
              ...
            </span>
          ) : (
            <Link
              key={page}
              href={getPageUrl(page)}
              className="inline-flex items-center justify-center w-9 h-9 text-sm rounded-full transition-all duration-200"
              style={{
                background:
                  page === currentPage ? 'var(--accent)' : 'var(--glass-bg)',
                color: page === currentPage ? '#fff' : 'var(--text-primary)',
                border:
                  page === currentPage
                    ? 'none'
                    : '1px solid var(--glass-border)',
              }}
              aria-current={page === currentPage ? 'page' : undefined}
            >
              {page}
            </Link>
          )
        )}
      </div>

      {/* 下一页 */}
      {currentPage < totalPages ? (
        <Link
          href={getPageUrl(currentPage + 1)}
          className="btn-ghost px-3 py-2 text-sm"
          aria-label="下一页"
        >
          <span className="hidden sm:inline">下一页</span>
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8.25 4.5l7.5 7.5-7.5 7.5"
            />
          </svg>
        </Link>
      ) : (
        <span
          className="inline-flex items-center gap-1 px-3 py-2 text-sm rounded-full opacity-40 cursor-not-allowed"
          style={{ color: 'var(--text-secondary)' }}
        >
          <span className="hidden sm:inline">下一页</span>
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8.25 4.5l7.5 7.5-7.5 7.5"
            />
          </svg>
        </span>
      )}
    </nav>
  )
}