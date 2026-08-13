'use client'

import { useState } from 'react'

export interface CaptchaProps {
  /** 算术题文本，例如 "3 + 5" */
  question: string
  /** 用户输入变化时回调，传入当前输入值 */
  onChange: (answer: string) => void
}

/**
 * 验证码组件
 *
 * 显示算术题 + 输入框，用户输入答案后通过 onChange 回调通知父组件。
 * 父组件负责校验答案是否正确。
 *
 * 使用示例：
 * ```tsx
 * const [captchaAnswer, setCaptchaAnswer] = useState('')
 * const [captchaQuestion, setCaptchaQuestion] = useState('3 + 5')
 *
 * <Captcha
 *   question={captchaQuestion}
 *   onChange={setCaptchaAnswer}
 * />
 * ```
 */
export default function Captcha({ question, onChange }: CaptchaProps) {
  const [value, setValue] = useState('')

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setValue(val)
    onChange(val)
  }

  return (
    <div className="flex items-center gap-3">
      {/* 算术题 */}
      <span
        className="inline-flex items-center px-3 py-2 rounded-lg text-sm font-mono whitespace-nowrap"
        style={{
          background: 'var(--accent-muted)',
          color: 'var(--accent)',
          border: '1px solid color-mix(in srgb, var(--accent) 20%, transparent)',
        }}
      >
        {question}
      </span>

      {/* 等号 */}
      <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
        =
      </span>

      {/* 输入框 */}
      <input
        type="text"
        value={value}
        onChange={handleChange}
        placeholder="?"
        className="glass-input w-20 text-center"
        aria-label="验证码答案"
        autoComplete="off"
      />
    </div>
  )
}