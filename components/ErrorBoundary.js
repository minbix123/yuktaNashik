import React from 'react'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    // You can also log the error to an error reporting service
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    this.setState({ error, errorInfo })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="rounded-lg border border-red-200 bg-red-50 p-6 dark:border-red-800 dark:bg-red-900/20"
          role="alert"
          aria-live="assertive"
        >
          <h2 className="mb-4 text-lg font-medium text-red-800 dark:text-red-200">
            Something went wrong.
          </h2>
          <details className="mt-4 space-y-2 text-sm">
            <summary className="cursor-pointer rounded text-red-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700 dark:text-red-300">
              Show details
            </summary>
            <div className="space-y-1 text-red-700 dark:text-red-400">
              <p>{this.state.error && this.state.error.toString()}</p>
              {this.state.errorInfo && <p>{this.state.errorInfo.componentStack}</p>}
            </div>
          </details>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
