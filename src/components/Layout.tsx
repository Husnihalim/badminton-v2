import type { PropsWithChildren } from 'react'
import Navbar from './Navbar'
import FeedbackWidget from './FeedbackWidget'
import { TooltipProvider } from './ui/tooltip'

export default function Layout({ children }: PropsWithChildren) {
  return (
    <TooltipProvider>
      <div className="app-shell">
        <header className="app-layout">
          <Navbar />
        </header>
        <main className="app-layout">{children}</main>
        <FeedbackWidget />
      </div>
    </TooltipProvider>
  )
}
