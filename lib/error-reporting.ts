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
    private webhookUrl = 'https://webhook.site/#!/df8b6c45-7a1b-4c7a-9c2e-8f3d4e5f6a7b/dbe9e7e6-7a5c-4b3d-9e8f-1a2b3c4d5e6f'

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

        // Log to console for debugging
        console.error('Error Report:', report)

        // Send to webhook (non-blocking)
        this.sendToWebhook(report).catch(console.error)
    }

    private async sendToWebhook(report: ErrorReport) {
        try {
            await fetch(this.webhookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(report),
            })
        } catch (error) {
            console.error('Failed to send error report:', error)
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
} 