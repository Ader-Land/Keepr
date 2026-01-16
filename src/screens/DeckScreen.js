import React, { useCallback, useMemo } from 'react';
import { StyleSheet, View, Text, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useGallery } from '../hooks/useGallery';
import { useTranslation } from '../hooks/useTranslation';
import useMediaStore from '../store/useMediaStore';
import useSettingsStore from '../store/useSettingsStore';
import SwipeCard from '../components/SwipeCard';
import StatsDashboard from '../components/StatsDashboard';
import OnboardingModal from '../components/OnboardingModal';
import { getColors } from '../theme/colors';

const DeckScreen = ({ navigation }) => {
    const { theme, onboardingCompleted } = useSettingsStore();
    const { t, language } = useTranslation();
    const { loading, permissionStatus, fetchAssets } = useGallery();
    const { assets, currentIndex, keepAsset, deleteAsset, deleteQueue, undoAction } = useMediaStore();

    const isDark = theme === 'dark';
    const colors = getColors(theme);

    const swipeLabels = useMemo(() => ({
        keep: t('keep'),
        delete: t('delete'),
    }), [t]);

    const handleSwipeLeft = useCallback((asset) => {
        deleteAsset(asset);
    }, [deleteAsset]);

    const handleSwipeRight = useCallback((asset) => {
        const { addToKeepList } = useSettingsStore.getState();
        addToKeepList(asset.id);
        keepAsset(asset);
    }, [keepAsset]);

    const handleUndo = useCallback(() => {
        if (currentIndex === 0) return;

        const lastAsset = assets[currentIndex - 1];
        const { keepQueue } = useMediaStore.getState();
        const { removeFromKeepList } = useSettingsStore.getState();

        // Eğer son işlem bir "Keep" ise persistent listeden de çıkar
        const isLastActionKeep = keepQueue.length > 0 && keepQueue[keepQueue.length - 1].id === lastAsset.id;

        if (isLastActionKeep) {
            removeFromKeepList(lastAsset.id);
        }

        undoAction();
    }, [currentIndex, assets, undoAction]);

    const visibleAssets = useMemo(() => {
        return (assets || []).slice(currentIndex, currentIndex + 3).reverse();
    }, [assets, currentIndex]);

    if (permissionStatus !== 'granted') {
        return (
            <View style={[styles.centered, { backgroundColor: colors.bg }]}>
                <Text style={[styles.text, { color: colors.text }]}>
                    {t('permission_required')}
                </Text>
                <TouchableOpacity style={styles.button} onPress={fetchAssets}>
                    <Text style={styles.buttonText}>{t('grant_permission')}</Text>
                </TouchableOpacity>
            </View>
        );
    }

    if (loading && (assets || []).length === 0) {
        return (
            <View style={[styles.centered, { backgroundColor: colors.bg }]}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={[styles.text, { color: colors.text, marginTop: 20 }]}>
                    {t('loading_media')}
                </Text>
                <Text style={[styles.subText, { color: colors.text, opacity: 0.6, fontSize: 13, marginBottom: 20 }]}>
                    {t('sd_card_warning')}
                </Text>
                <TouchableOpacity
                    style={[styles.button, { backgroundColor: isDark ? '#333' : '#E0E0E0' }]}
                    onPress={() => {
                        const { setSelectedAlbums } = useSettingsStore.getState();
                        setSelectedAlbums([]);
                        fetchAssets();
                    }}
                >
                    <Text style={[styles.buttonText, { color: colors.text }]}>
                        {t('reset_filters')}
                    </Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top', 'left', 'right', 'bottom']}>
            <View style={[styles.header, { borderBottomColor: colors.border, backgroundColor: colors.bg }]}>
                <View style={styles.headerLeft}>
                    <TouchableOpacity onPress={() => navigation.navigate('Settings')} style={styles.iconButton}>
                        <Text style={styles.iconText}>⚙️</Text>
                    </TouchableOpacity>

                    {/* [YENİ] Geri Al Butonu */}
                    <TouchableOpacity
                        onPress={handleUndo}
                        style={[styles.iconButton, currentIndex === 0 && { opacity: 0.3 }]}
                        disabled={currentIndex === 0}
                    >
                        <Text style={styles.iconText}>↩️</Text>
                    </TouchableOpacity>
                </View>

                <Text style={styles.headerTitle}>Keepr</Text>

                <View style={styles.headerRight}>
                    <TouchableOpacity onPress={() => navigation.navigate('Badges')} style={styles.iconButton}>
                        <Text style={styles.iconText}>🏆</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.reviewButton}
                        onPress={() => navigation.navigate('Summary')}
                    >
                        <View style={[styles.binBadge, { backgroundColor: isDark ? '#333' : '#E0E0E0' }]}>
                            <Text style={[styles.reviewButtonText, { color: colors.text }]}>
                                {t('bin')} ({(deleteQueue || []).length})
                            </Text>
                        </View>
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.deckContainer}>
                {visibleAssets.length > 0 ? (
                    visibleAssets.map((asset, index) => {
                        const actualIndex = visibleAssets.length - 1 - index;
                        const isTopCard = actualIndex === 0;
                        return (
                            <SwipeCard
                                key={asset.id}
                                asset={asset}
                                onSwipeLeft={handleSwipeLeft}
                                onSwipeRight={handleSwipeRight}
                                style={{ zIndex: actualIndex === 0 ? 10 : 1 }}
                                isActive={isTopCard}
                                labels={swipeLabels}
                            />
                        );
                    })
                ) : (
                    <View style={styles.centered}>
                        <Text style={[styles.text, { color: colors.text }]}>
                            {t('all_caught_up')}
                        </Text>
                        {(deleteQueue || []).length > 0 && (
                            <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('Summary')}>
                                <Text style={styles.buttonText}>{t('review_bin')} ({(deleteQueue || []).length})</Text>
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity
                            style={[styles.button, { marginTop: 10, backgroundColor: isDark ? '#333' : '#E0E0E0' }]}
                            onPress={() => fetchAssets()}
                        >
                            <Text style={[styles.buttonText, { color: colors.text }]}>
                                {t('refresh_gallery')}
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>

            <StatsDashboard />

            <OnboardingModal
                visible={!onboardingCompleted}
                onClose={() => { }} // Store inside will handle closing via persistence
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        height: 60,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        borderBottomWidth: 1,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconButton: {
        padding: 5,
    },
    iconText: {
        fontSize: 22,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: '900',
        color: '#FF5252',
        letterSpacing: -1,
    },
    reviewButton: {
        padding: 5,
    },
    binBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    reviewButtonText: {
        fontWeight: '600',
    },
    deckContainer: {
        flex: 1,
        position: 'relative',
        marginVertical: 10,
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    text: {
        fontSize: 18,
        textAlign: 'center',
        marginBottom: 20,
    },
    button: {
        backgroundColor: '#FF5252',
        paddingHorizontal: 30,
        paddingVertical: 15,
        borderRadius: 30,
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});

export default DeckScreen;
