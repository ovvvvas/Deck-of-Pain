import { Component, StrictMode, type ErrorInfo, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App.tsx';
import './index.css';

if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  try {
    registerSW({
      immediate: true,
      onRegisterError() {
        // Ignore service worker registration errors in unsupported/restricted contexts
      },
    });
  } catch {
    // Ignore synchronous registration errors
  }
}

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

class RootErrorBoundary extends Component<
  { children: ReactNode },
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false, message: '' };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error?.message || 'Unexpected rendering error',
    };
  }

  componentDidCatch(_error: Error, _info: ErrorInfo) {}

  handleReset = () => {
    try {
      localStorage.removeItem('dop-sess');
      localStorage.removeItem('dop-set');
    } catch {
      // Ignore storage errors
    }
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '100dvh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            background: '#0b121c',
            color: '#f2f6fc',
          }}
        >
          <div
            style={{
              maxWidth: '420px',
              width: '100%',
              background: '#131d2d',
              border: '1px solid rgba(148,179,214,0.2)',
              borderRadius: '16px',
              padding: '24px',
            }}
          >
            <h1 style={{ margin: '0 0 8px', fontSize: '20px', fontWeight: 700 }}>
              Unable to render Deck of Pain
            </h1>
            <p style={{ margin: '0 0 16px', fontSize: '14px', opacity: 0.8 }}>
              {this.state.message}
            </p>
            <button
              type="button"
              onClick={this.handleReset}
              style={{
                background: '#ff6b3d',
                color: '#ffffff',
                border: 'none',
                borderRadius: '10px',
                padding: '10px 16px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Reset session &amp; reload
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RootErrorBoundary>
      <App />
    </RootErrorBoundary>
  </StrictMode>
);
