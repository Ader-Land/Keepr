import React, { useState } from 'react';
import { StyleSheet, View, Text, FlatList, Image, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as MediaLibrary from 'expo-media-library';
import { useTranslation } from '../hooks/useTranslation';
import useMediaStore from '../store/useMediaStore';
import useSettingsStore from '../store/useSettingsStore';
import { getColors } from '../theme/colors';

const SummaryScreen = ({ navigation }) => {
    const { deleteQueue, resetSession, moveFromDeleteToKeep, stats } = useMediaStore();
    const { theme } = useSettingsStore();
    const { t, language } = useTranslation();
    const [selectedIds, setSelectedIds] = useState([]); // IDs to EXCLUDE from deletion (to be kept)

    const isDark = theme === 'dark';
    const colors = getColors(theme);

    const toggleSelect = (id) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handleEmptyTrash = async () => {
        const itemsToKeep = deleteQueue.filter(a => selectedIds.includes(a.id));
        const itemsToDelete = deleteQueue.filter(a => !selectedIds.includes(a.id));

        if (itemsToDelete.length === 0) {
            if (itemsToKeep.length > 0) {
                moveFromDeleteToKeep(selectedIds);
                navigation.navigate('Deck');
            }
            return;
        }

        Alert.alert(
            t("empty_trash"),
            t("empty_trash_confirm_detailed", { deleteCount: itemsToDelete.length, keepCount: itemsToKeep.length }),
            [
                { text: t("cancel"), style: "cancel" },
                {
                    text: t("delete"),
                    style: "destructive",
                    onPress: async () => {
                        try {
                            if (itemsToKeep.length > 0) {
                                moveFromDeleteToKeep(selectedIds);
                            }

                            const assetIdsToDelete = itemsToDelete.map(a => a.id);
                            const success = await MediaLibrary.deleteAssetsAsync(assetIdsToDelete);

                            if (success) {
                                // Get the LATEST stats from store after moveFromDeleteToKeep updates it
                                const latestStats = useMediaStore.getState().stats;

                                const reportStats = {
                                    totalSavedSpace: latestStats.savedSpace,
                                    totalDeletedCount: latestStats.deletedCount,
                                };
                                resetSession();
                                navigation.navigate('Celebration', reportStats);
                            }
                        } catch (error) {
                            console.error("Deletion failed:", error);
                            Alert.alert(t("error"), t("delete_error"));
                        }
                    }
                }
            ]
        );
    };

    const renderItem = React.useCallback(({ item }) => {
        const isSelected = selectedIds.includes(item.id);
        return (
            <TouchableOpacity
                style={styles.thumbnailContainer}
                onPress={() => toggleSelect(item.id)}
                activeOpacity={0.8}
            >
                <Image
                    source={{ uri: item.uri }}
                    style={[
                        styles.thumbnail,
                        isSelected && { borderWidth: 3, borderColor: colors.secondary }
                    ]}
                />

                {isSelected && (
                    <View style={[styles.statusBadge, { backgroundColor: colors.secondary }]}>
                        <Text style={styles.statusText}>{t('keep')}</Text>
                    </View>
                )}

                {!isSelected && (
                    <View style={[styles.statusBadge, { backgroundColor: colors.primary }]}>
                        <Text style={styles.statusText}>{t('delete')}</Text>
                    </View>
                )}

                {item.mediaType === 'video' && (
                    <View style={styles.videoIcon}>
                        <Text style={styles.videoText}>▶</Text>
                    </View>
                )}
            </TouchableOpacity>
        );
    }, [selectedIds, colors, t]);

    const deleteCount = deleteQueue.length - selectedIds.length;

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top', 'left', 'right', 'bottom']}>
            <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
                <View style={styles.headerTop}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <Text style={[styles.backText, { color: colors.text }]}>←</Text>
                    </TouchableOpacity>
                    <Text style={[styles.title, { color: colors.text }]}>
                        {t('review_trash')}
                    </Text>
                </View>
                <Text style={[styles.subtitle, { color: colors.subText }]}>
                    {t('items_summary', { deleteCount, keepCount: selectedIds.length })}
                </Text>
            </View>

            <FlatList
                data={deleteQueue}
                renderItem={renderItem}
                keyExtractor={(item) => item.id}
                numColumns={3}
                contentContainerStyle={styles.list}
            />

            <View style={[styles.footer, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
                <TouchableOpacity
                    style={[styles.keepButton, { backgroundColor: isDark ? '#333' : '#E0E0E0' }]}
                    onPress={() => navigation.goBack()}
                >
                    <Text style={[styles.keepButtonText, { color: colors.text }]}>
                        {t('cancel')}
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[
                        styles.deleteButton,
                        deleteCount === 0 && selectedIds.length === 0 && styles.disabledButton
                    ]}
                    onPress={handleEmptyTrash}
                    disabled={deleteCount === 0 && selectedIds.length === 0}
                >
                    <Text style={styles.deleteButtonText}>
                        {deleteCount > 0
                            ? t('delete_items_count', { count: deleteCount })
                            : t('keep_all')}
                    </Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        padding: 20,
        borderBottomWidth: 1,
    },
    headerTop: {
        flexDirection: 'row',
        alignItems: 'center',
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
        fontSize: 24,
        fontWeight: 'bold',
    },
    subtitle: {
        fontSize: 14,
        marginTop: 6,
    },
    list: {
        padding: 4,
    },
    thumbnailContainer: {
        flex: 1 / 3,
        aspectRatio: 1,
        padding: 4,
        position: 'relative',
    },
    thumbnail: {
        flex: 1,
        borderRadius: 12,
    },
    statusBadge: {
        position: 'absolute',
        top: 10,
        left: 10,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        zIndex: 2,
    },
    statusText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: 'bold',
    },
    videoIcon: {
        position: 'absolute',
        bottom: 10,
        right: 10,
        backgroundColor: 'rgba(0,0,0,0.5)',
        width: 20,
        height: 20,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    videoText: {
        color: '#fff',
        fontSize: 12,
        marginLeft: 2,
    },
    footer: {
        padding: 20,
        flexDirection: 'row',
        gap: 12,
        borderTopWidth: 1,
    },
    deleteButton: {
        flex: 2,
        backgroundColor: '#FF5252',
        padding: 16,
        borderRadius: 15,
        alignItems: 'center',
        justifyContent: 'center',
    },
    deleteButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    keepButton: {
        flex: 1,
        padding: 16,
        borderRadius: 15,
        alignItems: 'center',
        justifyContent: 'center',
    },
    keepButtonText: {
        fontSize: 16,
        fontWeight: '600',
    },
    disabledButton: {
        opacity: 0.5,
    }
});

export default SummaryScreen;
