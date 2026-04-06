import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LayoutDashboard, BookMarked, TrendingUp, Zap } from 'lucide-react-native';
import { colors } from '../lib/theme';

import { DashboardScreen } from '../screens/dashboard/DashboardScreen';
import { MyStrategiesScreen } from '../screens/strategies/MyStrategiesScreen';
import { BacktestResultsScreen } from '../screens/strategies/BacktestResultsScreen';
import { PaperTradeScreen } from '../screens/paper/PaperTradeScreen';
import { LiveTradingScreen } from '../screens/live/LiveTradingScreen';

// Strategies stack (list → backtest results)
const StrategiesStack = createNativeStackNavigator();
function StrategiesNavigator() {
  return (
    <StrategiesStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.foreground,
        headerShadowVisible: false,
      }}
    >
      <StrategiesStack.Screen name="MyStrategies" component={MyStrategiesScreen} options={{ title: 'My Strategies' }} />
      <StrategiesStack.Screen name="BacktestResults" component={BacktestResultsScreen} options={{ title: 'Backtest Results' }} />
    </StrategiesStack.Navigator>
  );
}

const Tab = createBottomTabNavigator();

export function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          paddingBottom: 4,
          height: 60,
        },
        tabBarActiveTintColor:   colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontSize: 11, fontFamily: 'Inter_500Medium' },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{ tabBarIcon: ({ color }) => <LayoutDashboard size={20} color={color} /> }}
      />
      <Tab.Screen
        name="Strategies"
        component={StrategiesNavigator}
        options={{ tabBarIcon: ({ color }) => <BookMarked size={20} color={color} />, tabBarLabel: 'Strategies' }}
      />
      <Tab.Screen
        name="PaperTrade"
        component={PaperTradeScreen}
        options={{ tabBarIcon: ({ color }) => <TrendingUp size={20} color={color} />, tabBarLabel: 'Paper Trade' }}
      />
      <Tab.Screen
        name="Live"
        component={LiveTradingScreen}
        options={{ tabBarIcon: ({ color }) => <Zap size={20} color={color} /> }}
      />
    </Tab.Navigator>
  );
}
