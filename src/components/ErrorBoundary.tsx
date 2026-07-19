import { Component, type ReactNode } from 'react';

interface Props { children: ReactNode }
interface State { hasError: boolean }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error('TaskLock crashed:', error);
  }

  handleReset = () => {
    if (!window.confirm('Clear all TaskLock data and reload? Your tasks and habits will be lost.')) return;
    try {
      Object.keys(localStorage)
        .filter(k => k.startsWith('tl_'))
        .forEach(k => localStorage.removeItem(k));
    } catch { /* ignore */ }
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="min-h-screen max-w-md mx-auto flex flex-col items-center justify-center px-8 text-center" style={{ background: '#0a0a0f' }}>
        <div className="text-5xl mb-4">😵</div>
        <h1 className="text-xl font-bold text-white mb-2">Something went wrong</h1>
        <p className="text-white/40 text-sm leading-relaxed mb-8">
          TaskLock hit an unexpected error. Reloading usually fixes it — your data is saved on this device.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="w-full py-4 rounded-2xl bg-[#FF6B35] text-white font-semibold text-sm active:scale-95 transition-transform"
        >
          Reload App
        </button>
        <button
          onClick={this.handleReset}
          className="mt-3 py-2 text-xs text-white/30 hover:text-white/60"
        >
          Still broken? Clear data &amp; reload
        </button>
      </div>
    );
  }
}
