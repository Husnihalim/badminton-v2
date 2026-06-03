import type { PropsWithChildren } from 'react'
import Navbar from './Navbar'
import FeedbackWidget from './FeedbackWidget'

export default function Layout({ children }: PropsWithChildren) {
  return (
    <div className="app-shell">
      <header className="app-layout">
        <Navbar />
      </header>
      <main className="app-layout">{children}</main>
      <FeedbackWidget />
    </div>
  )
}
