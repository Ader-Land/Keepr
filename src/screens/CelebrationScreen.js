import React, { useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withRepeat,
    withSequence,
    withTiming
} from 'react-native-reanimated';
import { useTranslation } from '../hooks/useTranslation';
import useSettingsStore from '../store/useSettingsStore';
import { getColors, isDarkTheme } from '../theme/colors';

const { width } = Dimensions.get('window');

const CelebrationScreen = ({ route, navigation }) => {
    const { totalSavedSpace = 0, totalDeletedCount = 0, totalKeptCount = 0 } = route.params || {};
    const { theme, updateLifetimeStats, awardBadge } = useSettingsStore();
    const { t, language } = useTranslation();
    const [newBadges, setNewBadges] = React.useState([]);

    const isDark = isDarkTheme(theme);
    const colors = getColors(theme);

    const scale = useSharedValue(0);
    const opacity = useSharedValue(0);
    const bounce = useSharedValue(0);

    const badgeScale = useSharedValue(0);
    const badgeOpacity = useSharedValue(0);

    useEffect(() => {
        // Update stats
        updateLifetimeStats({
            savedSpace: totalSavedSpace,
            deletedCount: totalDeletedCount,
            keptCount: totalKeptCount,
        });

        // Small delay for badge checks to ensure lifetime stats are updated
        setTimeout(() => {
            const currentStats = useSettingsStore.getState().lifetimeStats;
            const currentBadges = useSettingsStore.getState().earnedBadges;
            const newlyEarned = [];

            const checkBadge = (id, condition) => {
                if (!currentBadges.includes(id) && condition) {
                    awardBadge(id);
                    newlyEarned.push(id);
                }
            };

            // Volume Badges
            const mb = 1024 * 1024;
            const gb = 1024 * mb;
            checkBadge('first_step', currentStats.totalSavedSpace >= 100 * mb);
            checkBadge('breather', currentStats.totalSavedSpace >= 1 * gb);
            checkBadge('storage_master', currentStats.totalSavedSpace >= 10 * gb);
            checkBadge('digital_minimalist', currentStats.totalSavedSpace >= 50 * gb);

            // Action/Streak
            checkBadge('loyal_user', currentStats.streakDays >= 7);
            checkBadge('big_clean', totalDeletedCount > 0);
            if (totalDeletedCount >= 50) checkBadge('determined_sorter', true);
            checkBadge('collector', currentStats.totalKeptCount >= 50);

            // Fun
            const hour = new Date().getHours();
            if (hour >= 0 && hour <= 5) checkBadge('night_owl', true);
            if (totalDeletedCount === 0) checkBadge('perfect_gallery', true);

            if (newlyEarned.length > 0) {
                setNewBadges(newlyEarned);
                badgeScale.value = withSpring(1);
                badgeOpacity.value = withTiming(1, { duration: 500 });
            }
        }, 300);

        scale.value = withSpring(1);
        opacity.value = withTiming(1, { duration: 1000 });
        bounce.value = withRepeat(
            withSequence(
                withTiming(-10, { duration: 500 }),
                withTiming(0, { duration: 500 })
            ),
            -1,
            true
        );
    }, []);

    const animatedCardStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
        opacity: opacity.value,
    }));

    const animatedIconStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: bounce.value }],
    }));

    const animatedBadgeStyle = useAnimatedStyle(() => ({
        transform: [{ scale: badgeScale.value }],
        opacity: badgeOpacity.value,
    }));

    const formatSize = (bytes) => {
        const val = parseFloat(bytes);
        if (isNaN(val) || val <= 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(val) / Math.log(k));
        return parseFloat((val / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
            <View style={styles.content}>
                <Animated.View style={[styles.iconContainer, animatedIconStyle]}>
                    <Text style={styles.emoji}>🎉</Text>
                </Animated.View>

                {newBadges.length > 0 && (
                    <Animated.View style={[styles.badgeNotification, { backgroundColor: colors.badgeTitle }, animatedBadgeStyle]}>
                        <Text style={styles.badgeText}>🏆 {t('new_badge_earned')}</Text>
                    </Animated.View>
                )}

                <Animated.View style={[styles.card, { backgroundColor: colors.card }, animatedCardStyle]}>
                    <Text style={[styles.title, { color: colors.primary }]}>
                        {t('great_job')}
                    </Text>
                    <Text style={[styles.message, { color: colors.text }]}>
                        {t('cleanup_completed')}
                    </Text>

                    <View style={styles.statsRow}>
                        <View style={styles.statItem}>
                            <Text style={[styles.statLabel, { color: colors.subText }]}>
                                {t('freed_space')}
                            </Text>
                            <Text style={[styles.statValue, { color: colors.secondary }]}>
                                {formatSize(totalSavedSpace)}
                            </Text>
                        </View>
                        <View style={styles.divider} />
                        <View style={styles.statItem}>
                            <Text style={[styles.statLabel, { color: colors.subText }]}>
                                {t('items_deleted')}
                            </Text>
                            <Text style={[styles.statValue, { color: colors.text }]}>
                                {totalDeletedCount}
                            </Text>
                        </View>
                    </View>

                    <Text style={[styles.quote, { color: colors.subText }]}>
                        {t('gallery_lighter')}
                    </Text>
                </Animated.View>

                <TouchableOpacity
                    style={styles.button}
                    onPress={() => navigation.navigate('Deck')}
                >
                    <Text style={styles.buttonText}>{t('back_to_home')}</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    content: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
    iconContainer: { marginBottom: 20 },
    emoji: { fontSize: 80 },
    card: {
        width: width * 0.9,
        borderRadius: 25,
        padding: 30,
        alignItems: 'center',
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
    },
    title: { fontSize: 32, fontWeight: '900', marginBottom: 10 },
    message: { fontSize: 16, textAlign: 'center', marginBottom: 30, fontWeight: '500' },
    statsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        marginBottom: 30,
    },
    statItem: { flex: 1, alignItems: 'center' },
    statLabel: { fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 5 },
    statValue: { fontSize: 22, fontWeight: '900' },
    divider: { width: 1, height: 40, backgroundColor: '#eee', opacity: 0.2 },
    quote: { fontSize: 14, fontStyle: 'italic', textAlign: 'center' },
    button: {
        marginTop: 40,
        backgroundColor: '#FF5252',
        paddingHorizontal: 40,
        paddingVertical: 18,
        borderRadius: 30,
        width: width * 0.8,
        alignItems: 'center',
    },
    buttonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
    badgeNotification: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 20,
        marginBottom: 20,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 5,
    },
    badgeText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    }
});

export default CelebrationScreen;
