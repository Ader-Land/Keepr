import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import DeckScreen from './src/screens/DeckScreen';
import SummaryScreen from './src/screens/SummaryScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import CelebrationScreen from './src/screens/CelebrationScreen';
import KeepListScreen from './src/screens/KeepListScreen';
import BadgesScreen from './src/screens/BadgesScreen';
import { StatusBar } from 'expo-status-bar';
import { registerForPushNotificationsAsync, scheduleNotifications } from './src/services/NotificationService';
import useSettingsStore from './src/store/useSettingsStore';
import { getColors } from './src/theme/colors';

const Stack = createStackNavigator();

export default function App() {
    const {
        theme,
        notificationsEnabled,
        notificationFrequency,
        language,
        notificationHour,
        notificationMinute,
        notificationWeekdays
    } = useSettingsStore();

    useEffect(() => {
        const setupNotifications = async () => {
            await registerForPushNotificationsAsync();
            await scheduleNotifications(
                notificationsEnabled,
                notificationFrequency,
                language,
                notificationHour,
                notificationMinute,
                notificationWeekdays
            );
        };
        setupNotifications();
    }, [notificationsEnabled, notificationFrequency, language, notificationHour, notificationMinute, notificationWeekdays]);

    const colors = getColors(theme);

    return (
        <SafeAreaProvider>
            <GestureHandlerRootView style={{ flex: 1 }}>
                <NavigationContainer>
                    <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
                    <Stack.Navigator
                        initialRouteName="Deck"
                        screenOptions={{
                            headerShown: false,
                            cardStyle: { backgroundColor: colors.bg },
                        }}
                    >
                        <Stack.Screen name="Deck" component={DeckScreen} />
                        <Stack.Screen name="Summary" component={SummaryScreen} />
                        <Stack.Screen name="Settings" component={SettingsScreen} />
                        <Stack.Screen name="Celebration" component={CelebrationScreen} />
                        <Stack.Screen name="KeepList" component={KeepListScreen} />
                        <Stack.Screen name="Badges" component={BadgesScreen} />
                    </Stack.Navigator>
                </NavigationContainer>
            </GestureHandlerRootView>
        </SafeAreaProvider>
    );
}
