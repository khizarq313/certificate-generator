import { Component, type ErrorInfo, type ReactNode } from 'react';

interface State { hasError: boolean; }

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State { return { hasError: true }; }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('CertifyX encountered an unexpected error.', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return <main className="errorBoundary"><h1 tabIndex={-1}>Something went wrong</h1><p>Your saved draft is still in this browser. Reload to continue.</p><button className="primary" onClick={() => window.location.reload()}>Reload CertifyX</button></main>;
    }
    return this.props.children;
  }
}
