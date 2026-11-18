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
import { AppState, Appearance } from 'react-native';
import { scheduleNotifications } from './src/services/NotificationService';
import useSettingsStore from './src/store/useSettingsStore';
import { getColors, isDarkTheme } from './src/theme/colors';

const Stack = createStackNavigator();

export default function App() {
    const {
        theme,
        notificationsEnabled,
        onboardingCompleted,
        notificationFrequency,
        language,
        notificationHour,
        notificationMinute,
        notificationWeekdays
    } = useSettingsStore();

    // Reminders are only (re)scheduled for users who opted in and finished onboarding.
    // The permission itself is requested when the user switches notifications on in
    // Settings, never at app start. Because reminders are scheduled as a rolling window
    // of one-off notifications, the window is also refreshed whenever the app returns
    // to the foreground.
    useEffect(() => {
        const schedule = () => {
            scheduleNotifications(
                notificationsEnabled && onboardingCompleted,
                notificationFrequency,
                language,
                notificationHour,
                notificationMinute,
                notificationWeekdays
            ).catch((e) => console.warn('Notification setup failed:', e.message));
        };

        schedule();
        const subscription = AppState.addEventListener('change', (state) => {
            if (state === 'active') schedule();
        });
        return () => subscription.remove();
    }, [notificationsEnabled, onboardingCompleted, notificationFrequency, language, notificationHour, notificationMinute, notificationWeekdays]);

    // Keep the store's copy of the OS color scheme current (used by the 'system' theme).
    useEffect(() => {
        const { setSystemScheme } = useSettingsStore.getState();
        setSystemScheme(Appearance.getColorScheme() || 'light');
        const subscription = Appearance.addChangeListener(({ colorScheme }) => {
            useSettingsStore.getState().setSystemScheme(colorScheme || 'light');
        });
        return () => subscription.remove();
    }, []);

    const colors = getColors(theme);

    return (
        <SafeAreaProvider>
            <GestureHandlerRootView style={{ flex: 1 }}>
                <NavigationContainer>
                    <StatusBar style={isDarkTheme(theme) ? 'light' : 'dark'} />
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
