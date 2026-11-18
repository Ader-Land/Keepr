import React, { useState, useEffect } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TouchableOpacity,
    FlatList,
    Image,
    Dimensions,
    Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as MediaLibrary from 'expo-media-library';
import { useTranslation } from '../hooks/useTranslation';
import { createLimiter } from '../utils/async';
import useSettingsStore from '../store/useSettingsStore';
import { getColors } from '../theme/colors';

const { width } = Dimensions.get('window');
const COLUMN_COUNT = 3;
const ITEM_SIZE = width / COLUMN_COUNT;

// Look-ups run a few at a time, and only for thumbnails that are actually on screen.
const thumbLimiter = createLimiter(4);

const KeepThumb = React.memo(function KeepThumb({ assetId, canPrune, onRemove, removeLabel }) {
    const removeFromKeepList = useSettingsStore((state) => state.removeFromKeepList);
    const [uri, setUri] = useState(null);

    useEffect(() => {
        let cancelled = false;

        thumbLimiter(async () => {
            try {
                const info = await MediaLibrary.getAssetInfoAsync(assetId);
                if (cancelled) return;
                if (info) {
                    setUri(info.uri);
                } else if (canPrune) {
                    // The asset really is gone (deleted outside the app), so forget it.
                    removeFromKeepList(assetId);
                }
            } catch {
                // A failed look-up may be temporary (busy storage); keep the entry and retry later.
            }
        });

        return () => {
            cancelled = true;
        };
    }, [assetId, canPrune, removeFromKeepList]);

    return (
        <View style={styles.itemContainer}>
            {uri ? <Image source={{ uri }} style={styles.image} /> : <View style={[styles.image, styles.placeholder]} />}
            <TouchableOpacity
                style={styles.removeBadge}
                onPress={() => onRemove(assetId)}
                accessibilityRole="button"
                accessibilityLabel={removeLabel}
            >
                <Text style={styles.removeBadgeText} importantForAccessibility="no">✕</Text>
            </TouchableOpacity>
        </View>
    );
});

const KeepListScreen = ({ navigation }) => {
    const { theme, keepList, removeFromKeepList, clearKeepList } = useSettingsStore();
    const { t } = useTranslation();
    // Entries are only pruned when the library is fully readable; with limited access
    // a missing asset may just be outside the user's selection.
    const [canPrune, setCanPrune] = useState(false);

    const colors = getColors(theme);

    useEffect(() => {
        let cancelled = false;
        MediaLibrary.getPermissionsAsync()
            .then((res) => {
                if (!cancelled) setCanPrune(res.status === 'granted' && res.accessPrivileges !== 'limited');
            })
            .catch(() => { /* stay on the safe side: never prune */ });
        return () => {
            cancelled = true;
        };
    }, []);

    const handleRemove = (assetId) => {
        Alert.alert(
            t('remove_from_list'),
            t('remove_from_list_confirm'),
            [
                { text: t('cancel'), style: 'cancel' },
                {
                    text: t('remove'),
                    onPress: () => removeFromKeepList(assetId),
                    style: 'destructive'
                }
            ]
        );
    };

    const handleClearAll = () => {
        Alert.alert(
            t('clear_all'),
            t('clear_all_confirm'),
            [
                { text: t('cancel'), style: 'cancel' },
                {
                    text: t('clear'),
                    onPress: clearKeepList,
                    style: 'destructive'
                }
            ]
        );
    };

    const renderItem = ({ item }) => (
        <KeepThumb
            assetId={item}
            canPrune={canPrune}
            onRemove={handleRemove}
            removeLabel={t('remove')}
        />
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top', 'left', 'right', 'bottom']}>
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    style={styles.backButton}
                    accessibilityRole="button"
                    accessibilityLabel={t('back')}
                >
                    <Text style={[styles.backButtonText, { color: colors.text }]}>←</Text>
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>
                    {t('keep_list')}
                </Text>
                {(keepList || []).length > 0 ? (
                    <TouchableOpacity onPress={handleClearAll} style={styles.clearButton}>
                        <Text style={{ color: colors.primary, fontWeight: 'bold' }}>{t('reset')}</Text>
                    </TouchableOpacity>
                ) : (
                    <View style={{ width: 40 }} />
                )}
            </View>

            {(keepList || []).length === 0 ? (
                <View style={styles.centered}>
                    <Text style={[styles.emptyText, { color: colors.subText }]}>
                        {t('keep_list_empty')}
                    </Text>
                    <Text style={[styles.emptySubText, { color: colors.subText }]}>
                        {t('keep_list_empty_desc')}
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={keepList}
                    renderItem={renderItem}
                    keyExtractor={(item) => item}
                    initialNumToRender={18}
                    maxToRenderPerBatch={12}
                    windowSize={7}
                    removeClippedSubviews
                    numColumns={COLUMN_COUNT}
                    contentContainerStyle={styles.listContent}
                />
            )}
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
    headerTitle: { fontSize: 18, fontWeight: 'bold' },
    clearButton: { padding: 5 },
    listContent: { padding: 2, paddingBottom: 60 },
    itemContainer: {
        width: ITEM_SIZE - 4,
        height: ITEM_SIZE - 4,
        margin: 2,
        position: 'relative',
    },
    image: {
        width: '100%',
        height: '100%',
        borderRadius: 8,
    },
    placeholder: { backgroundColor: 'rgba(128,128,128,0.25)' },
    removeBadge: {
        position: 'absolute',
        top: 5,
        right: 5,
        backgroundColor: 'rgba(0,0,0,0.6)',
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)',
    },
    removeBadgeText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: 'bold',
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 10,
    },
    emptySubText: {
        fontSize: 14,
        textAlign: 'center',
    },
});

export default KeepListScreen;
