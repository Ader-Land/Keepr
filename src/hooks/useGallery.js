import { useState, useEffect, useCallback, useRef } from 'react';
import { Alert, AppState } from 'react-native';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system/legacy';
import { useTranslation } from './useTranslation';
import useMediaStore from '../store/useMediaStore';
import useSettingsStore from '../store/useSettingsStore';
import { createLimiter, withTimeout } from '../utils/async';

const PAGE_SIZE = 200;
const TARGET_COUNT = 150; // Try to find at least this many showable items
const MAX_SCAN = 5000; // Safety limit so a strange device cannot loop forever
const INFO_TIMEOUT_MS = 10000;
const ALBUM_TIMEOUT_MS = 20000;

const isAllowed = (response) =>
    response?.status === 'granted' || response?.status === 'limited' || response?.granted === true;

// --- Asset info (file size / local uri) --------------------------------------------
// Reading info is comparatively expensive, so it is done lazily: for the cards that
// are about to be shown, for items that are swiped away, and for the whole list only
// when sorting by size. Each asset is looked up at most once per app session.
const infoLimiter = createLimiter(6);
const infoRequests = new Map(); // asset id -> in-flight or finished promise

const loadAssetInfo = (asset) => {
    if (!asset || !asset.id) return Promise.resolve();
    if (infoRequests.has(asset.id)) return infoRequests.get(asset.id);

    const request = infoLimiter(async () => {
        let size = 0;
        let localUri = asset.uri;

        try {
            const info = await withTimeout(
                MediaLibrary.getAssetInfoAsync(asset.id, { shouldDownloadMetadata: true }),
                INFO_TIMEOUT_MS,
                'ASSET_INFO_TIMEOUT'
            );
            size = info?.size || 0;
            localUri = info?.localUri || info?.uri || asset.uri;
        } catch {
            // Info is optional (e.g. a slow SD card): fall through to the file-system fallback.
        }

        if (!size) {
            try {
                const fileInfo = await FileSystem.getInfoAsync(localUri);
                if (fileInfo.exists) size = fileInfo.size || 0;
            } catch {
                // Size stays unknown (0); the asset can still be reviewed normally.
            }
        }

        useMediaStore.getState().updateAssetInfo(asset.id, { fileSize: size, localUri });
    }).catch(() => {
        // The limiter only rejects on unexpected errors; forget the request so it can be retried.
        infoRequests.delete(asset.id);
    });

    infoRequests.set(asset.id, request);
    return request;
};

/** Makes sure size/uri info is loaded for every given asset. Resolves when done. */
export const ensureAssetInfo = (assets) =>
    Promise.all((assets || []).map(loadAssetInfo));

