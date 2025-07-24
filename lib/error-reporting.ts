interface ErrorReport {
    message: string
    stack?: string
    url: string
    userAgent: string
    timestamp: string
    componentStack?: string
    errorInfo?: any
}

export class ErrorReporter {
    private static instance: ErrorReporter
    // Using a real webhook service for monitoring
    private webhookUrl = 'https://eoxwps6hpxnqb9x.m.pipedream.net'

    public static getInstance(): ErrorReporter {
        if (!ErrorReporter.instance) {
            ErrorReporter.instance = new ErrorReporter()
        }
        return ErrorReporter.instance
    }

    private constructor() {
        // Set up global error handlers
        if (typeof window !== 'undefined') {
            window.addEventListener('error', this.handleGlobalError.bind(this))
            window.addEventListener('unhandledrejection', this.handleUnhandledRejection.bind(this))

            // Also log to localStorage as backup
            console.log('🔍 Error Reporter initialized - all errors will be tracked')
        }
    }

    private handleGlobalError(event: ErrorEvent) {
        this.reportError({
            message: event.message,
            stack: event.error?.stack,
            url: window.location.href,
            userAgent: navigator.userAgent,
            timestamp: new Date().toISOString(),
        })
    }

    private handleUnhandledRejection(event: PromiseRejectionEvent) {
        this.reportError({
            message: `Unhandled Promise Rejection: ${event.reason}`,
            stack: event.reason?.stack,
            url: window.location.href,
            userAgent: navigator.userAgent,
            timestamp: new Date().toISOString(),
        })
    }

    public reportError(error: Partial<ErrorReport>) {
        const report: ErrorReport = {
            message: error.message || 'Unknown error',
            stack: error.stack,
            url: error.url || (typeof window !== 'undefined' ? window.location.href : 'unknown'),
            userAgent: error.userAgent || (typeof window !== 'undefined' ? navigator.userAgent : 'unknown'),
            timestamp: error.timestamp || new Date().toISOString(),
            componentStack: error.componentStack,
            errorInfo: error.errorInfo,
        }

        // Enhanced console logging
        console.group('🚨 ERROR REPORT')
        console.error('Message:', report.message)
        console.error('Stack:', report.stack)
        console.error('URL:', report.url)
        console.error('Time:', report.timestamp)
        if (report.errorInfo) {
            console.error('Additional Info:', report.errorInfo)
        }
        console.groupEnd()

        // Store in localStorage as backup
        if (typeof window !== 'undefined') {
            try {
                const stored = localStorage.getItem('home-finder-errors') || '[]'
                const errors = JSON.parse(stored)
                errors.push(report)
                // Keep only last 10 errors
                if (errors.length > 10) {
                    errors.splice(0, errors.length - 10)
                }
                localStorage.setItem('home-finder-errors', JSON.stringify(errors))
            } catch (e) {
                console.warn('Could not store error in localStorage:', e)
            }
        }

        // Send to webhook (non-blocking)
        this.sendToWebhook(report).catch(console.error)
    }

    private async sendToWebhook(report: ErrorReport) {
        try {
            const response = await fetch(this.webhookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    source: 'Home Finder App',
                    error: report,
                    app_url: window.location.href,
                }),
            })

            if (response.ok) {
                console.log('✅ Error report sent successfully')
            } else {
                console.warn('⚠️ Error report failed to send:', response.status)
            }
        } catch (error) {
            console.error('❌ Failed to send error report:', error)
        }
    }

    public reportMapError(context: string, error: any) {
        this.reportError({
            message: `Google Maps Error in ${context}: ${error.message || error}`,
            stack: error.stack,
            errorInfo: { context, error },
        })
    }

    public reportComponentError(componentName: string, error: any, errorInfo?: any) {
        this.reportError({
            message: `React Component Error in ${componentName}: ${error.message || error}`,
            stack: error.stack,
            componentStack: errorInfo?.componentStack,
            errorInfo: { componentName, error, errorInfo },
        })
    }

    // Method to retrieve stored errors for debugging
    public getStoredErrors(): ErrorReport[] {
        if (typeof window === 'undefined') return []
        try {
            const stored = localStorage.getItem('home-finder-errors') || '[]'
            return JSON.parse(stored)
        } catch (e) {
            return []
        }
    }

    // Method to clear stored errors
    public clearStoredErrors(): void {
        if (typeof window !== 'undefined') {
            localStorage.removeItem('home-finder-errors')
            console.log('🧹 Stored errors cleared')
        }
    }
} 