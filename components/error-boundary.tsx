"use client"

import React from 'react'
import { ErrorReporter } from '@/lib/error-reporting'

interface ErrorBoundaryState {
    hasError: boolean
    error?: Error
    errorInfo?: React.ErrorInfo
}

interface ErrorBoundaryProps {
    children: React.ReactNode
    fallback?: React.ComponentType<{ error?: Error; reset: () => void }>
    name?: string
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
    private errorReporter: ErrorReporter

    constructor(props: ErrorBoundaryProps) {
        super(props)
        this.state = { hasError: false }
        this.errorReporter = ErrorReporter.getInstance()
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return {
            hasError: true,
            error,
        }
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        this.setState({ errorInfo })

        // Report the error automatically
        this.errorReporter.reportComponentError(
            this.props.name || 'Unknown Component',
            error,
            errorInfo
        )
    }

    reset = () => {
        this.setState({ hasError: false, error: undefined, errorInfo: undefined })
    }

    render() {
        if (this.state.hasError) {
            const FallbackComponent = this.props.fallback || DefaultErrorFallback
            return <FallbackComponent error={this.state.error} reset={this.reset} />
        }

        return this.props.children
    }
}

function DefaultErrorFallback({ error, reset }: { error?: Error; reset: () => void }) {
    return (
        <div className="w-full h-full flex items-center justify-center bg-red-50 border border-red-200 rounded-lg">
            <div className="text-center p-6">
                <div className="text-red-600 mb-4">
                    <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                </div>
                <h3 className="text-lg font-semibold text-red-800 mb-2">Something went wrong</h3>
                <p className="text-red-600 text-sm mb-4">
                    {error?.message || 'An unexpected error occurred'}
                </p>
                <button
                    onClick={reset}
                    className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                >
                    Try Again
                </button>
                <p className="text-xs text-red-500 mt-2">
                    Error reported automatically for debugging
                </p>
            </div>
        </div>
    )
} 