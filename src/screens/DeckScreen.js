import React, { useCallback, useEffect, useMemo } from 'react';
import { StyleSheet, View, Text, ActivityIndicator, TouchableOpacity, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useGallery, ensureAssetInfo } from '../hooks/useGallery';
import { useTranslation } from '../hooks/useTranslation';
import useMediaStore from '../store/useMediaStore';
import useSettingsStore from '../store/useSettingsStore';
import SwipeCard from '../components/SwipeCard';
import StatsDashboard from '../components/StatsDashboard';
import OnboardingModal from '../components/OnboardingModal';
import { getColors } from '../theme/colors';

const GalleryProgressBar = ({ current, total, colors, t }) => {
    if (total <= 0) return null;
    const progress = current / total;
    return (
        <View style={deckStyles.galleryProgressContainer}>
            <View style={deckStyles.galleryProgressRow}>
                <Text style={[deckStyles.galleryProgressLabel, { color: colors.subText }]}>
                    📸 {current} / {total} {t('reviewed')}
                </Text>
                <Text style={[deckStyles.galleryProgressPercent, { color: colors.primary }]}>
                    %{Math.round(progress * 100)}
                </Text>
            </View>
            <View style={[deckStyles.galleryBarBg, { backgroundColor: colors.progressBg }]}>
                <View
                    style={[
                        deckStyles.galleryBarFill,
                        {
                            width: `${Math.max(progress * 100, 1)}%`,
                            backgroundColor: progress >= 1 ? colors.secondary : colors.primary,
                        },
                    ]}
                />
            </View>
        </View>
    );
};

const DeckScreen = ({ navigation }) => {
    const { theme, onboardingCompleted } = useSettingsStore();
    const { t } = useTranslation();
    const { loading, hasPermission, canAskAgain, fetchAssets } = useGallery();
    const { assets, currentIndex, keepAsset, deleteAsset, deleteQueue, undoAction } = useMediaStore();

    const colors = getColors(theme);

    const swipeLabels = useMemo(() => ({
        keep: t('keep'),
        delete: t('delete'),
    }), [t]);

    const handleSwipeLeft = useCallback((asset) => {
        deleteAsset(asset);
        // The freed-space statistic needs the file size, make sure it is known.
        ensureAssetInfo([asset]);
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

        // If the last action was a "keep", also remove it from the persistent keep list.
        const isLastActionKeep = keepQueue.length > 0 && keepQueue[keepQueue.length - 1].id === lastAsset.id;

        if (isLastActionKeep) {
            removeFromKeepList(lastAsset.id);
        }

        undoAction();
    }, [currentIndex, assets, undoAction]);

    const visibleAssets = useMemo(() => {
        return (assets || []).slice(currentIndex, currentIndex + 3).reverse();
    }, [assets, currentIndex]);

    // Size and local uri are loaded lazily, so prepare the cards that are about to be shown.
    useEffect(() => {
        ensureAssetInfo(visibleAssets);
    }, [visibleAssets]);

    if (hasPermission === null) {
        return (
            <View style={[styles.centered, { backgroundColor: colors.bg }]}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    if (!hasPermission) {
        return (
            <View style={[styles.centered, { backgroundColor: colors.bg }]}>
                <Text style={[styles.text, { color: colors.text }]}>
                    {t('permission_required')}
                </Text>
                <TouchableOpacity
                    style={styles.button}
                    accessibilityRole="button"
                    onPress={() => {
                        // Android stops showing the system dialog after repeated denials.
                        if (canAskAgain) fetchAssets();
                        else Linking.openSettings();
                    }}
                >
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
                    style={[styles.button, { backgroundColor: colors.buttonBg }]}
                    accessibilityRole="button"
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
                    <TouchableOpacity
                        onPress={() => navigation.navigate('Settings')}
                        style={styles.iconButton}
                        accessibilityRole="button"
                        accessibilityLabel={t('settings')}
                    >
                        <Text style={styles.iconText}>⚙️</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={handleUndo}
                        accessibilityRole="button"
                        accessibilityLabel={t('undo')}
                        accessibilityState={{ disabled: currentIndex === 0 }}
                        style={[styles.iconButton, currentIndex === 0 && { opacity: 0.3 }]}
                        disabled={currentIndex === 0}
                    >
                        <Text style={styles.iconText}>↩️</Text>
                    </TouchableOpacity>
                </View>

                <Text style={styles.headerTitle} accessibilityRole="header">{t('app_name')}</Text>

                <View style={styles.headerRight}>
                    <TouchableOpacity
                        onPress={() => navigation.navigate('Badges')}
                        style={styles.iconButton}
                        accessibilityRole="button"
                        accessibilityLabel={t('badges')}
                    >
                        <Text style={styles.iconText}>🏆</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.reviewButton}
                        accessibilityRole="button"
                        accessibilityLabel={`${t('bin')} (${(deleteQueue || []).length})`}
                        onPress={() => navigation.navigate('Summary')}
                    >
                        <View style={[styles.binBadge, { backgroundColor: colors.buttonBg }]}>
                            <Text style={[styles.reviewButtonText, { color: colors.text }]}>
                                {t('bin')} ({(deleteQueue || []).length})
                            </Text>
                        </View>
                    </TouchableOpacity>
                </View>
            </View>

            <GalleryProgressBar
                current={currentIndex}
                total={(assets || []).length}
                colors={colors}
                t={t}
            />

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
                            style={[styles.button, { marginTop: 10, backgroundColor: colors.buttonBg }]}
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
                onClose={() => { /* the modal stores its own completion state */ }}
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

const deckStyles = StyleSheet.create({
    galleryProgressContainer: {
        paddingHorizontal: 20,
        paddingVertical: 8,
    },
    galleryProgressRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    galleryProgressLabel: {
        fontSize: 12,
        fontWeight: '600',
    },
    galleryProgressPercent: {
        fontSize: 13,
        fontWeight: 'bold',
    },
    galleryBarBg: {
        height: 6,
        borderRadius: 3,
        overflow: 'hidden',
    },
    galleryBarFill: {
        height: '100%',
        borderRadius: 3,
    },
});

export default DeckScreen;
