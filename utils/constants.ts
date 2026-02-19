/**
 * Constantes globales de la aplicación
 * Versionado para cache busting
 */

// Versión de la app - cambiar en cada release
export const APP_VERSION = '1.0.1';

// Configuración de timeouts
export const LOAD_TIMEOUT_MS = 20000; // 20 segundos
export const CACHE_MAX_AGE_MS = 5 * 60 * 1000; // 5 minutos

// Keys para localStorage
export const STORAGE_KEYS = {
  APP_VERSION: 'tc_app_version',
  VERSION_RELOAD_DONE: 'tc_version_reload_done',
  FAVORITES: 'tc_favs',
  SAVED_CARTS: 'tc_saved_lists',
  THEME: 'theme',
  CACHE_PRODUCTS: 'tc_cache_products',
  CACHE_HISTORY: 'tc_cache_history',
  CACHE_CONFIG: 'tc_cache_config',
  CACHE_TIME: 'tc_cache_time',
} as const;
