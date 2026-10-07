import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught Error in Route Boundary:', error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 my-8 bg-red-50 border border-red-200 rounded-2xl text-center max-w-lg mx-auto shadow-sm">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-[#E4572E]">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">
            Oups ! Une erreur est survenue sur cette page.
          </h3>
          <p className="text-xs text-gray-600 mb-6 bg-white p-3 rounded-lg border border-red-100 font-mono text-left overflow-x-auto">
            {this.state.error?.message || 'Erreur d affichage inconnue.'}
          </p>
          <button
            onClick={this.handleRetry}
            className="btn-primary"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Réessayer</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
