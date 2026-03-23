'use client';

// Module 8/9 — Dashboard Error Boundary
// Prevents a crash in GoalStrategyPanel, StrategyCanvas, or AIChatPanel
// from unmounting the entire dashboard shell.
//
// Usage:
//   <DashboardErrorBoundary label="Strategy Engine">
//     <GoalStrategyPanel ... />
//   </DashboardErrorBoundary>

import React from 'react';

interface Props {
    children: React.ReactNode;
    label?: string; // Descriptive name for the error log
    fallback?: React.ReactNode; // Optional custom fallback UI
}

interface State {
    hasError: boolean;
    errorMessage: string;
}

export class DashboardErrorBoundary extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, errorMessage: '' };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, errorMessage: error.message || 'Unknown error' };
    }

    componentDidCatch(error: Error, info: React.ErrorInfo) {
        console.error(
            `[DashboardErrorBoundary] ${this.props.label ?? 'Panel'} crashed:`,
            error.message,
            info.componentStack
        );
    }

    handleReset = () => {
        this.setState({ hasError: false, errorMessage: '' });
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div
                    role="alert"
                    className="fixed inset-0 z-[200] flex items-center justify-center bg-black/30 backdrop-blur-sm"
                    onClick={this.handleReset}
                >
                    <div
                        className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full mx-4 text-center"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-rose-50 flex items-center justify-center">
                            <span className="material-symbols-outlined text-2xl text-rose-500">error</span>
                        </div>
                        <h3 className="text-base font-bold text-slate-800 mb-1">
                            {this.props.label ?? 'Panel'} encountered an error
                        </h3>
                        <p className="text-xs text-slate-500 mb-5 leading-relaxed">
                            {this.state.errorMessage || 'An unexpected error occurred. Your dashboard data is safe.'}
                        </p>
                        <button
                            onClick={this.handleReset}
                            className="w-full px-4 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 transition-colors"
                        >
                            Dismiss &amp; Retry
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default DashboardErrorBoundary;
