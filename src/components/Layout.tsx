import type { PropsWithChildren } from 'react'
import Navbar from './Navbar'

export default function Layout({ children }: PropsWithChildren) {
  return (
    <div className="app-shell">
      <header className="app-layout">
        <Navbar />
      </header>
      <main className="app-layout">{children}</main>
    </div>
  )
}
