/**
 * Data Layer Error Boundary
 * 
 * Catches errors thrown by DataProvider or data layer operations
 * and displays a friendly fallback UI with retry option.
 */

import { Component, ReactNode, ErrorInfo } from 'react';
import { RefreshCw, AlertCircle } from 'lucide-react';
import { PrimaryButton } from './PrimaryButton';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class DataLayerErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error for debugging
    console.error('[DataLayerErrorBoundary] Caught error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo,
    });
  }

  handleRetry = () => {
    // Reset error state to re-mount DataProvider
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-background">
          <div className="max-w-md w-full card p-6 space-y-4 text-center">
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-destructive" />
              </div>
            </div>
            
            <div className="space-y-2">
              <h2 className="text-section" style={{ fontWeight: 600 }}>
                Data Layer Error
              </h2>
              <p className="text-caption text-secondary">
                Something went wrong while loading your data. Don't worry—your data is safe.
              </p>
            </div>

            {import.meta.env.DEV && this.state.error && (
              <div className="mt-4 p-3 bg-muted/50 rounded-lg text-left">
                <p className="text-micro text-secondary mb-1 font-mono">
                  {this.state.error.message || 'Unknown error'}
                </p>
                {this.state.errorInfo && (
                  <details className="mt-2">
                    <summary className="text-micro text-secondary cursor-pointer">
                      Stack trace
                    </summary>
                    <pre className="text-[10px] text-secondary mt-2 overflow-auto max-h-32">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </details>
                )}
              </div>
            )}

            <div className="pt-4">
              <PrimaryButton onClick={this.handleRetry} fullWidth>
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry
              </PrimaryButton>
            </div>

            <p className="text-micro text-secondary mt-4">
              If this persists, try refreshing the page or clearing your browser cache.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

