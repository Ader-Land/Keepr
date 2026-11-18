import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';

const sumSize = (items) =>
    items.reduce((sum, item) => sum + (parseFloat(item.fileSize) || 0), 0);

// Session statistics are always derived from the queues, so they can never drift.
const deriveStats = (keepQueue, deleteQueue) => ({
    savedSpace: sumSize(deleteQueue),
    deletedCount: deleteQueue.length,
    keptCount: keepQueue.length,
});

// Only the fields the UI really needs are persisted, to keep the stored JSON small.
const SLIM_KEYS = [
    'id', 'uri', 'localUri', 'mediaType', 'filename',
    'width', 'height', 'duration', 'creationTime', 'albumId', 'fileSize',
];
const slim = (asset) => {
    const out = {};
    SLIM_KEYS.forEach((key) => {
        if (asset[key] !== undefined) out[key] = asset[key];
    });
    return out;
};

// Swiping and size look-ups change the store very often. Writes are debounced and
// flushed as soon as the app leaves the foreground.
const createDebouncedStorage = (delay = 400) => {
    const pending = new Map();
    const timers = new Map();

    const flush = async (name) => {
        clearTimeout(timers.get(name));
        timers.delete(name);
        if (!pending.has(name)) return;
        const value = pending.get(name);
        pending.delete(name);
        await AsyncStorage.setItem(name, value);
    };

    AppState.addEventListener('change', (state) => {
        if (state !== 'active') {
            Array.from(pending.keys()).forEach((name) => {
                flush(name).catch(() => { /* best effort: next write will retry */ });
            });
        }
    });

    return {
        getItem: (name) => AsyncStorage.getItem(name),
        setItem: (name, value) => {
            pending.set(name, value);
            clearTimeout(timers.get(name));
            timers.set(name, setTimeout(() => {
                flush(name).catch(() => { /* best effort: next write will retry */ });
            }, delay));
            return Promise.resolve();
        },
        removeItem: (name) => {
            pending.delete(name);
            clearTimeout(timers.get(name));
            timers.delete(name);
            return AsyncStorage.removeItem(name);
        },
    };
};

const emptySession = {
    keepQueue: [],
    deleteQueue: [],
    currentIndex: 0,
    stats: { savedSpace: 0, deletedCount: 0, keptCount: 0 },
};

