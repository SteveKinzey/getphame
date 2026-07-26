import { cn } from "@/lib/utils";
import { AlertTriangle, RefreshCw, Home, Copy, Check } from "lucide-react";
import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  copied: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, copied: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, copied: false };
  }

  componentDidCatch(error: Error) {
    this.props.onError?.(error);
  }

  copyErrorDetails() {
    if (!this.state.error) return;
    const details = [
      `Error: ${this.state.error.message}`,
      `Stack: ${this.state.error.stack ?? "N/A"}`,
      `URL: ${window.location.href}`,
      `Time: ${new Date().toISOString()}`,
      `UA: ${navigator.userAgent}`,
    ].join("\n\n");
    navigator.clipboard.writeText(details).then(() => {
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2500);
    });
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div
          className="flex items-center justify-center min-h-screen p-8"
          style={{ background: "oklch(0.22 0.09 260)" }}
        >
          <div className="flex flex-col items-center w-full max-w-md text-center">
            <img
              src="https://assets.getphame.app/getphame-logo-mark.webp"
              alt="Get Phame"
              className="w-16 h-16 mb-6 opacity-90"
            />
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center mb-5"
              style={{ background: "oklch(0.30 0.09 260)" }}
            >
              <AlertTriangle size={28} style={{ color: "oklch(0.80 0.18 80)" }} />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Something went wrong</h2>
            <p className="text-sm mb-8" style={{ color: "oklch(0.75 0.05 260)" }}>
              An unexpected error occurred. Try reloading the page — if the problem persists, contact support.
            </p>
            {import.meta.env.DEV && this.state.error && (
              <div
                className="w-full p-3 rounded-lg mb-6 text-left overflow-auto max-h-40"
                style={{ background: "oklch(0.17 0.07 260)" }}
              >
                <pre className="text-xs" style={{ color: "oklch(0.65 0.05 260)" }}>
                  {this.state.error.message}
                </pre>
              </div>
            )}
            <div className="flex flex-col items-center gap-3 w-full">
              <div className="flex gap-3">
              <button
                onClick={() => window.location.reload()}
                className={cn("flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-95")}
                style={{ background: "oklch(0.80 0.18 80)", color: "oklch(0.22 0.09 260)" }}
              >
                <RefreshCw size={15} />
                Reload Page
              </button>
              <button
                onClick={() => { window.location.href = "/"; }}
                className={cn("flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-95")}
                style={{ background: "oklch(0.30 0.09 260)", color: "white" }}
              >
                <Home size={15} />
                Go Home
              </button>
            </div>
              {this.state.error && (
                <button
                  onClick={() => this.copyErrorDetails()}
                  className={cn("flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all active:scale-95")}
                  style={{ background: "oklch(0.17 0.07 260)", color: "oklch(0.65 0.05 260)" }}
                >
                  {this.state.copied ? <Check size={14} /> : <Copy size={14} />}
                  {this.state.copied ? "Copied to clipboard!" : "Copy Error Details"}
                </button>
              )}
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
