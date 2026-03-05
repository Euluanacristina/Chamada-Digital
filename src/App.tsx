import React, { Component, ErrorInfo, ReactNode } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Layout } from './components/layout';
import Dashboard from './pages/Dashboard';
import Turmas from './pages/Turmas';
import Alunos from './pages/Alunos';
import Chamada from './pages/Chamada';
import Historico from './pages/Historico';
import Relatorios from './pages/Relatorios';
import { useUIStore } from './store/uiStore';
import { X, CheckCircle, AlertCircle, Info, RefreshCw } from 'lucide-react';
import { cn, Button } from './components/ui';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-paper flex items-center justify-center p-6">
          <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center">
            <div className="w-16 h-16 bg-red-bg text-red-text rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-10 h-10" />
            </div>
            <h1 className="text-2xl font-display font-bold text-gray-900 mb-2">Oops! Something went wrong.</h1>
            <p className="text-gray-500 mb-8">
              An unexpected error occurred in the application. Try reloading the page.
            </p>
            <div className="space-y-3">
              <Button 
                onClick={() => window.location.reload()} 
                className="w-full gap-2"
              >
                <RefreshCw className="w-5 h-5" />
                Reload Page
              </Button>
              <Button 
                variant="ghost" 
                onClick={() => this.setState({ hasError: false, error: null })}
                className="w-full"
              >
                Try Again
              </Button>
            </div>
            {import.meta.env.DEV && (
              <div className="mt-8 p-4 bg-gray-50 rounded-lg text-left overflow-auto max-h-40">
                <p className="text-xs font-mono text-red-text whitespace-pre-wrap">
                  {this.state.error?.toString()}
                </p>
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const ToastContainer = () => {
  const { toasts, removeToast } = useUIStore();

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            'flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg pointer-events-auto animate-in slide-in-from-right-full duration-300',
            toast.type === 'success' ? 'bg-green-bg text-green-text border border-green-text/20' :
            toast.type === 'error' ? 'bg-red-bg text-red-text border border-red-text/20' :
            'bg-slate-bg text-slate border border-slate/20'
          )}
        >
          {toast.type === 'success' && <CheckCircle className="w-5 h-5" />}
          {toast.type === 'error' && <AlertCircle className="w-5 h-5" />}
          {toast.type === 'info' && <Info className="w-5 h-5" />}
          <span className="font-medium">{toast.message}</span>
          <button onClick={() => removeToast(toast.id)} className="ml-2 hover:opacity-70">
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/turmas" element={<Turmas />} />
            <Route path="/alunos" element={<Alunos />} />
            <Route path="/chamada/:turmaId" element={<Chamada />} />
            <Route path="/historico" element={<Historico />} />
            <Route path="/relatorios" element={<Relatorios />} />
          </Routes>
        </Layout>
        <ToastContainer />
      </Router>
    </ErrorBoundary>
  );
}
