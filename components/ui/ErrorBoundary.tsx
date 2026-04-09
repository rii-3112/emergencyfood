"use client";

import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className='flex flex-col items-center justify-center min-h-[200px] p-8'>
            <div className='text-center'>
              <h2 className='text-xl font-semibold text-gray-900 mb-2'>
                エラーが発生しました
              </h2>
              <p className='text-gray-600 mb-4'>
                申し訳ございませんが、予期しないエラーが発生しました。
              </p>
              <button
                className='px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors'
                onClick={() => this.setState({ hasError: false })}
              >
                再試行
              </button>
            </div>
          </div>
        )
      );
    }

    return this.props.children;
  }
}
