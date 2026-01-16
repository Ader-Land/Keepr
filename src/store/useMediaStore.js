import { create } from 'zustand';

const useMediaStore = create((set) => ({
    assets: [],
    keepQueue: [],
    deleteQueue: [],
    currentIndex: 0,
    stats: {
        savedSpace: 0,
        deletedCount: 0,
        keptCount: 0,
    },

    setAssets: (assets) => set({ assets, currentIndex: 0 }),

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

        return {
            assets: [...alreadySwiped, ...sortedRemaining]
        };
    }),

    updateAssetInfo: (id, info) => set((state) => {
        const updatedInfo = {
            ...info,
            fileSize: info.fileSize ? parseFloat(info.fileSize) : undefined
        };

        const updatedAssets = (state.assets || []).map(a =>
            a.id === id ? { ...a, ...updatedInfo } : a
        );

        const updatedDeleteQueue = (state.deleteQueue || []).map(a =>
            a.id === id ? { ...a, ...updatedInfo } : a
        );

        const updatedKeepQueue = (state.keepQueue || []).map(a =>
            a.id === id ? { ...a, ...updatedInfo } : a
        );

        // Recalculate total saved space from the current delete queue
        const totalSaved = updatedDeleteQueue.reduce((sum, item) =>
            sum + (parseFloat(item.fileSize) || 0), 0
        );

        return {
            assets: updatedAssets,
            deleteQueue: updatedDeleteQueue,
            keepQueue: updatedKeepQueue,
            stats: {
                ...state.stats,
                savedSpace: totalSaved
            }
        };
    }),

    // updateAssetInfo already logic-merged above

    updateAssets: (updatedAssets) => set((state) => ({
        assets: updatedAssets
    })),

    keepAsset: (asset) => set((state) => ({
        keepQueue: [...state.keepQueue, asset],
        currentIndex: state.currentIndex + 1,
        stats: {
            ...state.stats,
            keptCount: state.stats.keptCount + 1
        }
    })),

    deleteAsset: (asset) => set((state) => {
        const assetFromStore = (state.assets || []).find(a => a.id === asset.id) || asset;
        const newDeleteQueue = [...(state.deleteQueue || []), { ...assetFromStore }];

        const totalSaved = newDeleteQueue.reduce((sum, item) =>
            sum + (parseFloat(item.fileSize) || 0), 0
        );

        return {
            deleteQueue: newDeleteQueue,
            currentIndex: state.currentIndex + 1,
            stats: {
                ...state.stats,
                deletedCount: state.stats.deletedCount + 1,
                savedSpace: totalSaved
            }
        };
    }),

    undoAction: () => set((state) => {
        if (state.currentIndex === 0) return state;

        const previousIndex = state.currentIndex - 1;
        const lastAssetId = state.assets[previousIndex].id;

        const lastInDelete = state.deleteQueue.length > 0 && state.deleteQueue[state.deleteQueue.length - 1].id === lastAssetId;
        const lastInKeep = state.keepQueue.length > 0 && state.keepQueue[state.keepQueue.length - 1].id === lastAssetId;

        if (!lastInDelete && !lastInKeep) return state;

        let newStats = { ...state.stats };
        let newDeleteQueue = [...state.deleteQueue];
        let newKeepQueue = [...state.keepQueue];

        if (lastInDelete) {
            newDeleteQueue.pop();
            newStats.deletedCount = Math.max(0, newStats.deletedCount - 1);
        } else {
            newKeepQueue.pop();
            newStats.keptCount = Math.max(0, newStats.keptCount - 1);
        }

        const totalSaved = newDeleteQueue.reduce((sum, item) =>
            sum + (parseFloat(item.fileSize) || 0), 0
        );
        newStats.savedSpace = totalSaved;

        return {
            currentIndex: previousIndex,
            deleteQueue: newDeleteQueue,
            keepQueue: newKeepQueue,
            stats: newStats
        };
    }),

    moveFromDeleteToKeep: (assetIds) => set((state) => {
        const assetsToRecover = state.deleteQueue.filter(a => assetIds.includes(a.id));
        const newDeleteQueue = state.deleteQueue.filter(a => !assetIds.includes(a.id));

        let recoveredSize = 0;
        assetsToRecover.forEach(a => {
            recoveredSize += (a.fileSize || 0);
        });

        const totalSaved = newDeleteQueue.reduce((sum, item) =>
            sum + (parseFloat(item.fileSize) || 0), 0
        );

        return {
            deleteQueue: newDeleteQueue,
            keepQueue: [...state.keepQueue, ...assetsToRecover],
            stats: {
                ...state.stats,
                deletedCount: Math.max(0, state.stats.deletedCount - assetsToRecover.length),
                keptCount: state.stats.keptCount + assetsToRecover.length,
                savedSpace: totalSaved
            }
        };
    }),

    resetSession: () => set({
        keepQueue: [],
        deleteQueue: [],
        currentIndex: 0,
        stats: {
            savedSpace: 0,
            deletedCount: 0,
            keptCount: 0,
        }
    }),
}));

export default useMediaStore;
