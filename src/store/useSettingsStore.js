import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import { Appearance } from 'react-native';

const DEFAULT_LANG = Localization.getLocales()[0]?.languageCode || 'en';
const SUPPORTED_LANGS = ['tr', 'en', 'es', 'de', 'fr', 'pt'];
const initialLang = SUPPORTED_LANGS.includes(DEFAULT_LANG) ? DEFAULT_LANG : 'en';

const useSettingsStore = create(
    persist(
        (set, get) => ({
            theme: 'system',
            // Mirror of the OS color scheme, kept in sync from App.js so that screens
            // subscribed to this store re-render when the system theme changes.
            systemScheme: Appearance.getColorScheme() || 'light',
            language: initialLang,
            mediaTypes: ['photo', 'video'],
            selectedAlbums: [],
            sortBy: 'date-desc',
            vibrationEnabled: true,
            notificationsEnabled: false, // opt-in: the permission is only requested when the user enables this
            notificationFrequency: 'daily',
            notificationHour: 19, // 0-23
            notificationMinute: 0, // 0-59
            notificationWeekdays: [1], // expo-notifications weekday numbers: 1=Sunday, 2=Monday, ..., 7=Saturday
            keepList: [],
            failedAlbums: [],
            earnedBadges: [],
            onboardingCompleted: false,
            lastRecordedSessionId: null, // guards against counting one cleanup session twice
            lifetimeStats: {
                totalSavedSpace: 0,
                totalDeletedCount: 0,
                totalKeptCount: 0,
                sessionsCompleted: 0,
                lastSessionDate: null,
                streakDays: 0,
            },

            addToKeepList: (assetId) => set((state) => ({
                keepList: [...new Set([...(state.keepList || []), assetId])]
            })),
            addManyToKeepList: (assetIds) => set((state) => ({
                keepList: [...new Set([...(state.keepList || []), ...(assetIds || [])])]
            })),
            removeFromKeepList: (assetId) => set((state) => ({
                keepList: (state.keepList || []).filter(id => id !== assetId)
            })),
            clearKeepList: () => set({ keepList: [] }),

            markAlbumAsFailed: (albumId) => set((state) => ({
                failedAlbums: [...new Set([...(state.failedAlbums || []), albumId])]
            })),
            clearFailedAlbums: () => set({ failedAlbums: [] }),

            setTheme: (theme) => set({ theme }),
            setSystemScheme: (systemScheme) => set({ systemScheme }),
            setLanguage: (language) => set({ language }),
            setMediaTypes: (types) => set({ mediaTypes: types }),
            setSelectedAlbums: (albums) => set({ selectedAlbums: albums }),
            setSortBy: (sortBy) => set({ sortBy }),
            setVibrationEnabled: (enabled) => set({ vibrationEnabled: enabled }),
            setNotificationsEnabled: (enabled) => set({ notificationsEnabled: enabled }),
            setNotificationFrequency: (frequency) => set({ notificationFrequency: frequency }),
            setNotificationHour: (hour) => set({ notificationHour: hour }),
            setNotificationMinute: (minute) => set({ notificationMinute: minute }),
            setNotificationWeekdays: (weekdays) => set({ notificationWeekdays: weekdays }),
            setOnboardingCompleted: (completed) => set({ onboardingCompleted: completed }),

            updateLifetimeStats: (sessionStats, sessionId = null) => set((state) => {
                if (sessionId && state.lastRecordedSessionId === sessionId) return state;

                const today = new Date().toDateString();
                const lastDate = state.lifetimeStats?.lastSessionDate;

                let newStreak = state.lifetimeStats?.streakDays || 0;
                if (lastDate !== today) {
                    const yesterday = new Date();
                    yesterday.setDate(yesterday.getDate() - 1);
                    if (lastDate === yesterday.toDateString()) {
                        newStreak += 1;
                    } else {
                        newStreak = 1;
                    }
                }

                return {
                    lastRecordedSessionId: sessionId || state.lastRecordedSessionId,
                    lifetimeStats: {
                        ...state.lifetimeStats,
                        totalSavedSpace: (state.lifetimeStats?.totalSavedSpace || 0) + (sessionStats.savedSpace || 0),
                        totalDeletedCount: (state.lifetimeStats?.totalDeletedCount || 0) + (sessionStats.deletedCount || 0),
                        totalKeptCount: (state.lifetimeStats?.totalKeptCount || 0) + (sessionStats.keptCount || 0),
                        sessionsCompleted: (state.lifetimeStats?.sessionsCompleted || 0) + 1,
                        lastSessionDate: today,
                        streakDays: newStreak,
                    }
                };
            }),

            awardBadge: (badgeId) => set((state) => ({
                earnedBadges: [...new Set([...(state.earnedBadges || []), badgeId])]
            })),

            toggleMediaType: (type) => set((state) => {
                const current = state.mediaTypes;
                if (current.includes(type)) {
                    if (current.length === 1) return state;
                    return { mediaTypes: current.filter(t => t !== type) };
                }
                return { mediaTypes: [...current, type] };
            }),

            toggleAlbum: (albumId) => set((state) => {
                const current = state.selectedAlbums;
                if (current.includes(albumId)) {
                    return { selectedAlbums: current.filter(id => id !== albumId) };
                }
                return { selectedAlbums: [...current, albumId] };
            }),

            toggleWeekday: (weekday) => set((state) => {
                const current = state.notificationWeekdays;
                if (current.includes(weekday)) {
                    if (current.length === 1) return state; // At least one day must be selected
                    return { notificationWeekdays: current.filter(d => d !== weekday) };
                }
                return { notificationWeekdays: [...current, weekday].sort() };
            }),
        }),
        {
            name: 'keepr-settings',
            storage: createJSONStorage(() => AsyncStorage),
        }
    )
);

export default useSettingsStore;
