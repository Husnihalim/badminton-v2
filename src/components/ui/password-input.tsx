import { Eye, EyeOff } from 'lucide-react'
import { useState } from 'react'
import type { ComponentProps } from 'react'
import { Input } from './input'
import { Button } from './button'

type PasswordInputProps = Omit<ComponentProps<typeof Input>, 'type'>

export function PasswordInput(props: PasswordInputProps) {
  const [isVisible, setIsVisible] = useState(false)

  return (
    <div className="relative">
      <Input
        {...props}
        type={isVisible ? 'text' : 'password'}
        className={`pr-12 ${props.className || ''}`}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="absolute right-0 top-0 h-full min-h-0 w-11 rounded-l-none"
        onClick={() => setIsVisible((value) => !value)}
        aria-label={isVisible ? 'Hide characters' : 'Show characters'}
        tabIndex={-1}
      >
        {isVisible ? <EyeOff size={17} aria-hidden="true" /> : <Eye size={17} aria-hidden="true" />}
      </Button>
    </div>
  )
}