export const useGallery = () => {
    const { t } = useTranslation();
    const [permissionResponse, setPermissionResponse] = useState(null);
    const [permissionChecked, setPermissionChecked] = useState(false);
    const [loading, setLoading] = useState(false);
    const [hydrated, setHydrated] = useState(() => useMediaStore.persist.hasHydrated());

    // Re-run the initial load only when the filters change.
    const mediaTypes = useSettingsStore((state) => state.mediaTypes);
    const selectedAlbums = useSettingsStore((state) => state.selectedAlbums);
    const sortBy = useSettingsStore((state) => state.sortBy);

    const permissionRef = useRef(null);
    const fetchRunRef = useRef(0); // lets a newer fetch cancel the size scan of an older one

    // The stored session must be restored before the deck is replaced, otherwise the
    // restored state would overwrite freshly loaded assets.
    useEffect(() => {
        if (useMediaStore.persist.hasHydrated()) {
            setHydrated(true);
            return undefined;
        }
        return useMediaStore.persist.onFinishHydration(() => setHydrated(true));
    }, []);

    const requestPermissions = useCallback(async () => {
        try {
            const response = await MediaLibrary.requestPermissionsAsync();
            permissionRef.current = response;
            setPermissionResponse(response);
            return response;
        } catch {
            const denied = { status: 'denied', granted: false, canAskAgain: true };
            permissionRef.current = denied;
            setPermissionResponse(denied);
            return denied;
        }
    }, []);

    const fetchAssets = useCallback(async (after = null) => {
        let currentPermission = permissionRef.current;

        if (!isAllowed(currentPermission)) {
            currentPermission = await requestPermissions();
            if (!isAllowed(currentPermission)) return undefined;
        }

        // Read the latest settings at call time so the callback itself stays stable.
        const { mediaTypes: types, selectedAlbums: albums, sortBy: sort, keepList, markAlbumAsFailed } =
            useSettingsStore.getState();
        const { setAssets, applySorting } = useMediaStore.getState();

        const runId = fetchRunRef.current + 1;
        fetchRunRef.current = runId;

        setLoading(true);

        try {
            const mediaType = [];
            if ((types || []).includes('photo')) mediaType.push(MediaLibrary.MediaType.photo);
            if ((types || []).includes('video')) mediaType.push(MediaLibrary.MediaType.video);

            const ascending = sort === 'date-asc';
            const keepSet = new Set(keepList || []);
            const albumFilter = albums || [];

            let collected = [];
            let currentAfter = after;
            let hasNextPage = true;
            let totalScanned = 0;

            while (collected.length < TARGET_COUNT && hasNextPage && totalScanned < MAX_SCAN) {
                const fetchOptions = {
                    first: PAGE_SIZE,
                    after: currentAfter,
                    sortBy: [[MediaLibrary.SortBy.creationTime, ascending]],
                    mediaType,
                };

                if (albumFilter.length === 1) {
                    fetchOptions.album = albumFilter[0];
                }

                const request = MediaLibrary.getAssetsAsync(fetchOptions);
                // A single misbehaving album can hang forever; give it a deadline.
                const result = albumFilter.length === 1
                    ? await withTimeout(request, ALBUM_TIMEOUT_MS, 'TIMEOUT')
                    : await request;

                const batch = result.assets || [];
                totalScanned += batch.length;
                currentAfter = result.endCursor;
                hasNextPage = result.hasNextPage;

                let filtered = batch.filter((asset) => !keepSet.has(asset.id));

                if (albumFilter.length > 1) {
                    filtered = filtered.filter((asset) => albumFilter.includes(asset.albumId));
                }

                collected = collected.concat(filtered);

                if (batch.length === 0) break; // End of gallery
            }

            setAssets(collected);

            if (sort.startsWith('size')) {
                // Sorting by size needs every size up front; sort again as sizes arrive.
                const SCAN_BATCH = 20;
                for (let i = 0; i < collected.length; i += SCAN_BATCH) {
                    if (fetchRunRef.current !== runId) break; // superseded by a newer fetch
                    await ensureAssetInfo(collected.slice(i, i + SCAN_BATCH));
                    if (i === 0) applySorting(sort);
                }
                if (fetchRunRef.current === runId) applySorting(sort);
            }

            return { endCursor: currentAfter, hasNextPage };
        } catch (error) {
            if (error.message === 'TIMEOUT' && (useSettingsStore.getState().selectedAlbums || []).length === 1) {
                markAlbumAsFailed(useSettingsStore.getState().selectedAlbums[0]);
                Alert.alert(t('access_error'), t('album_slow_error'));
            } else {
                Alert.alert(t('error'), t('gallery_load_error'));
            }
            return undefined;
        } finally {
            setLoading(false);
        }
    }, [requestPermissions, t]);

    // Always call the newest fetchAssets from effects without listing it as a dependency.
    const fetchAssetsRef = useRef(fetchAssets);
    useEffect(() => {
        fetchAssetsRef.current = fetchAssets;
    }, [fetchAssets]);

    useEffect(() => {
        if (!hydrated) return;
        let cancelled = false;

        const init = async () => {
            const response = await MediaLibrary.getPermissionsAsync();
            if (cancelled) return;
            permissionRef.current = response;
            setPermissionResponse(response);
            setPermissionChecked(true);

            if (isAllowed(response)) {
                fetchAssetsRef.current();
            } else if (response.canAskAgain !== false) {
                const requested = await requestPermissions();
                if (!cancelled && isAllowed(requested)) fetchAssetsRef.current();
            }
        };
        init();

        return () => {
            cancelled = true;
        };
    }, [hydrated, mediaTypes, selectedAlbums, sortBy, requestPermissions]);

    // The user may grant access in the system settings and come back to the app.
    useEffect(() => {
        const subscription = AppState.addEventListener('change', async (state) => {
            if (state !== 'active' || isAllowed(permissionRef.current)) return;
            const response = await MediaLibrary.getPermissionsAsync();
            permissionRef.current = response;
            setPermissionResponse(response);
            if (isAllowed(response)) fetchAssetsRef.current();
        });
        return () => subscription.remove();
    }, []);

    return {
        loading: loading || !hydrated,
        fetchAssets,
        permissionStatus: permissionResponse?.status,
        // null until the first permission check finished
        hasPermission: permissionChecked ? isAllowed(permissionResponse) : null,
        canAskAgain: permissionResponse?.canAskAgain !== false,
    };
};
