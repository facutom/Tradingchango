import React, { Component, ErrorInfo, ReactNode } from 'react';
import { trackError, sendClarityEvent, trackCrashRecovery } from '../utils/analytics';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  isReloading: boolean;
  autoReloadAttempted: boolean;
}

/**
 * ErrorBoundary robusto que captura errores de React y muestra
 * un mensaje amigable con opciones de recuperación.
 * 
 * Compatible con entorno móvil (PWA, WebView de app nativa).
 * Limpia Service Worker y caché antes de reintentar.
 * 
 * Características:
 * - Auto-refresh para errores de chunks
 * - Sincronización de estilos con la app
 * - Gestión de versiones del Service Worker
 * - Tracking de recuperación de crashes
 */
class ErrorBoundary extends Component<Props, State> {
  private reloadTimeoutRef: ReturnType<typeof setTimeout> | null = null;
  private autoReloadAttempts: number = 0;
  private readonly MAX_AUTO_RELOAD_ATTEMPTS = 1;
  private readonly CHUNK_LOAD_ERROR = 'Failed to fetch dynamically imported module';

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      isReloading: false,
      autoReloadAttempted: false,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
      isReloading: false,
      autoReloadAttempted: false,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('[ErrorBoundary] ════════════════════════════════════');
    console.error('[ErrorBoundary] Error capturado por ErrorBoundary');
    console.error('[ErrorBoundary] Error:', error);
    console.error('[ErrorBoundary] Stack:', error.stack);
    console.error('[ErrorBoundary] Component Stack:', errorInfo.componentStack);
    console.error('[ErrorBoundary] ════════════════════════════════════');

    this.setState({
      error,
      errorInfo,
    });

    const errorMessage = error.message || '';
    const errorStack = error.stack || '';
    const componentStack = errorInfo.componentStack || '';
    
    // Detectar error de carga de chunks
    const isChunkLoadError = 
      errorMessage.includes(this.CHUNK_LOAD_ERROR) ||
      errorMessage.includes('Loading chunk') ||
      errorMessage.includes('chunk') ||
      error.name === 'ChunkLoadError' ||
      errorMessage.includes('Failed to load resource');

    // Detectar errores críticos
    const isCriticalError = 
      error instanceof TypeError || 
      error instanceof ReferenceError ||
      errorMessage.includes('Cannot read properties') ||
      errorMessage.includes('is not defined') ||
      errorMessage.includes('of null') ||
      errorMessage.includes('of undefined') ||
      errorStack.includes('undefined');

    const errorDetails = {
      message: errorMessage.substring(0, 500),
      stack: errorStack.substring(0, 1000),
      componentStack: componentStack.substring(0, 1000),
      isChunkLoadError,
      isCriticalError,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      url: typeof window !== 'undefined' ? window.location.href : 'unknown',
      timestamp: new Date().toISOString(),
      appVersion: '1.0.0',
    };

    try {
      trackError(
        isChunkLoadError ? 'chunk_load_error' : (isCriticalError ? 'critical_error' : 'react_error'),
        `${errorMessage} | Stack: ${errorStack.substring(0, 200)}`
      );
      sendClarityEvent('app_error', errorDetails);
      console.log('[ErrorBoundary] Error enviado a Clarity/GA4:', errorDetails);
    } catch (analyticsErr) {
      console.error('[ErrorBoundary] Error enviando a analytics:', analyticsErr);
    }

    // Auto-refresh para errores de chunks
    if (isChunkLoadError && !this.state.autoReloadAttempted) {
      console.warn('[ErrorBoundary] Error de chunk detectado, intentando auto-recarga...');
      this.setState({ autoReloadAttempted: true });
      
      this.reloadTimeoutRef = setTimeout(() => {
        this.forceChunkReload();
      }, 1500);
      return;
    }

