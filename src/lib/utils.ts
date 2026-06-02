import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getErrorMessage(err: unknown, fallback = 'An unexpected error occurred') {
  if (err instanceof Error) return err.message
  if (typeof err === 'string') return err
  if (typeof err === 'object' && err !== null) {
    const errorObj = err as Record<string, unknown>
    if (typeof errorObj.message === 'string' && errorObj.message.length) return errorObj.message
    if (typeof errorObj.error === 'string' && errorObj.error.length) return errorObj.error
    if (typeof errorObj.msg === 'string' && errorObj.msg.length) return errorObj.msg
    if (typeof errorObj.details === 'string' && errorObj.details.length) return errorObj.details
    if (typeof errorObj.hint === 'string' && errorObj.hint.length) return errorObj.hint
    if (typeof errorObj.code === 'string' && errorObj.code.length) return errorObj.code
  }
  return fallback
}

export function isMissingRpcFunctionError(err: unknown, functionName: string): boolean {
  if (typeof err !== 'object' || err === null) return false
  const errorObj = err as Record<string, unknown>
  const messageParts = [
    typeof errorObj.message === 'string' ? errorObj.message : '',
    typeof errorObj.error === 'string' ? errorObj.error : '',
    typeof errorObj.details === 'string' ? errorObj.details : '',
    typeof errorObj.hint === 'string' ? errorObj.hint : '',
  ]
  const message = messageParts.filter(Boolean).join(' ').trim()

  if (errorObj.code === 'PGRST202') return true
  if (!message.length) return false

  return message.toLowerCase().includes(functionName.toLowerCase())
    && /does not exist|not found|undefined|missing|cannot call/i.test(message.toLowerCase())
}
