"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = { children: ReactNode };
type State = { hasError: boolean };

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("UI error boundary:", error.message, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="handoff-page hive">
          <div className="handoff-inner">
            <header className="page-header">
              <span className="eyebrow">NSOffice.AI</span>
              <h1>Something went wrong</h1>
              <p>
                Your session data may still be saved in this browser. Refresh
                the page, or open the handoff if a summary was already captured.
              </p>
            </header>
            <div className="handoff-actions">
              <a className="btn btn-primary" href="/intake">
                Back to intake
              </a>
              <a className="btn btn-secondary" href="/handoff">
                Open handoff
              </a>
            </div>
          </div>
        </main>
      );
    }
    return this.props.children;
  }
}
