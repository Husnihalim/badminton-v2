import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <section className="section-card" style={{ textAlign: 'center' }}>
          <h1 className="page-title">Something went wrong</h1>
          <p style={{ color: '#64748b', marginBottom: '24px' }}>
            An unexpected error occurred. Please try refreshing the page.
          </p>
          <button
            className="brand-button"
            onClick={() => window.location.reload()}
          >
            Refresh page
          </button>
        </section>
      )
    }

    return this.props.children
  }
}
