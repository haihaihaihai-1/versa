import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import { Link } from 'react-router-dom'

interface State { hasError: boolean; error: Error | null }

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info)
  }

  reset = () => this.setState({ hasError: false, error: null })

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[60vh] flex items-center justify-center px-4">
          <div className="max-w-md w-full text-center">
            <div className="w-16 h-16 rounded-2xl bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-rose-500" />
            </div>
            <h1 className="text-2xl font-bold mb-2">出错了</h1>
            <p className="text-sm text-ink-500 mb-4">页面遇到意外错误，请重试或返回首页</p>
            {this.state.error && (
              <pre className="text-left p-3 rounded-xl bg-ink-50 dark:bg-ink-900 border border-ink-200 dark:border-ink-800 text-xs overflow-auto max-h-40 mb-4">
                {this.state.error.message}
              </pre>
            )}
            <div className="flex items-center gap-2 justify-center">
              <button
                onClick={this.reset}
                className="px-4 py-2 rounded-full bg-gradient-to-r from-violet-500 to-pink-500 text-white text-sm font-medium flex items-center gap-1.5"
              >
                <RefreshCw className="w-4 h-4" />重试
              </button>
              <Link to="/" className="px-4 py-2 rounded-full bg-ink-100 dark:bg-ink-800 text-sm font-medium flex items-center gap-1.5">
                <Home className="w-4 h-4" />首页
              </Link>
            </div>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
