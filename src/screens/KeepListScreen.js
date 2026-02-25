import React, { useState, useEffect } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TouchableOpacity,
    FlatList,
    Image,
    Dimensions,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as MediaLibrary from 'expo-media-library';
import { useTranslation } from '../hooks/useTranslation';
import useSettingsStore from '../store/useSettingsStore';
import { getColors } from '../theme/colors';

const { width } = Dimensions.get('window');
const COLUMN_COUNT = 3;
const ITEM_SIZE = width / COLUMN_COUNT;

const KeepListScreen = ({ navigation }) => {
    const { theme, keepList, removeFromKeepList, clearKeepList } = useSettingsStore();
    const { t, language } = useTranslation();
    const [assets, setAssets] = useState([]);
    const [loading, setLoading] = useState(false);

    const isDark = theme === 'dark';
    const colors = getColors(theme);

    useEffect(() => {
        const fetchKeepListAssets = async () => {
            if ((keepList || []).length === 0) {
                setAssets([]);
                return;
            }
            setLoading(true);
            try {
                const fetchedAssetsPromises = (keepList || []).map(async (id) => {
                    try {
                        const asset = await MediaLibrary.getAssetInfoAsync(id);
                        return asset || null;
                    } catch (e) {
                        removeFromKeepList(id);
                        return null;
                    }
                });

                const results = await Promise.all(fetchedAssetsPromises);
                setAssets(results.filter(a => a !== null));
            } catch (e) {
            } finally {
                setLoading(false);
            }
        };

        fetchKeepListAssets();
    }, [keepList]);

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
        <View style={styles.itemContainer}>
            <Image source={{ uri: item.uri }} style={styles.image} />
            <TouchableOpacity
                style={styles.removeBadge}
                onPress={() => handleRemove(item.id)}
            >
                <Text style={styles.removeBadgeText}>✕</Text>
            </TouchableOpacity>
        </View>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top', 'left', 'right', 'bottom']}>
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
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

            {loading ? (
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : (keepList || []).length === 0 ? (
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
                    data={assets}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.id}
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
