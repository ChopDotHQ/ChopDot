/**
 * ScreenErrorBoundary
 *
 * Mid-level error boundary that wraps the screen router.
 * Catches render errors in individual screens without crashing the whole app.
 * Auto-resets when `resetKey` changes (i.e. when the user navigates away).
 */

import { Component, ReactNode, ErrorInfo } from 'react';
import { RefreshCw, AlertTriangle, ChevronLeft } from 'lucide-react';

interface Props {
  children: ReactNode;
  onGoBack?: () => void;
  resetKey?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  lastResetKey: string | undefined;
}

export class ScreenErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, lastResetKey: props.resetKey };
  }

  /** Auto-reset when navigation changes so crashes don't persist across screens. */
  static getDerivedStateFromProps(props: Props, state: State): Partial<State> | null {
    if (props.resetKey !== state.lastResetKey) {
      if (state.hasError) {
        return { hasError: false, error: null, lastResetKey: props.resetKey };
      }
      return { lastResetKey: props.resetKey };
    }
    return null;
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ScreenErrorBoundary] Screen crash:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-6 bg-background">
          <div className="max-w-sm w-full text-center space-y-4">
            <div
              className="w-14 h-14 mx-auto rounded-2xl flex items-center justify-center"
              style={{ background: 'color-mix(in srgb, var(--destructive) 12%, transparent)' }}
            >
              <AlertTriangle className="w-7 h-7" style={{ color: 'var(--destructive)' }} />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-section" style={{ fontWeight: 600 }}>
                Something went wrong
              </h2>
              <p className="text-caption text-secondary">
                This screen ran into a problem. Your data is safe — go back or reload to continue.
              </p>
            </div>

            {import.meta.env.DEV && this.state.error && (
              <div className="p-3 rounded-xl text-left" style={{ background: 'var(--muted)' }}>
                <p className="text-micro font-mono text-secondary break-all leading-relaxed">
                  {this.state.error.message}
                </p>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              {this.props.onGoBack && (
                <button
                  onClick={this.props.onGoBack}
                  className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl border border-border text-caption transition-colors active:scale-95 cursor-pointer"
                  style={{ fontWeight: 500 }}
                >
                  <ChevronLeft className="w-4 h-4" />
                  Go back
                </button>
              )}
              <button
                onClick={() => window.location.reload()}
                className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl text-white text-caption transition-all active:scale-95 cursor-pointer"
                style={{ background: 'var(--accent)', fontWeight: 500 }}
              >
                <RefreshCw className="w-4 h-4" />
                Reload
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
