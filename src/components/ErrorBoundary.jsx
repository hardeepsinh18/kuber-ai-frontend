import React from 'react';

/**
 * React Error Boundary — catches render errors in child tree and shows
 * a safe fallback instead of crashing the whole app.
 */
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError() {
        return { hasError: true };
    }

    componentDidCatch(error, info) {
        if (typeof console !== 'undefined') {
            console.error('ErrorBoundary caught:', error, info?.componentStack);
        }
    }

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) return this.props.fallback;
            return (
                <div className="flex flex-col items-center gap-2 p-5 my-3 rounded-xl border border-rose-200 dark:border-rose-800/40 bg-rose-50 dark:bg-rose-950/20 text-sm text-rose-600 dark:text-rose-400">
                    <p className="font-medium">Something went wrong displaying this content.</p>
                    <button
                        onClick={() => this.setState({ hasError: false })}
                        className="text-xs underline hover:no-underline opacity-70 hover:opacity-100"
                    >
                        Try again
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
}

export default ErrorBoundary;
