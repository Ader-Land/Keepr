import React, { useState, useEffect } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    Switch,
    Platform,
    ActivityIndicator,
    Modal,
    Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as MediaLibrary from 'expo-media-library';
import { useTranslation } from '../hooks/useTranslation';
import { getLanguageLabel } from '../i18n/translations';
import useSettingsStore from '../store/useSettingsStore';
import { scheduleNotifications } from '../services/NotificationService';
import { getColors, THEME_LIST, isDarkTheme } from '../theme/colors';

const SettingsScreen = ({ navigation }) => {
    const { t, language } = useTranslation();
    const {
        theme,
        setTheme,
        setLanguage,
        mediaTypes,
        toggleMediaType,
        selectedAlbums,
        toggleAlbum,
        sortBy,
        setSortBy,
        vibrationEnabled,
        setVibrationEnabled,
        notificationsEnabled,
        setNotificationsEnabled,
        notificationFrequency,
        setNotificationFrequency,
        notificationHour,
        setNotificationHour,
        notificationMinute,
        setNotificationMinute,
        notificationWeekdays,
        toggleWeekday,
        failedAlbums,
        clearFailedAlbums,
    } = useSettingsStore();

    const [localAlbums, setLocalAlbums] = useState([]);
    const [sdCardAlbums, setSdCardAlbums] = useState([]);
    const [loadingAlbums, setLoadingAlbums] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [showLanguagePicker, setShowLanguagePicker] = useState(false);
    const [showThemePicker, setShowThemePicker] = useState(false);

    useEffect(() => {
        const fetchAlbumsWithStorageCheck = async () => {
            setLoadingAlbums(true);
            try {
                const { status } = await MediaLibrary.getPermissionsAsync();
                if (status === 'granted') {
                    const fetchedAlbums = await MediaLibrary.getAlbumsAsync({
                        includeSmartAlbums: true,
                    });

                    const local = [];
                    const sd = [];

                    for (const album of fetchedAlbums) {
                        try {
                            const { assets } = await MediaLibrary.getAssetsAsync({
                                album: album.id,
                                first: 1,
                            });

                            const isSD = assets.length > 0 &&
                                assets[0].uri &&
                                !assets[0].uri.includes('/emulated/0') &&
                                !assets[0].uri.includes('com.android.providers.media.documents');

                            if (isSD) {
                                sd.push(album);
                            } else {
                                local.push(album);
                            }
                        } catch (e) {
                            local.push(album); // Hata durumunda güvenli tarafta kal
                        }
                    }

                    const sorter = (a, b) => {
                        if (a.title === 'Camera' || a.title === 'Recent') return -1;
                        if (b.title === 'Camera' || b.title === 'Recent') return 1;
                        return a.title.localeCompare(b.title);
                    };

                    setLocalAlbums(local.sort(sorter));
                    setSdCardAlbums(sd.sort(sorter));
                }
            } catch (e) {
                Alert.alert(t('error'), t('album_load_error'));
            } finally {
                setLoadingAlbums(false);
            }
        };
        fetchAlbumsWithStorageCheck();
    }, []);

    const isDark = isDarkTheme(theme);
    const colors = getColors(theme);

    const sortOptions = [
        { id: 'date-desc' },
        { id: 'date-asc' },
        { id: 'size-desc' },
        { id: 'size-asc' },
    ];

    const weekdayOptions = [
        { id: 1, key: 'sunday' },
        { id: 2, key: 'monday' },
        { id: 3, key: 'tuesday' },
        { id: 4, key: 'wednesday' },
        { id: 5, key: 'thursday' },
        { id: 6, key: 'friday' },
        { id: 7, key: 'saturday' },
    ];

    const handleNotificationToggle = async (enabled) => {
        setNotificationsEnabled(enabled);
        try {
            await scheduleNotifications(enabled, notificationFrequency, language, notificationHour, notificationMinute, notificationWeekdays);
        } catch (e) {
            Alert.alert(t('error'), t('notification_schedule_error'));
        }
    };

    const handleFrequencyChange = async (freq) => {
        setNotificationFrequency(freq);
        try {
            await scheduleNotifications(notificationsEnabled, freq, language, notificationHour, notificationMinute, notificationWeekdays);
        } catch (e) {
            Alert.alert(t('error'), t('notification_schedule_error'));
        }
    };

    const handleTimeChange = async (hour, minute) => {
        setNotificationHour(hour);
        setNotificationMinute(minute);
        try {
            await scheduleNotifications(notificationsEnabled, notificationFrequency, language, hour, minute, notificationWeekdays);
        } catch (e) {
            Alert.alert(t('error'), t('notification_schedule_error'));
        }
    };

    const handleWeekdayToggle = async (weekday) => {
        toggleWeekday(weekday);
        const newWeekdays = notificationWeekdays.includes(weekday)
            ? notificationWeekdays.filter(d => d !== weekday)
            : [...notificationWeekdays, weekday].sort();

        if ((newWeekdays || []).length > 0) {
            try {
                await scheduleNotifications(notificationsEnabled, notificationFrequency, language, notificationHour, notificationMinute, newWeekdays);
            } catch (e) {
                Alert.alert(t('error'), t('notification_schedule_error'));
            }
        }
    };


    const formatTime = (hour, minute) => {
        return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
    };

    const renderSectionHeader = (title) => (
        <Text style={[styles.sectionHeader, { color: colors.primary }]}>{title}</Text>
    );

    const renderItem = (label, value, onValueChange, type = 'switch') => (
        <View style={[styles.item, { borderBottomColor: colors.border }]}>
            <Text style={[styles.itemLabel, { color: colors.text }]}>{label}</Text>
            {type === 'switch' ? (
                <Switch
                    value={value}
                    onValueChange={onValueChange}
                    trackColor={{ false: '#767577', true: colors.primary }}
                    thumbColor={Platform.OS === 'ios' ? undefined : '#f4f3f4'}
                />
            ) : (
                <TouchableOpacity onPress={onValueChange} style={styles.selector}>
                    <Text style={[styles.selectorText, { color: colors.primary }]}>{value}</Text>
                </TouchableOpacity>
            )}
        </View>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top', 'left', 'right', 'bottom']}>
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Text style={[styles.backButtonText, { color: colors.text }]}>←</Text>
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>
                    {t('settings')}
                </Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                {renderSectionHeader(t('appearance_language'))}
                <View style={[styles.card, { backgroundColor: colors.card }]}>
                    {renderItem(
                        t('theme'),
                        t(`theme_${theme}`),
                        () => setShowThemePicker(true),
                        'selector'
                    )}
                    {renderItem(
                        t('language'),
                        getLanguageLabel(language),
                        () => setShowLanguagePicker(true),
                        'selector'
                    )}
                    {renderItem(
                        t('manage_keep_list'),
                        '>',
                        () => navigation.navigate('KeepList'),
                        'selector'
                    )}
                    {renderItem(
                        t('vibration'),
                        vibrationEnabled,
                        () => setVibrationEnabled(!vibrationEnabled)
                    )}
                </View>

                {renderSectionHeader(t('notifications'))}
                <View style={[styles.card, { backgroundColor: colors.card }]}>
                    {renderItem(
                        t('enable_notifications'),
                        notificationsEnabled,
                        handleNotificationToggle
                    )}


                    <Text style={[styles.infoText, { color: colors.subText }]}>
                        {t('frequency')}
                    </Text>
                    {['daily', 'weekly'].map((freq) => (
                        <TouchableOpacity
                            key={freq}
                            style={[styles.item, { borderBottomColor: colors.border }]}
                            onPress={() => handleFrequencyChange(freq)}
                            disabled={!notificationsEnabled}
                        >
                            <Text style={[styles.itemLabel, { color: notificationsEnabled ? colors.text : colors.subText }]}>
                                {t(freq)}
                            </Text>
                            <View style={[
                                styles.radio,
                                { borderColor: notificationsEnabled ? colors.primary : colors.subText },
                                notificationFrequency === freq && notificationsEnabled && { backgroundColor: colors.primary }
                            ]}>
                                {notificationFrequency === freq && notificationsEnabled && <View style={styles.radioInner} />}
                            </View>
                        </TouchableOpacity>
                    ))}

                    <TouchableOpacity
                        style={[styles.item, { borderBottomColor: colors.border }]}
                        onPress={() => setShowTimePicker(true)}
                        disabled={!notificationsEnabled}
                    >
                        <Text style={[styles.itemLabel, { color: notificationsEnabled ? colors.text : colors.subText }]}>
                            {t('notification_time')}
                        </Text>
                        <Text style={[styles.selectorText, { color: notificationsEnabled ? colors.primary : colors.subText }]}>
                            {formatTime(notificationHour, notificationMinute)}
                        </Text>
                    </TouchableOpacity>

                    {notificationFrequency === 'weekly' && (
                        <>
                            <Text style={[styles.infoText, { color: colors.subText }]}>
                                {t('days')}
                            </Text>
                            {weekdayOptions.map((day) => (
                                <TouchableOpacity
                                    key={day.id}
                                    style={[styles.item, { borderBottomColor: colors.border }]}
                                    onPress={() => handleWeekdayToggle(day.id)}
                                    disabled={!notificationsEnabled}
                                >
                                    <Text style={[styles.itemLabel, { color: notificationsEnabled ? colors.text : colors.subText }]}>
                                        {t(day.key)}
                                    </Text>
                                    <View style={[
                                        styles.checkbox,
                                        { borderColor: notificationsEnabled ? colors.primary : colors.subText },
                                        notificationWeekdays.includes(day.id) && notificationsEnabled && { backgroundColor: colors.primary }
                                    ]}>
                                        {notificationWeekdays.includes(day.id) && notificationsEnabled && <Text style={styles.checkmark}>✓</Text>}
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </>
                    )}
                </View>

                {renderSectionHeader(t('sort_order'))}
                <View style={[styles.card, { backgroundColor: colors.card }]}>
                    {sortOptions.map((opt) => (
                        <TouchableOpacity
                            key={opt.id}
                            style={[styles.item, { borderBottomColor: colors.border }]}
                            onPress={() => setSortBy(opt.id)}
                        >
                            <Text style={[styles.itemLabel, { color: colors.text }]}>{t(opt.id)}</Text>
                            <View style={[
                                styles.radio,
                                { borderColor: colors.primary },
                                sortBy === opt.id && { backgroundColor: colors.primary }
                            ]}>
                                {sortBy === opt.id && <View style={styles.radioInner} />}
                            </View>
                        </TouchableOpacity>
                    ))}
                </View>

                {renderSectionHeader(t('filter_albums'))}
                <View style={[styles.card, { backgroundColor: colors.card }]}>
                    {renderItem(
                        t('photos'),
                        mediaTypes.includes('photo'),
                        () => toggleMediaType('photo')
                    )}
                    {renderItem(
                        t('videos'),
                        mediaTypes.includes('video'),
                        () => toggleMediaType('video')
                    )}
                </View>
                <View style={[styles.card, { backgroundColor: colors.card, paddingVertical: 10 }]}>
                    {loadingAlbums ? (
                        <ActivityIndicator size="small" color={colors.primary} style={{ margin: 20 }} />
                    ) : (localAlbums || []).length === 0 ? (
                        <Text style={[styles.infoText, { color: colors.subText }]}>{t('no_albums_found')}</Text>
                    ) : (
                        (localAlbums || []).map((album) => {
                            const isFailed = (failedAlbums || []).includes(album.id);
                            return (
                                <TouchableOpacity
                                    key={album.id}
                                    style={[styles.albumItem, { borderBottomColor: colors.border }, isFailed && { opacity: 0.5 }]}
                                    onPress={() => !isFailed && toggleAlbum(album.id)}
                                >
                                    <View style={styles.albumInfo}>
                                        <Text style={[styles.itemLabel, { color: isFailed ? colors.primary : colors.text }]}>
                                            {album.title} {isFailed ? '⚠️' : ''}
                                        </Text>
                                        <Text style={[styles.albumCount, { color: colors.subText }]}>
                                            {isFailed ? t('unreachable_faulty') : album.assetCount}
                                        </Text>
                                    </View>
                                    {!isFailed && (
                                        <View style={[
                                            styles.checkbox,
                                            { borderColor: colors.primary },
                                            (selectedAlbums || []).includes(album.id) && { backgroundColor: colors.primary }
                                        ]}>
                                            {(selectedAlbums || []).includes(album.id) && <Text style={styles.checkmark}>✓</Text>}
                                        </View>
                                    )}
                                </TouchableOpacity>
                            );
                        })
                    )}
                </View>

                {renderSectionHeader(t('filter_albums'))}
                <View style={[styles.card, { backgroundColor: colors.card, paddingVertical: 10 }]}>
                    <View style={styles.warningBox}>
                        <Text style={styles.warningText}>
                            ⚠️ {t('sd_card_slow_warning')}
                        </Text>
                    </View>

                    {loadingAlbums ? (
                        <ActivityIndicator size="small" color={colors.primary} style={{ margin: 20 }} />
                    ) : (sdCardAlbums || []).length === 0 ? (
                        <Text style={[styles.infoText, { color: colors.subText, textAlign: 'center', marginVertical: 20 }]}>
                            {t('no_sd_albums_found')}
                        </Text>
                    ) : (
                        (sdCardAlbums || []).map((album) => {
                            const isFailed = (failedAlbums || []).includes(album.id);
                            return (
                                <TouchableOpacity
                                    key={album.id}
                                    style={[styles.albumItem, { borderBottomColor: colors.border }, isFailed && { opacity: 0.5 }]}
                                    onPress={() => !isFailed && toggleAlbum(album.id)}
                                >
                                    <View style={styles.albumInfo}>
                                        <Text style={[styles.itemLabel, { color: isFailed ? colors.primary : colors.text }]}>
                                            {album.title} {isFailed ? '⚠️' : ''}
                                        </Text>
                                        <Text style={[styles.albumCount, { color: colors.subText }]}>
                                            {isFailed ? t('unreachable_faulty') : album.assetCount}
                                        </Text>
                                    </View>
                                    {!isFailed && (
                                        <View style={[
                                            styles.checkbox,
                                            { borderColor: colors.primary },
                                            (selectedAlbums || []).includes(album.id) && { backgroundColor: colors.primary }
                                        ]}>
                                            {(selectedAlbums || []).includes(album.id) && <Text style={styles.checkmark}>✓</Text>}
                                        </View>
                                    )}
                                </TouchableOpacity>
                            );
                        })
                    )}

                    {(failedAlbums || []).length > 0 && (
                        <TouchableOpacity onPress={clearFailedAlbums} style={styles.clearFailedButton}>
                            <Text style={{ color: colors.primary, fontSize: 12, fontWeight: 'bold' }}>
                                🔄 {t('clear_failed_logs')}
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>

            {/* Language Picker Modal */}
            <Modal
                visible={showLanguagePicker}
                transparent
                animationType="fade"
                onRequestClose={() => setShowLanguagePicker(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
                        <Text style={[styles.modalTitle, { color: colors.text }]}>
                            {t('language')}
                        </Text>

                        <ScrollView style={{ maxHeight: 400 }}>
                            {['tr', 'en', 'es', 'de', 'fr', 'pt'].map((langCode) => (
                                <TouchableOpacity
                                    key={langCode}
                                    style={[styles.modalItem, { borderBottomColor: colors.border }]}
                                    onPress={() => {
                                        setLanguage(langCode);
                                        setShowLanguagePicker(false);
                                    }}
                                >
                                    <Text style={[
                                        styles.itemLabel,
                                        { color: language === langCode ? colors.primary : colors.text }
                                    ]}>
                                        {getLanguageLabel(langCode)}
                                    </Text>
                                    {language === langCode && <Text style={{ color: colors.primary, fontWeight: 'bold' }}>✓</Text>}
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        <TouchableOpacity
                            onPress={() => setShowLanguagePicker(false)}
                            style={[styles.modalDoneButton, { backgroundColor: colors.primary }]}
                        >
                            <Text style={styles.modalDoneText}>{t('done')}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Theme Picker Modal */}
            <Modal
                visible={showThemePicker}
                transparent
                animationType="fade"
                onRequestClose={() => setShowThemePicker(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
                        <Text style={[styles.modalTitle, { color: colors.text }]}>
                            {t('theme')}
                        </Text>

                        {THEME_LIST.map((item) => (
                            <TouchableOpacity
                                key={item.id}
                                style={[styles.modalItem, { borderBottomColor: colors.border }]}
                                onPress={() => {
                                    setTheme(item.id);
                                    setShowThemePicker(false);
                                }}
                            >
                                <View style={styles.themePreviewRow}>
                                    <View style={[
                                        styles.themePreviewCircle,
                                        { backgroundColor: item.preview, borderColor: item.accent }
                                    ]}>
                                        <View style={[
                                            styles.themePreviewDot,
                                            { backgroundColor: item.accent }
                                        ]} />
                                    </View>
                                    <Text style={[
                                        styles.itemLabel,
                                        { color: theme === item.id ? item.accent : colors.text }
                                    ]}>
                                        {t(`theme_${item.id}`)}
                                    </Text>
                                </View>
                                {theme === item.id && (
                                    <Text style={{ color: item.accent, fontWeight: 'bold', fontSize: 18 }}>✓</Text>
                                )}
                            </TouchableOpacity>
                        ))}

                        <TouchableOpacity
                            onPress={() => setShowThemePicker(false)}
                            style={[styles.modalDoneButton, { backgroundColor: colors.primary }]}
                        >
                            <Text style={styles.modalDoneText}>{t('done')}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Time Picker Modal */}
            <Modal
                visible={showTimePicker}
                transparent
                animationType="fade"
                onRequestClose={() => setShowTimePicker(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
                        <Text style={[styles.modalTitle, { color: colors.text }]}>
                            {t('select_time')}
                        </Text>

                        <View style={styles.timePickerContainer}>
                            <ScrollView style={styles.timePicker} showsVerticalScrollIndicator={false}>
                                {Array.from({ length: 24 }, (_, i) => i).map((hour) => (
                                    <TouchableOpacity
                                        key={hour}
                                        style={[
                                            styles.timeOption,
                                            notificationHour === hour && { backgroundColor: colors.primary }
                                        ]}
                                        onPress={() => handleTimeChange(hour, notificationMinute)}
                                    >
                                        <Text style={[
                                            styles.timeText,
                                            { color: notificationHour === hour ? '#fff' : colors.text }
                                        ]}>
                                            {hour.toString().padStart(2, '0')}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>

                            <Text style={[styles.timeSeparator, { color: colors.text }]}>:</Text>

                            <ScrollView style={styles.timePicker} showsVerticalScrollIndicator={false}>
                                {Array.from({ length: 60 }, (_, i) => i).map((minute) => (
                                    <TouchableOpacity
                                        key={minute}
                                        style={[
                                            styles.timeOption,
                                            notificationMinute === minute && { backgroundColor: colors.primary }
                                        ]}
                                        onPress={() => handleTimeChange(notificationHour, minute)}
                                    >
                                        <Text style={[
                                            styles.timeText,
                                            { color: notificationMinute === minute ? '#fff' : colors.text }
                                        ]}>
                                            {minute.toString().padStart(2, '0')}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>

                        <TouchableOpacity
                            style={[styles.modalButton, { backgroundColor: colors.primary }]}
                            onPress={() => setShowTimePicker(false)}
                        >
                            <Text style={styles.modalButtonText}>{t('done')}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        height: 60,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        borderBottomWidth: 1,
    },
    backButton: { width: 40, height: 40, justifyContent: 'center' },
    backButtonText: { fontSize: 24, fontWeight: 'bold' },
    headerTitle: { fontSize: 20, fontWeight: 'bold' },
    scrollContent: { padding: 20, paddingBottom: 60 },
    sectionHeader: {
        fontSize: 14,
        fontWeight: 'bold',
        marginBottom: 10,
        marginTop: 20,
        textTransform: 'uppercase',
    },
    card: {
        borderRadius: 15,
        overflow: 'hidden',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    item: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 15,
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    itemLabel: { fontSize: 16, fontWeight: '500' },
    selector: { paddingHorizontal: 10, paddingVertical: 5 },
    selectorText: { fontWeight: 'bold', fontSize: 16 },
    infoText: { fontSize: 12, paddingHorizontal: 15, marginBottom: 10, marginTop: 10, fontStyle: 'italic' },
    subText: {
        fontSize: 12,
        opacity: 0.7,
        marginTop: 5,
    },
    clearFailedButton: {
        alignItems: 'center',
        padding: 10,
        marginBottom: 5,
    },
    albumItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 15,
        paddingVertical: 12,
        borderBottomWidth: 0.5,
    },
    albumInfo: { flex: 1 },
    albumCount: { fontSize: 12, marginTop: 2 },
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: 6,
        borderWidth: 2,
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkmark: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
    radio: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        justifyContent: 'center',
        alignItems: 'center',
    },
    radioInner: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#fff',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        width: '80%',
        borderRadius: 20,
        padding: 20,
        elevation: 10,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'center',
    },
    modalItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 15,
        paddingHorizontal: 10,
        borderBottomWidth: 0.5,
    },
    modalDoneButton: {
        marginTop: 20,
        padding: 15,
        borderRadius: 15,
        alignItems: 'center',
    },
    modalDoneText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    warningBox: {
        backgroundColor: 'rgba(255, 82, 82, 0.1)',
        marginHorizontal: 15,
        marginVertical: 10,
        padding: 12,
        borderRadius: 10,
        borderLeftWidth: 4,
        borderLeftColor: '#FF5252',
    },
    warningText: {
        fontSize: 12,
        color: '#FF5252',
        fontWeight: '600',
        lineHeight: 18,
    },
    timePickerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
    },
    timePicker: {
        maxHeight: 200,
        width: 80,
    },
    timeOption: {
        padding: 12,
        borderRadius: 8,
        marginVertical: 4,
        alignItems: 'center',
    },
    timeText: {
        fontSize: 18,
        fontWeight: '600',
    },
    timeSeparator: {
        fontSize: 24,
        fontWeight: 'bold',
        marginHorizontal: 10,
    },
    modalButton: {
        padding: 15,
        borderRadius: 12,
        alignItems: 'center',
    },
    modalButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    themePreviewRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    themePreviewCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        borderWidth: 2,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    themePreviewDot: {
        width: 14,
        height: 14,
        borderRadius: 7,
    },
});

export default SettingsScreen;
