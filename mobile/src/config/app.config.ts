// ============================================================================
// App Config - Application Configuration
// ============================================================================

// parking-management-system/mobile/src/config/app.config.ts

import { Platform } from 'react-native';
import Constants from 'expo-constants';

export const AppConfig = {
  // Application Information
  appName: 'Parking Management System',
  appVersion: Constants.manifest?.version || '1.0.0',
  buildNumber: Constants.manifest?.android?.versionCode || Constants.manifest?.ios?.buildNumber || '1',
  bundleId: Constants.manifest?.android?.package || Constants.manifest?.ios?.bundleIdentifier || 'com.parkingapp',

  // Environment
  env: Constants.manifest?.extra?.env || 'development',
  isDevelopment: Constants.manifest?.extra?.env === 'development',
  isProduction: Constants.manifest?.extra?.env === 'production',
  isStaging: Constants.manifest?.extra?.env === 'staging',

  // API Configuration
  api: {
    baseUrl: Constants.manifest?.extra?.apiUrl || 'https://api.parkingapp.com',
    wsUrl: Constants.manifest?.extra?.wsUrl || 'wss://ws.parkingapp.com',
    timeout: 30000,
    retryAttempts: 3,
    retryDelay: 1000,
  },

  // Feature Flags
  features: {
    enableBiometric: true,
    enableSocialLogin: true,
    enableTwoFactor: true,
    enableDarkMode: true,
    enablePushNotifications: true,
    enableOfflineMode: true,
    enableChatSupport: false,
    enableAnalytics: true,
  },

  // Limits
  limits: {
    maxBookingsPerDay: 10,
    maxVehicles: 5,
    maxSearchRadius: 50,
    maxImageSize: 5 * 1024 * 1024, // 5MB
    maxImages: 5,
  },

  // Platform
  platform: {
    isIOS: Platform.OS === 'ios',
    isAndroid: Platform.OS === 'android',
    isWeb: Platform.OS === 'web',
    version: Platform.Version,
  },

  // Third Party Keys
  keys: {
    googleMaps: Constants.manifest?.extra?.googleMapsApiKey || '',
    stripe: Constants.manifest?.extra?.stripePublishableKey || '',
    sentry: Constants.manifest?.extra?.sentryDsn || '',
    mixpanel: Constants.manifest?.extra?.mixpanelToken || '',
  },
};

export default AppConfig;