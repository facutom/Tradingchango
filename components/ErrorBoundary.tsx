import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * ErrorBoundary simple que captura errores de React y muestra
 * un botón de recarga en lugar de la White Screen of Death.
 * 
 * Uso: Envuelve tu App o componentes problemáticos con este boundary
 * 
 * <ErrorBoundary>
 *   <TuComponente />
 * </ErrorBoundary>
 */
class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log del error para debugging
    console.error('[ErrorBoundary] Error capturado:', error);
    console.error('[ErrorBoundary] Info:', errorInfo);
    
    this.setState({
      error,
      errorInfo,
    });

    // Detectar errores específicos de background/foreground que requieren reset
    const errorMessage = error.message || '';
    const errorStack = error.stack || '';
    
    const isBackgroundError = 
      error instanceof TypeError || 
      error instanceof ReferenceError ||
      errorMessage.includes('Cannot read properties') ||
      errorMessage.includes('is not defined') ||
      errorMessage.includes('of null') ||
      errorMessage.includes('of undefined') ||
      errorStack.includes('undefined');
    
    // Si es un error de tipo background/foreground, forzar limpieza
    if (isBackgroundError) {
      console.warn('[ErrorBoundary] Error de tipo background detected, limpiando estado...');
      this.cleanupAndReload();
    }

    // Opcional: Reportar a servicio de tracking (Sentry, etc.)
    // if (window.Sentry) {
    //   window.Sentry.captureException(error, { extra: errorInfo });
    // }
  }

  // Limpiar estado local antes de recargar para evitar errores persistentes
  cleanupAndReload(): void {
    try {
      // Limpiar cache de la app
      localStorage.removeItem('tc_cache_products');
      localStorage.removeItem('tc_cache_history');
      localStorage.removeItem('tc_cache_config');
      localStorage.removeItem('tc_cache_time');
      
      // Limpiar estado de sessionStorage también
      sessionStorage.clear();
      
      console.log('[ErrorBoundary] Estado limpiado, recargando...');
    } catch (e) {
      console.warn('[ErrorBoundary] Error limpiando estado:', e);
    }
  }

  handleReload = (): void => {
    // Limpiar estado y recargar
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
    
    // Forzar recarga completa para evitar estado corrupto
    window.location.reload();
  };

  handleReloadSession = (): void => {
    // Intentar recargar solo la sesión (soft reload)
    // Útil si el error es de code splitting
    window.location.href = window.location.pathname;
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Si hay un fallback personalizado, usarlo
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // UI por defecto: mensaje de error con botón de recarga
      return (
        <div className="min-h-screen bg-gray-100 dark:bg-[#0b141a] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1a2332] rounded-lg shadow-xl p-8 max-w-md w-full text-center">
            <div className="mb-6">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg 
                  className="w-8 h-8 text-red-600 dark:text-red-400" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" 
                  />
                </svg>
              </div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                Algo salió mal
              </h1>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                La aplicación encontró un error inesperado. Esto puede suceder 
                después de un período de inactividad.
              </p>
            </div>

            {/* Debug info en desarrollo */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="mb-6 p-3 bg-gray-100 dark:bg-[#0b141a] rounded text-left overflow-auto max-h-32">
                <p className="text-xs text-red-600 dark:text-red-400 font-mono">
                  {this.state.error.toString()}
                </p>
                {this.state.errorInfo?.componentStack && (
                  <pre className="text-xs text-gray-500 dark:text-gray-500 mt-2 whitespace-pre-wrap">
                    {this.state.errorInfo.componentStack}
                  </pre>
                )}
              </div>
            )}

            <div className="space-y-3">
              <button
                onClick={this.handleReload}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Recargar aplicación
              </button>
              
              <button
                onClick={this.handleReloadSession}
                className="w-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-medium py-2 px-6 rounded-lg transition-colors duration-200 text-sm"
              >
                Recargar página
              </button>
            </div>

            <p className="mt-4 text-xs text-gray-500 dark:text-gray-500">
              Si el problema persiste, contactá soporte.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
