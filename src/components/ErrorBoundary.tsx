import { Component, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { logClientError } from "@/lib/errorLog";

interface State { err: Error | null }

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { err: null };
  static getDerivedStateFromError(err: Error) { return { err }; }
  componentDidCatch(err: Error, info: any) {
    console.error("ErrorBoundary", err, info);
    logClientError(err.message, err.stack || info?.componentStack);
  }
  reset = () => { this.setState({ err: null }); location.reload(); };
  render() {
    if (!this.state.err) return this.props.children;
    return (
      <div className="min-h-[100dvh] vault-bg grid place-items-center px-6 text-center">
        <div className="max-w-sm">
          <div className="text-[10px] uppercase tracking-[0.32em] text-mint-bright">Something broke</div>
          <h1 className="display text-3xl font-medium mt-3">Vault interrupted.</h1>
          <p className="text-sm text-muted-foreground mt-3">
            An unexpected error occurred. Your progress is safe.
          </p>
          <pre className="text-[10px] text-muted-foreground/60 mt-4 text-left overflow-auto max-h-32">
            {this.state.err.message}
          </pre>
          <Button onClick={this.reset} className="mt-6 mint-fill h-12 px-8 rounded-xl">
            Reload
          </Button>
        </div>
      </div>
    );
  }
}