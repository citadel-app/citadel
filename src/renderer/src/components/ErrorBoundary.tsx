import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Icon } from './IconRegistry';
import { cn } from '../lib/utils';

interface Props {
    children?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
        errorInfo: null
    };

    public static getDerivedStateFromError(error: Error): State {
        // Update state so the next render will show the fallback UI.
        return { hasError: true, error, errorInfo: null };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        this.setState({
            error,
            errorInfo
        });
        console.error('Uncaught error:', error, errorInfo);
    }

    private handleReload = () => {
        window.location.reload();
    };

    private handleCopyError = () => {
        const details = {
            message: this.state.error?.message,
            stack: this.state.error?.stack,
            componentStack: this.state.errorInfo?.componentStack
        };
        navigator.clipboard.writeText(JSON.stringify(details, null, 2));
    };

    public render() {
        if (this.state.hasError) {
            return (
                <div className="fixed inset-0 flex items-center justify-center bg-background p-6 z-[1000]">
                    <div className="w-full max-w-2xl bg-card border border-border shadow-2xl rounded-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-8 border-b border-border bg-destructive/5 flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center text-destructive shrink-0">
                                <Icon name="AlertTriangle" size={24} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h1 className="text-xl font-bold text-foreground">:{"("} Citadel is down</h1>
                                <p className="text-sm text-muted-foreground truncate">
                                    {this.state.error?.message || 'An unexpected error occurred and the application crashed.'}
                                </p>
                            </div>
                        </div>

                        <div className="flex-1 overflow-auto p-8 bg-muted/30 font-mono text-[11px] selection:bg-primary/20">
                            <div className="space-y-4">
                                {this.state.error?.stack && (
                                    <div>
                                        <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Stack Trace</div>
                                        <pre className="whitespace-pre-wrap leading-relaxed opacity-80">{this.state.error.stack}</pre>
                                    </div>
                                )}
                                {this.state.errorInfo?.componentStack && (
                                    <div>
                                        <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Component Stack</div>
                                        <pre className="whitespace-pre-wrap leading-relaxed opacity-60">{this.state.errorInfo.componentStack}</pre>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="p-6 border-t border-border bg-muted/10 flex items-center justify-between gap-4">
                            <button
                                onClick={this.handleCopyError}
                                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border hover:bg-muted transition-colors text-sm font-medium"
                            >
                                <Icon name="Copy" size={14} />
                                Copy Error Details
                            </button>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => this.setState({ hasError: false })}
                                    className="px-4 py-2 rounded-lg border border-border hover:bg-muted transition-colors text-sm font-medium"
                                >
                                    Try Again
                                </button>
                                <button
                                    onClick={this.handleReload}
                                    className="flex items-center gap-2 px-6 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity text-sm font-medium shadow-sm"
                                >
                                    <Icon name="RefreshCw" size={14} />
                                    Reload App
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
