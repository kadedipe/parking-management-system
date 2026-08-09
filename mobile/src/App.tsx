// ============================================================================
// MainStack Usage - How to Use MainStack in App
// ============================================================================

// parking-management-system/mobile/src/App.tsx

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar, SafeAreaView } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, ThemeProvider, NotificationProvider, BookingProvider } from './contexts';
import { AuthStack } from './navigation/AuthStack';
import { MainStack } from './navigation/MainStack';
import { useAuth } from './hooks/useAuth';
import { useTheme } from './contexts/ThemeContext';

// App content based on auth state
const AppContent = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const { colors, isDark } = useTheme();

  if (isLoading) {
    // Show loading screen
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        {/* Loading component */}
      </SafeAreaView>
    );
  }

  return isAuthenticated ? <MainStack /> : <AuthStack />;
};

const App = () => {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <NotificationProvider>
            <BookingProvider>
              <NavigationContainer>
                <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
                <AppContent />
              </NavigationContainer>
            </BookingProvider>
          </NotificationProvider>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
};

export default App;