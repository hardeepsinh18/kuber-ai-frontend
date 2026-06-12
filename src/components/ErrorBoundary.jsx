import React from 'react';

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
                <div className="flex flex-col h-full w-full items-center justify-center"
                     style={{ background: 'linear-gradient(160deg, rgba(253,212,5,0.04) 0%, transparent 45%), #121315' }}>
                    <div style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
                        padding: '32px 40px', borderRadius: 16,
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(253,212,5,0.18)',
                    }}>
                        <div style={{ fontSize: 32 }}>⚠️</div>
                        <p style={{ color: '#e4e4e7', fontSize: 14, fontWeight: 500, textAlign: 'center', margin: 0 }}>
                            Something went wrong loading this chat.
                        </p>
                        <p style={{ color: '#71717a', fontSize: 12, textAlign: 'center', margin: 0 }}>
                            This can happen with older chats. Try refreshing or start a new chat.
                        </p>
                        <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                            <button
                                onClick={() => this.setState({ hasError: false })}
                                style={{
                                    padding: '8px 20px', background: '#FDD405', border: 'none',
                                    borderRadius: 8, fontSize: 13, fontWeight: 600, color: '#111',
                                    cursor: 'pointer',
                                }}>
                                Try again
                            </button>
                            <button
                                onClick={() => { this.setState({ hasError: false }); window.location.href = '/'; }}
                                style={{
                                    padding: '8px 20px', background: 'transparent',
                                    border: '1px solid rgba(253,212,5,0.25)',
                                    borderRadius: 8, fontSize: 13, fontWeight: 500, color: '#a1a1aa',
                                    cursor: 'pointer',
                                }}>
                                New chat
                            </button>
                        </div>
                    </div>
                </div>
            );
        }
        return this.props.children;
    }
}

export default ErrorBoundary;
