"use client"

import React, { useState, useEffect } from 'react'
import { AlertCircle, Bug, X, RefreshCw } from 'lucide-react'
import { ErrorReporter } from '@/lib/error-reporting'

interface ErrorReport {
    message: string
    stack?: string
    url: string
    userAgent: string
    timestamp: string
    componentStack?: string
    errorInfo?: any
}

export function DebugPanel() {
    const [isOpen, setIsOpen] = useState(false)
    const [errors, setErrors] = useState<ErrorReport[]>([])
    const [apiKeyStatus, setApiKeyStatus] = useState<string>('checking...')
    const [googleMapsStatus, setGoogleMapsStatus] = useState<string>('checking...')

    useEffect(() => {
        // Check API key status
        const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
        setApiKeyStatus(apiKey ? '✅ Present' : '❌ Missing')

        // Check Google Maps status
        const checkGoogleMaps = () => {
            if (typeof window !== 'undefined') {
                if (window.google?.maps) {
                    setGoogleMapsStatus('✅ Loaded')
                } else {
                    setGoogleMapsStatus('⏳ Loading...')
                    // Check again in 2 seconds
                    setTimeout(checkGoogleMaps, 2000)
                }
            }
        }
        checkGoogleMaps()

        // Load stored errors
        refreshErrors()
    }, [])

    const refreshErrors = () => {
        try {
            const errorReporter = ErrorReporter.getInstance()
            const storedErrors = errorReporter.getStoredErrors()
            setErrors(storedErrors)
        } catch (e) {
            console.error('Could not load stored errors:', e)
        }
    }

    const clearErrors = () => {
        try {
            const errorReporter = ErrorReporter.getInstance()
            errorReporter.clearStoredErrors()
            setErrors([])
        } catch (e) {
            console.error('Could not clear errors:', e)
        }
    }

    const testError = () => {
        // Intentionally trigger an error for testing
        throw new Error('Test error triggered from debug panel')
    }

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-4 right-4 z-50 p-3 bg-gray-800 text-white rounded-full shadow-lg hover:bg-gray-700 transition-colors"
                title="Open Debug Panel"
            >
                <Bug className="w-5 h-5" />
            </button>
        )
    }

    return (
        <div className="fixed bottom-4 right-4 z-50 w-96 max-h-96 bg-white border border-gray-300 rounded-lg shadow-xl overflow-hidden">
            <div className="flex items-center justify-between p-3 bg-gray-800 text-white">
                <div className="flex items-center gap-2">
                    <Bug className="w-4 h-4" />
                    <span className="font-medium">Debug Panel</span>
                </div>
                <button
                    onClick={() => setIsOpen(false)}
                    className="text-gray-300 hover:text-white"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>

            <div className="p-3 space-y-3 max-h-80 overflow-y-auto">
                {/* System Status */}
                <div className="space-y-2">
                    <h3 className="font-medium text-sm">System Status</h3>
                    <div className="text-xs space-y-1">
                        <div>API Key: {apiKeyStatus}</div>
                        <div>Google Maps: {googleMapsStatus}</div>
                        <div>Errors Captured: {errors.length}</div>
                    </div>
                </div>

                {/* Error List */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <h3 className="font-medium text-sm">Recent Errors</h3>
                        <div className="flex gap-1">
                            <button
                                onClick={refreshErrors}
                                className="p-1 text-gray-500 hover:text-gray-700"
                                title="Refresh"
                            >
                                <RefreshCw className="w-3 h-3" />
                            </button>
                            <button
                                onClick={clearErrors}
                                className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
                            >
                                Clear
                            </button>
                        </div>
                    </div>

                    {errors.length === 0 ? (
                        <div className="text-xs text-gray-500 p-2 bg-gray-50 rounded">
                            No errors captured yet
                        </div>
                    ) : (
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                            {errors.slice(-5).reverse().map((error, index) => (
                                <div key={index} className="p-2 bg-red-50 border border-red-200 rounded text-xs">
                                    <div className="flex items-start gap-2">
                                        <AlertCircle className="w-3 h-3 text-red-500 mt-0.5 flex-shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <div className="font-medium text-red-800 truncate">
                                                {error.message}
                                            </div>
                                            <div className="text-red-600 text-xs">
                                                {new Date(error.timestamp).toLocaleTimeString()}
                                            </div>
                                            {error.stack && (
                                                <details className="mt-1">
                                                    <summary className="cursor-pointer text-red-600 hover:text-red-800">
                                                        Stack trace
                                                    </summary>
                                                    <pre className="mt-1 text-xs text-red-600 whitespace-pre-wrap break-all">
                                                        {error.stack.split('\n').slice(0, 3).join('\n')}
                                                    </pre>
                                                </details>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Test Button */}
                <div className="pt-2 border-t">
                    <button
                        onClick={testError}
                        className="w-full px-3 py-2 text-xs bg-yellow-100 text-yellow-800 rounded hover:bg-yellow-200"
                    >
                        Test Error Reporting
                    </button>
                </div>
            </div>
        </div>
    )
} 