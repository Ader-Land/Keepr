import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { useTranslation } from '../hooks/useTranslation';
import useMediaStore from '../store/useMediaStore';
import useSettingsStore from '../store/useSettingsStore';
import { getColors } from '../theme/colors';

const StatsDashboard = () => {
    const { theme } = useSettingsStore();
    const { stats } = useMediaStore();
    const { t, language } = useTranslation();

    const colors = getColors(theme);

    const formatSize = (bytes) => {
        const val = parseFloat(bytes);
        if (isNaN(val) || val <= 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(val) / Math.log(k));
        return parseFloat((val / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.card }]}>
            <View style={styles.statBox}>
                <Text style={[styles.statLabel, { color: colors.subText }]}>
                    {t('saved_space')}
                </Text>
                <Text style={[styles.statValue, { color: colors.text }]}>{formatSize(stats.savedSpace)}</Text>
            </View>
            <View style={styles.statBox}>
                <Text style={[styles.statLabel, { color: colors.subText }]}>
                    {t('discarded')}
                </Text>
                <Text style={[styles.statValue, { color: colors.text }]}>{stats.deletedCount}</Text>
            </View>
            <View style={styles.statBox}>
                <Text style={[styles.statLabel, { color: colors.subText }]}>
                    {t('kept')}
                </Text>
                <Text style={[styles.statValue, { color: colors.text }]}>{stats.keptCount}</Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingVertical: 15,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        // Shadow for light mode
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 10,
    },
    statBox: {
        alignItems: 'center',
    },
    statLabel: {
        fontSize: 11,
        fontWeight: '600',
        marginBottom: 4,
        textTransform: 'uppercase',
    },
    statValue: {
        fontSize: 18,
        fontWeight: 'bold',
    },
});

export default StatsDashboard;