const useMediaStore = create(
    persist(
        (set) => ({
            assets: [],
            ...emptySession,

            /**
             * Replaces the deck with freshly fetched assets while keeping the work
             * that was already done: assets that were swiped stay at the front of the
             * list (so undo and the progress bar keep working) and are never offered again.
             */
            setAssets: (freshAssets) => set((state) => {
                const decided = new Map();
                [...state.keepQueue, ...state.deleteQueue].forEach((a) => decided.set(a.id, a));

                const reviewed = state.assets
                    .slice(0, state.currentIndex)
                    .map((a) => decided.get(a.id))
                    .filter(Boolean);
                const remaining = (freshAssets || []).filter((a) => !decided.has(a.id));

                return {
                    assets: [...reviewed, ...remaining],
                    currentIndex: reviewed.length,
                };
            }),

            applySorting: (sortBy) => set((state) => {
                const alreadySwiped = state.assets.slice(0, state.currentIndex);
                const remaining = state.assets.slice(state.currentIndex);

                const sortedRemaining = [...remaining].sort((a, b) => {
                    if (sortBy === 'date-desc') return (b.creationTime || 0) - (a.creationTime || 0);
                    if (sortBy === 'date-asc') return (a.creationTime || 0) - (b.creationTime || 0);
                    if (sortBy === 'size-desc') return (b.fileSize || 0) - (a.fileSize || 0);
                    if (sortBy === 'size-asc') return (a.fileSize || 0) - (b.fileSize || 0);
                    return 0;
                });

                return { assets: [...alreadySwiped, ...sortedRemaining] };
            }),

            // Merges extra info (size, local uri) into an asset wherever it lives.
            updateAssetInfo: (id, info) => set((state) => {
                const updatedInfo = {};
                Object.keys(info || {}).forEach((key) => {
                    if (info[key] !== undefined && info[key] !== null) updatedInfo[key] = info[key];
                });
                if (updatedInfo.fileSize !== undefined) {
                    updatedInfo.fileSize = parseFloat(updatedInfo.fileSize) || 0;
                }

                const merge = (list) => list.map((a) => (a.id === id ? { ...a, ...updatedInfo } : a));
                const keepQueue = merge(state.keepQueue);
                const deleteQueue = merge(state.deleteQueue);

                return {
                    assets: merge(state.assets),
                    keepQueue,
                    deleteQueue,
                    stats: deriveStats(keepQueue, deleteQueue),
                };
            }),

            keepAsset: (asset) => set((state) => {
                if (state.keepQueue.some((a) => a.id === asset.id)) return state;
                const keepQueue = [...state.keepQueue, asset];
                return {
                    keepQueue,
                    currentIndex: state.currentIndex + 1,
                    stats: deriveStats(keepQueue, state.deleteQueue),
                };
            }),

            deleteAsset: (asset) => set((state) => {
                if (state.deleteQueue.some((a) => a.id === asset.id)) return state;
                const assetFromStore = state.assets.find((a) => a.id === asset.id) || asset;
                const deleteQueue = [...state.deleteQueue, { ...assetFromStore }];
                return {
                    deleteQueue,
                    currentIndex: state.currentIndex + 1,
                    stats: deriveStats(state.keepQueue, deleteQueue),
                };
            }),

            undoAction: () => set((state) => {
                if (state.currentIndex === 0) return state;

                const previousIndex = state.currentIndex - 1;
                const lastAsset = state.assets[previousIndex];
                if (!lastAsset) return state;

                const lastDelete = state.deleteQueue[state.deleteQueue.length - 1];
                const lastKeep = state.keepQueue[state.keepQueue.length - 1];

                let keepQueue = state.keepQueue;
                let deleteQueue = state.deleteQueue;

                if (lastDelete && lastDelete.id === lastAsset.id) {
                    deleteQueue = state.deleteQueue.slice(0, -1);
                } else if (lastKeep && lastKeep.id === lastAsset.id) {
                    keepQueue = state.keepQueue.slice(0, -1);
                } else {
                    return state;
                }

                return {
                    currentIndex: previousIndex,
                    keepQueue,
                    deleteQueue,
                    stats: deriveStats(keepQueue, deleteQueue),
                };
            }),

            moveFromDeleteToKeep: (assetIds) => set((state) => {
                const ids = new Set(assetIds);
                const recovered = state.deleteQueue.filter((a) => ids.has(a.id));
                const deleteQueue = state.deleteQueue.filter((a) => !ids.has(a.id));
                const keepQueue = [...state.keepQueue, ...recovered];
                return { deleteQueue, keepQueue, stats: deriveStats(keepQueue, deleteQueue) };
            }),

            // Drops assets that no longer exist on the device (e.g. after a partial delete).
            purgeDeleted: (assetIds) => set((state) => {
                const ids = new Set(assetIds);
                const deleteQueue = state.deleteQueue.filter((a) => !ids.has(a.id));
                const removedBeforeIndex = state.assets
                    .slice(0, state.currentIndex)
                    .filter((a) => ids.has(a.id)).length;

                return {
                    assets: state.assets.filter((a) => !ids.has(a.id)),
                    currentIndex: Math.max(0, state.currentIndex - removedBeforeIndex),
                    deleteQueue,
                    stats: deriveStats(state.keepQueue, deleteQueue),
                };
            }),

            // Ends the session. Unreviewed assets stay in the deck, reviewed ones are dropped.
            resetSession: () => set((state) => ({
                assets: state.assets.slice(state.currentIndex),
                ...emptySession,
            })),
        }),
        {
            name: 'keepr-session',
            version: 1,
            storage: createJSONStorage(createDebouncedStorage),
            // The deck itself is re-fetched on start; only the decisions are stored.
            partialize: (state) => ({
                keepQueue: state.keepQueue.map(slim),
                deleteQueue: state.deleteQueue.map(slim),
                reviewedIds: state.assets.slice(0, state.currentIndex).map((a) => a.id),
            }),
            merge: (persisted, current) => {
                const saved = persisted || {};
                const keepQueue = Array.isArray(saved.keepQueue) ? saved.keepQueue : [];
                const deleteQueue = Array.isArray(saved.deleteQueue) ? saved.deleteQueue : [];

                const byId = new Map([...keepQueue, ...deleteQueue].map((a) => [a.id, a]));
                const reviewed = (saved.reviewedIds || []).map((id) => byId.get(id)).filter(Boolean);

                return {
                    ...current,
                    keepQueue,
                    deleteQueue,
                    assets: reviewed,
                    currentIndex: reviewed.length,
                    stats: deriveStats(keepQueue, deleteQueue),
                };
            },
        }
    )
);

export default useMediaStore;
