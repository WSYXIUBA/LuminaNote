import { prisma } from './db'

// 生成算术验证码
export function generateCaptcha() {
  const a = Math.floor(Math.random() * 9) + 1
  const b = Math.floor(Math.random() * 9) + 1
  const ops = ['+', '-', '×'] as const
  const op = ops[Math.floor(Math.random() * ops.length)]
  let answer: number
  switch (op) {
    case '+': answer = a + b; break
    case '-': answer = a - b; break
    case '×': answer = a * b; break
  }
  return { question: `${a} ${op} ${b} = ?`, answer }
}

// 验证答案
export function verifyCaptcha(question: string, userAnswer: string): boolean {
  const match = question.match(/(\d+)\s*([+\-×])\s*(\d+)/)
  if (!match) return false
  const a = parseInt(match[1])
  const b = parseInt(match[3])
  const op = match[2]
  let expected: number
  switch (op) {
    case '+': expected = a + b; break
    case '-': expected = a - b; break
    case '×': expected = a * b; break
    default: return false
  }
  return parseInt(userAnswer) === expected
}