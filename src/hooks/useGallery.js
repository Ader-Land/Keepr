import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import * as MediaLibrary from 'expo-media-library';
import * as Location from 'expo-location';
import * as FileSystem from 'expo-file-system/legacy';
import { useTranslation } from './useTranslation';
import useMediaStore from '../store/useMediaStore';
import useSettingsStore from '../store/useSettingsStore';

export const useGallery = () => {
    const { t } = useTranslation();
    const [permissionResponse, setPermissionResponse] = useState(null);
    const [loading, setLoading] = useState(false);
    const { setAssets, updateAssetInfo, applySorting } = useMediaStore();
    const { mediaTypes, selectedAlbums, sortBy, markAlbumAsFailed, keepList } = useSettingsStore();

    const requestPermissions = useCallback(async () => {
        try {
            // MediaLibrary permissions for both reading and writing
            const mediaStatus = await MediaLibrary.requestPermissionsAsync();

            // Location permission for image metadata (GPS tags)
            await Location.requestForegroundPermissionsAsync();

            setPermissionResponse(mediaStatus);
            return mediaStatus;
        } catch (err) {
            console.error('[Keepr] Permission error:', err);
            return { status: 'denied', granted: false };
        }
    }, []);

    const fetchAssets = useCallback(async (after = null) => {
        let currentPermission = permissionResponse;

        if (currentPermission?.status !== 'granted' && currentPermission?.status !== 'limited') {
            currentPermission = await requestPermissions();
            if (currentPermission.status !== 'granted' && currentPermission.status !== 'limited') return;
        }

        setLoading(true);

        const securityTimeout = setTimeout(() => {
            setLoading(false);
        }, 30000);

        try {
            const types = [];
            if ((mediaTypes || []).includes('photo')) types.push(MediaLibrary.MediaType.photo);
            if ((mediaTypes || []).includes('video')) types.push(MediaLibrary.MediaType.video);

            let mlSortBy = MediaLibrary.SortBy.creationTime;
            let ascending = false;
            if (sortBy === 'date-asc') ascending = true;

            let allFilteredAssets = [];
            let currentAfter = after;
            let hasNextPage = true;
            let totalScanned = 0;
            const MAX_SCAN = 5000; // Safety limit to avoid infinite loops if device is weird
            const TARGET_COUNT = 150; // We want to find at least 150 showable items

            while (allFilteredAssets.length < TARGET_COUNT && hasNextPage && totalScanned < MAX_SCAN) {
                const fetchOptions = {
                    first: 200, // Batch size
                    after: currentAfter,
                    sortBy: [[mlSortBy, ascending]],
                    mediaType: types,
                };

                if ((selectedAlbums || []).length === 1) {
                    fetchOptions.album = selectedAlbums[0];
                }

                const result = await MediaLibrary.getAssetsAsync(fetchOptions);
                let batchAssets = result.assets || [];

                totalScanned += batchAssets.length;
                currentAfter = result.endCursor;
                hasNextPage = result.hasNextPage;

                // Apply persistent KeepList filtering
                let filteredBatch = batchAssets.filter(asset => !(keepList || []).includes(asset.id));

                // Apply Album multi-filtering if needed
                if ((selectedAlbums || []).length > 1) {
                    filteredBatch = filteredBatch.filter(asset =>
                        (selectedAlbums || []).includes(asset.albumId)
                    );
                }

                allFilteredAssets = [...allFilteredAssets, ...filteredBatch];

                if (batchAssets.length === 0) break; // End of gallery
            }

            setAssets(allFilteredAssets);

            const processSizes = async (items) => {
                const BATCH_SIZE = 10;
                for (let i = 0; i < (items || []).length; i += BATCH_SIZE) {
                    const batch = items.slice(i, i + BATCH_SIZE);

                    await Promise.all(batch.map(async (item) => {
                        try {
                            const infoPromise = MediaLibrary.getAssetInfoAsync(item.id, { shouldDownloadMetadata: true });
                            const assetInfoTimeout = new Promise(resolve => setTimeout(() => resolve(null), 10000));

                            const info = await Promise.race([infoPromise, assetInfoTimeout]);

                            let assetSize = info?.size || 0;
                            let localUri = info?.localUri || info?.uri || item.uri;

                            // Fallback to FileSystem if MediaLibrary gives 0 or null size
                            if (!assetSize || assetSize === 0) {
                                try {
                                    const fileInfo = await FileSystem.getInfoAsync(localUri);
                                    if (fileInfo.exists) {
                                        assetSize = fileInfo.size || 0;
                                    }
                                } catch (fsErr) { }
                            }

                            updateAssetInfo(item.id, {
                                fileSize: assetSize,
                                localUri: localUri
                            });
                        } catch (e) { }
                    }));

                    if (sortBy.startsWith('size') && (i === 10 || i === items.length - 1)) {
                        applySorting(sortBy);
                    }
                }

                if (sortBy.startsWith('size')) {
                    applySorting(sortBy);
                }
            };

            processSizes(allFilteredAssets);

            clearTimeout(securityTimeout);
            return { endCursor: currentAfter, hasNextPage };
        } catch (error) {
            console.error('[Keepr] Fetch assets error:', error);
            if (error.message === 'TIMEOUT' && (selectedAlbums || []).length === 1) {
                const albumId = selectedAlbums[0];
                markAlbumAsFailed(albumId);
                Alert.alert(
                    t('access_error'),
                    t('album_slow_error')
                );
            }
        } finally {
            clearTimeout(securityTimeout);
            setLoading(false);
        }
    }, [permissionResponse, requestPermissions, setAssets, updateAssetInfo, applySorting, mediaTypes, selectedAlbums, sortBy, keepList, markAlbumAsFailed]);

    useEffect(() => {
        const init = async () => {
            const res = await MediaLibrary.getPermissionsAsync();
            setPermissionResponse(res);
            if (res.status === 'granted') {
                fetchAssets();
            } else {
                requestPermissions();
            }
        };
        init();
    }, [mediaTypes, selectedAlbums, sortBy]);

    return { loading, fetchAssets, permissionStatus: permissionResponse?.status };
};
