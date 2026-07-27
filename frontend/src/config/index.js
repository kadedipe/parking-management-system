// ============================================================================
// Application Configuration
// ============================================================================

/**
 * Application configuration loaded from environment variables
 */

export const config = {
  // Application info
  app: {
    name: import.meta.env.VITE_APP_NAME || 'Parking Management System',
    version: import.meta.env.VITE_APP_VERSION || '1.0.0',
    description: import.meta.env.VITE_APP_DESCRIPTION || 'A comprehensive parking management system',
    environment: import.meta.env.VITE_ENVIRONMENT || 'development',
  },

  // API configuration
  api: {
    baseUrl: import.meta.env.VITE_API_URL || 'http://localhost:8000',
    version: import.meta.env.VITE_API_VERSION || 'v1',
    timeout: parseInt(import.meta.env.VITE_API_TIMEOUT) || 30000,
    maxRetries: parseInt(import.meta.env.VITE_API_MAX_RETRIES) || 3,
  },

  // WebSocket configuration
  websocket: {
    url: import.meta.env.VITE_WEBSOCKET_URL || 'ws://localhost:8000/ws',
    reconnectAttempts: parseInt(import.meta.env.VITE_WEBSOCKET_RECONNECT_ATTEMPTS) || 5,
    reconnectDelay: parseInt(import.meta.env.VITE_WEBSOCKET_RECONNECT_DELAY) || 3000,
  },

  // Authentication
  auth: {
    tokenStorageKey: import.meta.env.VITE_TOKEN_STORAGE_KEY || 'auth_token',
    refreshTokenStorageKey: import.meta.env.VITE_REFRESH_TOKEN_STORAGE_KEY || 'refresh_token',
    sessionTimeout: parseInt(import.meta.env.VITE_SESSION_TIMEOUT_MINUTES) || 60,
    sessionWarning: parseInt(import.meta.env.VITE_SESSION_WARNING_SECONDS) || 60,
  },

  // Features
  features: {
    parkingReservations: import.meta.env.VITE_FEATURE_PARKING_RESERVATIONS === 'true',
    evCharging: import.meta.env.VITE_FEATURE_EV_CHARGING === 'true',
    dynamicPricing: import.meta.env.VITE_FEATURE_DYNAMIC_PRICING === 'true',
    advancedAnalytics: import.meta.env.VITE_FEATURE_ADVANCED_ANALYTICS === 'true',
    notifications: import.meta.env.VITE_FEATURE_NOTIFICATIONS === 'true',
    mobileResponsive: import.meta.env.VITE_FEATURE_MOBILE_RESPONSIVE === 'true',
  },

  // UI configuration
  ui: {
    defaultTheme: import.meta.env.VITE_DEFAULT_THEME || 'system',
    primaryColor: import.meta.env.VITE_PRIMARY_COLOR || '#1976d2',
    secondaryColor: import.meta.env.VITE_SECONDARY_COLOR || '#dc004e',
    defaultLocale: import.meta.env.VITE_DEFAULT_LOCALE || 'en-US',
    dateFormat: import.meta.env.VITE_DATE_FORMAT || 'MM/dd/yyyy',
    timeFormat: import.meta.env.VITE_TIME_FORMAT || 'HH:mm',
    currencySymbol: import.meta.env.VITE_CURRENCY_SYMBOL || '$',
  },

  // Payment configuration
  payment: {
    stripePublishableKey: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '',
    paypalClientId: import.meta.env.VITE_PAYPAL_CLIENT_ID || '',
    testMode: import.meta.env.VITE_PAYMENT_TEST_MODE === 'true',
  },

  // Monitoring
  monitoring: {
    sentryDsn: import.meta.env.VITE_SENTRY_DSN || '',
    sentryEnvironment: import.meta.env.VITE_SENTRY_ENVIRONMENT || 'development',
    googleAnalyticsId: import.meta.env.VITE_GOOGLE_ANALYTICS_ID || '',
    analyticsEnabled: import.meta.env.VITE_ANALYTICS_ENABLED === 'true',
    performanceMonitoringEnabled: import.meta.env.VITE_PERFORMANCE_MONITORING_ENABLED === 'true',
  },

  // Map configuration
  map: {
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
    defaultLatitude: parseFloat(import.meta.env.VITE_MAP_DEFAULT_LATITUDE) || 37.7749,
    defaultLongitude: parseFloat(import.meta.env.VITE_MAP_DEFAULT_LONGITUDE) || -122.4194,
    defaultZoom: parseInt(import.meta.env.VITE_MAP_DEFAULT_ZOOM) || 13,
  },

  // File upload configuration
  upload: {
    maxFileSize: parseInt(import.meta.env.VITE_MAX_FILE_SIZE) || 5242880,
    allowedFileTypes: (import.meta.env.VITE_ALLOWED_FILE_TYPES || 'image/jpeg,image/png,image/gif,image/webp').split(','),
    maxFilesPerUpload: parseInt(import.meta.env.VITE_MAX_FILES_PER_UPLOAD) || 5,
  },

  // Caching
  cache: {
    serviceWorkerEnabled: import.meta.env.VITE_SERVICE_WORKER_ENABLED === 'true',
    cacheVersion: import.meta.env.VITE_CACHE_VERSION || '1.0.0',
    apiCacheTtl: parseInt(import.meta.env.VITE_API_CACHE_TTL) || 300000,
    staticCacheDuration: parseInt(import.meta.env.VITE_STATIC_CACHE_DURATION) || 86400,
  },

  // Security
  security: {
    cspReportUri: import.meta.env.VITE_CSP_REPORT_URI || '/csp-report',
    cspDevelopmentEnabled: import.meta.env.VITE_CSP_DEVELOPMENT_ENABLED === 'true',
    cspProductionEnabled: import.meta.env.VITE_CSP_PRODUCTION_ENABLED === 'true',
  },

  // Development
  dev: {
    hmrEnabled: import.meta.env.VITE_HMR_ENABLED === 'true',
    sourceMapsEnabled: import.meta.env.VITE_SOURCE_MAPS_ENABLED === 'true',
    mockApiEnabled: import.meta.env.VITE_MOCK_API_ENABLED === 'true',
    loggingEnabled: import.meta.env.VITE_LOGGING_ENABLED === 'true',
    devToolsEnabled: import.meta.env.VITE_DEV_TOOLS_ENABLED === 'true',
  },
};

// Helper to check if in production
export const isProduction = config.app.environment === 'production';
export const isDevelopment = config.app.environment === 'development';
export const isStaging = config.app.environment === 'staging';
export const isTesting = config.app.environment === 'testing';
export const isDebug = import.meta.env.DEBUG === 'true';

export default config;