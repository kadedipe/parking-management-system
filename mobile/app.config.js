// ============================================================================
// Environment-Specific Configurations
// ============================================================================

// parking-management-system/mobile/app.config.js

module.exports = ({ config }) => {
  // Get environment from process.env or default to development
  const env = process.env.APP_ENV || 'development';
  
  // Environment-specific configurations
  const environments = {
    development: {
      extra: {
        env: 'development',
        apiUrl: 'http://localhost:3000/api',
        wsUrl: 'ws://localhost:3000/ws',
      },
      ios: {
        bundleIdentifier: 'com.parkingapp.dev',
        googleServicesFile: './GoogleService-Info-dev.plist',
      },
      android: {
        package: 'com.parkingapp.dev',
        googleServicesFile: './google-services-dev.json',
      },
      updates: {
        enabled: false,
      },
      developmentClient: {
        silentLaunch: true,
      },
      // Development-specific plugins
      plugins: [
        // Add development-only plugins here
      ],
    },
    
    staging: {
      extra: {
        env: 'staging',
        apiUrl: 'https://staging-api.parkingapp.com/api',
        wsUrl: 'wss://staging-ws.parkingapp.com',
      },
      ios: {
        bundleIdentifier: 'com.parkingapp.staging',
        googleServicesFile: './GoogleService-Info-staging.plist',
      },
      android: {
        package: 'com.parkingapp.staging',
        googleServicesFile: './google-services-staging.json',
      },
      updates: {
        enabled: true,
        checkAutomatically: 'ON_LOAD',
      },
      developmentClient: {
        silentLaunch: false,
      },
    },
    
    production: {
      extra: {
        env: 'production',
        apiUrl: 'https://api.parkingapp.com/api',
        wsUrl: 'wss://ws.parkingapp.com',
      },
      ios: {
        bundleIdentifier: 'com.parkingapp.ios',
        googleServicesFile: './GoogleService-Info.plist',
      },
      android: {
        package: 'com.parkingapp.android',
        googleServicesFile: './google-services.json',
      },
      updates: {
        enabled: true,
        checkAutomatically: 'ON_LOAD',
      },
      hooks: {
        postPublish: [
          {
            file: 'sentry-expo/upload-sourcemaps',
            config: {
              organization: 'parking-app',
              project: 'parking-management-system',
              authToken: 'YOUR_SENTRY_AUTH_TOKEN',
            },
          },
        ],
      },
    },
  };

  // Get environment configuration
  const envConfig = environments[env] || environments.development;

  // Merge with base config
  return {
    ...config,
    ...envConfig,
    name: env === 'production' ? 'Parking Management System' : `Parking App (${env})`,
    displayName: env === 'production' ? 'Parking App' : `Parking App (${env})`,
  };
};