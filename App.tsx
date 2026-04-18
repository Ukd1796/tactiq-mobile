import 'react-native-gesture-handler';
import React, { useEffect, useRef } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './src/lib/queryClient';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { View, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Toast from 'react-native-toast-message';
import * as Notifications from 'expo-notifications';

import { AuthProvider } from './src/contexts/AuthContext';
import { RootNavigator, navigationRef } from './src/navigation';
import { colors } from './src/lib/theme';

function _navigateFromNotification(response: Notifications.NotificationResponse | null | undefined) {
  if (!response) return;
  const data = response.notification.request.content.data as { screen?: string };
  if (data?.screen === 'PaperTrade' && navigationRef.current?.isReady()) {
    navigationRef.current.navigate('Main', { screen: 'PaperTrade' });
  }
}

export default function App() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  // Covers cold-start and background-to-foreground taps
  const lastResponse = Notifications.useLastNotificationResponse();
  useEffect(() => {
    _navigateFromNotification(lastResponse);
  }, [lastResponse]);

  const responseListener = useRef<Notifications.EventSubscription | null>(null);

  useEffect(() => {
    // Covers foreground taps (useLastNotificationResponse doesn't fire while app is open)
    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      _navigateFromNotification,
    );
    return () => {
      responseListener.current?.remove();
    };
  }, []);

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <StatusBar style="light" />
          <RootNavigator />
          <Toast />
        </AuthProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
