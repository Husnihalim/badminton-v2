import { useState } from 'react'

export default function LoginPage() {
  const [count, setCount] = useState(0)

  return (
    <div style={{ padding: 40 }}>
      <h1>Test Login Page</h1>
      <p>Click count: {count}</p>
      <button 
        onClick={() => {
          console.log('Button clicked!')
          setCount(c => c + 1)
        }}
        style={{ padding: 20, fontSize: 18 }}
      >
        Click Me
      </button>
    </div>
  )
}