    // Auto-refresh para errores críticos
    if (isCriticalError && this.autoReloadAttempts < this.MAX_AUTO_RELOAD_ATTEMPTS) {
      this.autoReloadAttempts++;
      console.warn(`[ErrorBoundary] Auto-reintento ${this.autoReloadAttempts}/${this.MAX_AUTO_RELOAD_ATTEMPTS} en 2 segundos...`);
      
      this.reloadTimeoutRef = setTimeout(() => {
        this.cleanupAndReload();
      }, 2000);
    }
  }

  componentWillUnmount(): void {
    if (this.reloadTimeoutRef) {
      clearTimeout(this.reloadTimeoutRef);
    }
  }

  forceChunkReload = (): void => {
    console.log('[ErrorBoundary] Ejecutando forceChunkReload()...');
    this.setState({ isReloading: true });
    
    try {
      if (typeof window !== 'undefined') {
        if ('caches' in window) {
          caches.keys().then(cacheNames => {
            cacheNames.forEach(name => {
              if (name.includes('webpack') || name.includes('chunk')) {
                caches.delete(name).catch(() => {});
              }
            });
          }).catch(() => {});
        }
        window.location.reload();
      }
    } catch (e) {
      console.error('[ErrorBoundary] Error en forceChunkReload:', e);
      window.location.reload();
    }
  };

  cleanupAndReload = (): void => {
    this.setState({ isReloading: true });
    
    const cleanupPromises: Promise<void>[] = [];

    try {
      const localStorageKeys = [
        'tc_cache_products',
        'tc_cache_history', 
        'tc_cache_config',
        'tc_cache_time',
        'tc_cart',
        'tc_favorites',
        'tc_user_session',
      ];
      
      localStorageKeys.forEach(key => {
        try {
          localStorage.removeItem(key);
        } catch (e) {}
      });
      
      try {
        localStorage.clear();
      } catch (e) {
        console.warn('[ErrorBoundary] No se pudo limpiar localStorage completo:', e);
      }
      
      try {
        sessionStorage.clear();
      } catch (e) {
        console.warn('[ErrorBoundary] Error limpiando sessionStorage:', e);
      }
      
      if ('serviceWorker' in navigator) {
        cleanupPromises.push(
          navigator.serviceWorker.getRegistration().then(registration => {
            if (registration) {
              console.log('[ErrorBoundary] Eliminando Service Worker...');
              return registration.unregister();
            }
          }).then(() => {}).catch(e => {
            console.warn('[ErrorBoundary] Error con Service Worker:', e);
          })
        );
      }
      
      if ('caches' in window) {
        cleanupPromises.push(
          caches.keys().then(cacheNames => {
            return Promise.all(
              cacheNames.map(cacheName => {
                console.log('[ErrorBoundary] Eliminando caché:', cacheName);
                return caches.delete(cacheName);
              })
            );
          }).then(() => {}).catch(e => {
            console.warn('[ErrorBoundary] Error limpiando caché:', e);
          })
        );
      }
      
      console.log('[ErrorBoundary] Limpiando estado y recargando...');
      
      try {
        trackCrashRecovery(this.autoReloadAttempts + 1, 'auto_cleanup');
      } catch (e) {}
      
      Promise.all(cleanupPromises).finally(() => {
        window.location.reload();
      });
      
    } catch (e) {
      console.error('[ErrorBoundary] Error en cleanupAndReload:', e);
      window.location.reload();
    }
  };

  handleReload = (): void => {
    try {
      trackCrashRecovery(1, 'manual_full');
    } catch (e) {}
    this.cleanupAndReload();
  };

  handleReloadSession = (): void => {
    try {
      trackCrashRecovery(1, 'manual_session');
    } catch (e) {}
    
    try {
      sessionStorage.clear();
    } catch (e) {}
    window.location.href = window.location.pathname;
  };

  handleClearCacheAndReload = (): void => {
    if (confirm('Esto eliminará todos los datos guardados. ¿Continuar?')) {
      try {
        trackCrashRecovery(1, 'manual_cache_clear');
      } catch (e) {}
      this.cleanupAndReload();
    }
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // UI sincronizada con el estilo de la app
      return (
        <div className="min-h-screen bg-gray-50 dark:bg-[#0b141a] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1a2332] rounded-xl shadow-2xl p-6 max-w-md w-full text-center border border-gray-200 dark:border-gray-700">
            <div className="mb-5">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
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
                después de un período de inactividad o al actualizar la app.
              </p>
            </div>

            {this.state.isReloading && (
              <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    Limpiando caché y recargando...
                  </p>
                </div>
              </div>
            )}

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="mb-5 p-3 bg-gray-100 dark:bg-[#0b141a] rounded-lg text-left overflow-auto max-h-40 border border-gray-200 dark:border-gray-700">
                <p className="text-xs text-red-600 dark:text-red-400 font-mono break-all">
                  {this.state.error.toString()}
                </p>
                {this.state.errorInfo?.componentStack && (
                  <pre className="text-xs text-gray-500 dark:text-gray-500 mt-2 whitespace-pre-wrap break-all">
                    {this.state.errorInfo.componentStack}
                  </pre>
                )}
              </div>
            )}

            <div className="space-y-2">
              <button
                onClick={this.handleReload}
                disabled={this.state.isReloading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                {this.state.isReloading ? 'Recargando...' : 'Recargar aplicación'}
              </button>
              
              <button
                onClick={this.handleReloadSession}
                disabled={this.state.isReloading}
                className="w-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 dark:text-gray-300 font-medium py-2.5 px-6 rounded-lg transition-all duration-200 text-sm"
              >
                Recargar página (más rápido)
              </button>

              <button
                onClick={this.handleClearCacheAndReload}
                disabled={this.state.isReloading}
                className="w-full bg-orange-50 dark:bg-orange-900/20 hover:bg-orange-100 dark:hover:bg-orange-900/40 disabled:opacity-50 disabled:cursor-not-allowed text-orange-700 dark:text-orange-400 font-medium py-2.5 px-6 rounded-lg transition-all duration-200 text-sm border border-orange-200 dark:border-orange-800"
              >
                🗑️ Limpiar caché y recargar
              </button>
            </div>

            <p className="mt-4 text-xs text-gray-500 dark:text-gray-500">
              Si el problema persiste, contactá soporte técnico.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
