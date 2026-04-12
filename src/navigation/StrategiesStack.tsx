import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { colors } from '../lib/theme';

import { MyStrategiesScreen } from '../screens/strategies/MyStrategiesScreen';
import { BacktestResultsScreen } from '../screens/strategies/BacktestResultsScreen';
import { StrategyBuilderScreen } from '../screens/strategies/StrategyBuilderScreen';
import { Step1Universe } from '../screens/onboarding/Step1Universe';
import { Step2Strategies } from '../screens/onboarding/Step2Strategies';
import { Step3Risk } from '../screens/onboarding/Step3Risk';
import { Step4Name } from '../screens/onboarding/Step4Name';

const Stack = createNativeStackNavigator();

export function StrategiesNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.foreground,
        headerShadowVisible: false,
        headerTitleStyle: { fontFamily: 'Inter_600SemiBold', fontSize: 15 },
      }}
    >
      <Stack.Screen
        name="MyStrategies"
        component={MyStrategiesScreen}
        options={{ title: 'My Strategies' }}
      />
      <Stack.Screen
        name="Step1Universe"
        component={Step1Universe}
        options={{ title: 'New Strategy', headerBackTitle: '' }}
      />
      <Stack.Screen
        name="Step2Strategies"
        component={Step2Strategies}
        options={{ title: 'New Strategy', headerBackTitle: '' }}
      />
      <Stack.Screen
        name="Step3Risk"
        component={Step3Risk}
        options={{ title: 'New Strategy', headerBackTitle: '' }}
      />
      <Stack.Screen
        name="Step4Name"
        component={Step4Name}
        options={{ title: 'New Strategy', headerBackTitle: '' }}
      />
      <Stack.Screen
        name="StrategyBuilder"
        component={StrategyBuilderScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="BacktestResults"
        component={BacktestResultsScreen}
        options={{ title: 'Backtest Results', headerBackTitle: '' }}
      />
    </Stack.Navigator>
  );
}
