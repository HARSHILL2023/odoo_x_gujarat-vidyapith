import React from 'react';

/**
 * ErrorBoundary — catches render errors in subtrees and shows a clean fallback.
 * Prevents the whole app from crashing when a single page has an error.
 */
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, info) {
        // Log to console in dev; send to error service in prod
        if (import.meta.env.DEV) {
            console.error('[ErrorBoundary]', error, info.componentStack);
        }
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }
            return (
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100%',
                    padding: '48px 24px',
                    gap: '16px',
                    textAlign: 'center',
                    color: 'var(--text-secondary)',
                    fontFamily: 'var(--font-body)',
                }}>
                    <div style={{ fontSize: 40 }}>⚠️</div>
                    <div style={{
                        fontSize: 16,
                        fontWeight: 700,
                        color: 'var(--text-primary)',
                        fontFamily: 'var(--font-heading)',
                    }}>
                        Something went wrong
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)', maxWidth: 320 }}>
                        {import.meta.env.DEV
                            ? this.state.error?.message
                            : 'An unexpected error occurred. Please try refreshing the page.'}
                    </div>
                    <button
                        onClick={this.handleReset}
                        style={{
                            marginTop: 8,
                            padding: '10px 20px',
                            background: 'var(--accent)',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 'var(--radius)',
                            fontSize: 13,
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'opacity 0.15s ease',
                        }}
                        onMouseOver={e => { e.target.style.opacity = '0.85'; }}
                        onMouseOut={e => { e.target.style.opacity = '1'; }}
                    >
                        Try Again
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

ErrorBoundary.defaultProps = {
    fallback: null,
};

export default ErrorBoundary;
