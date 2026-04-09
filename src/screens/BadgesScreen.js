import React from 'react';
import { StyleSheet, View, Text, FlatList, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from '../hooks/useTranslation';
import useSettingsStore from '../store/useSettingsStore';
import useMediaStore from '../store/useMediaStore';
import { getColors, isDarkTheme } from '../theme/colors';

const MB = 1024 * 1024;
const GB = 1024 * MB;

const BADGE_DEFINITIONS = [
    // Volume
    { id: 'first_step', icon: '🥉', type: 'volume', target: 100 * MB, unit: 'bytes' },
    { id: 'breather', icon: '🥈', type: 'volume', target: 1 * GB, unit: 'bytes' },
    { id: 'storage_master', icon: '🥇', type: 'volume', target: 10 * GB, unit: 'bytes' },
    { id: 'digital_minimalist', icon: '💎', type: 'volume', target: 50 * GB, unit: 'bytes' },

    // Action
    { id: 'determined_sorter', icon: '🔥', type: 'action' },
    { id: 'big_clean', icon: '✨', type: 'action' },
    { id: 'collector', icon: '📁', type: 'action', target: 50, unit: 'count' },
    { id: 'loyal_user', icon: '📅', type: 'action', target: 7, unit: 'days' },

    // Fun (Easter Eggs)
    { id: 'light_speed', icon: '⚡', type: 'fun' },
    { id: 'night_owl', icon: '🦉', type: 'fun' },
    { id: 'indecisive', icon: '🤔', type: 'fun' },
    { id: 'perfect_gallery', icon: '🌟', type: 'fun' },
];

const formatSize = (bytes) => {
    const val = parseFloat(bytes);
    if (isNaN(val) || val <= 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(val) / Math.log(k));
    return parseFloat((val / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const getBadgeProgress = (badge, lifetimeStats, sessionStats) => {
    if (!badge.target) return null;

    let current = 0;
    if (badge.unit === 'bytes') {
        current = (lifetimeStats?.totalSavedSpace || 0) + (sessionStats?.savedSpace || 0);
    } else if (badge.unit === 'count') {
        current = (lifetimeStats?.totalKeptCount || 0) + (sessionStats?.keptCount || 0);
    } else if (badge.unit === 'days') {
        current = lifetimeStats?.streakDays || 0;
    }

    const progress = Math.min(current / badge.target, 1);
    return { current, target: badge.target, progress, unit: badge.unit };
};

const formatProgress = (current, target, unit) => {
    if (unit === 'bytes') {
        return `${formatSize(current)} / ${formatSize(target)}`;
    }
    return `${Math.min(current, target)} / ${target}`;
};

const ProgressBar = ({ progress, colors }) => (
    <View style={[styles.progressBarBg, { backgroundColor: colors.progressBg }]}>
        <View
            style={[
                styles.progressBarFill,
                {
                    width: `${Math.max(progress * 100, 2)}%`,
                    backgroundColor: progress >= 1 ? colors.secondary : colors.primary,
                },
            ]}
        />
    </View>
);

const BadgesScreen = ({ navigation }) => {
    const { theme, earnedBadges, lifetimeStats } = useSettingsStore();
    const { stats: sessionStats } = useMediaStore();
    const { t, language } = useTranslation();
    const isDark = isDarkTheme(theme);
    const colors = getColors(theme);

    const renderBadge = ({ item }) => {
        const isEarned = (earnedBadges || []).includes(item.id);
        const progressInfo = getBadgeProgress(item, lifetimeStats, sessionStats);

        return (
            <View style={[styles.badgeCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.iconContainer, !isEarned && { opacity: 0.2, backgroundColor: colors.locked }]}>
                    <Text style={styles.icon}>{item.icon}</Text>
                </View>
                <Text style={[styles.badgeName, { color: isEarned ? colors.text : colors.subText }]}>
                    {t(`badge_${item.id}_name`)}
                </Text>
                <Text style={[styles.badgeDesc, { color: colors.subText }]}>
                    {t(`badge_${item.id}_desc`)}
                </Text>

                {/* Progress bar for trackable badges */}
                {progressInfo && (
                    <View style={styles.badgeProgressContainer}>
                        <ProgressBar progress={isEarned ? 1 : progressInfo.progress} colors={colors} />
                        <Text style={[styles.badgeProgressText, { color: colors.subText }]}>
                            {isEarned ? '✅' : formatProgress(progressInfo.current, progressInfo.target, progressInfo.unit)}
                        </Text>
                    </View>
                )}

                {!isEarned && !progressInfo && (
                    <View style={styles.lockBadge}>
                        <Text style={styles.lockIcon}>🔒</Text>
                    </View>
                )}
            </View>
        );
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top', 'left', 'right', 'bottom']}>
            <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Text style={[styles.backText, { color: colors.text }]}>←</Text>
                </TouchableOpacity>
                <Text style={[styles.title, { color: colors.text }]}>{t('achievements')}</Text>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={[styles.statsSummary, { backgroundColor: colors.card }]}>
                    <View style={styles.statItem}>
                        <Text style={[styles.statValue, { color: colors.text }]}>{lifetimeStats?.sessionsCompleted || 0}</Text>
                        <Text style={[styles.statLabel, { color: colors.subText }]}>{t('session')}</Text>
                    </View>
                    <View style={styles.statItem}>
                        <Text style={[styles.statValue, { color: colors.text }]}>{lifetimeStats?.streakDays || 0}</Text>
                        <Text style={[styles.statLabel, { color: colors.subText }]}>{t('day_streak')}</Text>
                    </View>
                    <View style={styles.statItem}>
                        <Text style={[styles.statValue, { color: colors.text }]}>{(earnedBadges || []).length}</Text>
                        <Text style={[styles.statLabel, { color: colors.subText }]}>{t('badges')}</Text>
                    </View>
                    <View style={styles.statItem}>
                        <Text style={[styles.statValue, { color: colors.text }]}>{formatSize(lifetimeStats?.totalSavedSpace || 0)}</Text>
                        <Text style={[styles.statLabel, { color: colors.subText }]}>{t('total_saved_space')}</Text>
                    </View>
                </View>

                <FlatList
                    data={BADGE_DEFINITIONS}
                    renderItem={renderBadge}
                    keyExtractor={(item) => item.id}
                    numColumns={2}
                    scrollEnabled={false}
                    contentContainerStyle={styles.list}
                />
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
    },
    backButton: {
        marginRight: 15,
        padding: 5,
    },
    backText: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
    },
    scrollContent: {
        paddingBottom: 40,
    },
    statsSummary: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        margin: 20,
        marginBottom: 10,
        padding: 20,
        borderRadius: 20,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
    },
    statItem: {
        alignItems: 'center',
    },
    statValue: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    statLabel: {
        fontSize: 12,
        marginTop: 4,
    },

    // Badge list
    list: {
        padding: 10,
    },
    badgeCard: {
        flex: 1,
        margin: 8,
        padding: 15,
        borderRadius: 20,
        alignItems: 'center',
        borderWidth: 1,
        position: 'relative',
        minHeight: 180,
    },
    iconContainer: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#f0f0f0',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    icon: {
        fontSize: 32,
    },
    badgeName: {
        fontSize: 14,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 4,
    },
    badgeDesc: {
        fontSize: 11,
        textAlign: 'center',
    },
    lockBadge: {
        position: 'absolute',
        top: 10,
        right: 10,
    },
    lockIcon: {
        fontSize: 12,
    },

    // Badge Progress
    badgeProgressContainer: {
        width: '100%',
        marginTop: 10,
    },
    progressBarBg: {
        height: 6,
        borderRadius: 3,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        borderRadius: 3,
    },
    badgeProgressText: {
        fontSize: 10,
        textAlign: 'center',
        marginTop: 4,
        fontWeight: '600',
    },
});

export default BadgesScreen;
