jest.mock('@react-native-async-storage/async-storage', () =>
    require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

import useMediaStore from '../src/store/useMediaStore';

const mk = (id, extra = {}) => ({ id, uri: `file://${id}`, mediaType: 'photo', ...extra });
const A = mk('a1', { fileSize: 100 });
const B = mk('a2', { fileSize: 200 });
const C = mk('a3', { fileSize: 300 });
const D = mk('a4', { fileSize: 400 });

const initial = {
    assets: [],
    keepQueue: [],
    deleteQueue: [],
    currentIndex: 0,
    stats: { savedSpace: 0, deletedCount: 0, keptCount: 0 },
};
const s = () => useMediaStore.getState();

beforeEach(() => {
    useMediaStore.setState(initial);
    s().setAssets([A, B, C, D]);
});

describe('useMediaStore swipe actions', () => {
    it('setAssets loads the deck from index 0', () => {
        expect(s().assets.map((a) => a.id)).toEqual(['a1', 'a2', 'a3', 'a4']);
        expect(s().currentIndex).toBe(0);
    });

    it('keepAsset advances and derives stats', () => {
        s().keepAsset(A);
        expect(s().currentIndex).toBe(1);
        expect(s().keepQueue).toHaveLength(1);
        expect(s().stats).toEqual({ savedSpace: 0, deletedCount: 0, keptCount: 1 });
    });

    it('deleteAsset advances and sums saved space', () => {
        s().deleteAsset(A);
        s().deleteAsset(B);
        expect(s().currentIndex).toBe(2);
        expect(s().stats).toEqual({ savedSpace: 300, deletedCount: 2, keptCount: 0 });
    });

    it('does not double count the same asset', () => {
        s().deleteAsset(A);
        s().deleteAsset(A);
        s().keepAsset(B);
        s().keepAsset(B);
        expect(s().deleteQueue).toHaveLength(1);
        expect(s().keepQueue).toHaveLength(1);
        expect(s().currentIndex).toBe(2);
    });

    it('deleteAsset prefers the store copy (with size info) over the argument', () => {
        s().updateAssetInfo('a1', { fileSize: '555' });
        s().deleteAsset({ id: 'a1' });
        expect(s().deleteQueue[0].fileSize).toBe(555);
        expect(s().stats.savedSpace).toBe(555);
    });
});

describe('useMediaStore undo', () => {
    it('undoes a delete', () => {
        s().deleteAsset(A);
        s().undoAction();
        expect(s().currentIndex).toBe(0);
        expect(s().deleteQueue).toHaveLength(0);
        expect(s().stats.deletedCount).toBe(0);
    });

    it('undoes a keep', () => {
        s().keepAsset(A);
        s().undoAction();
        expect(s().currentIndex).toBe(0);
        expect(s().keepQueue).toHaveLength(0);
    });

    it('undoes only the most recent action', () => {
        s().keepAsset(A);
        s().deleteAsset(B);
        s().undoAction();
        expect(s().currentIndex).toBe(1);
        expect(s().keepQueue.map((a) => a.id)).toEqual(['a1']);
        expect(s().deleteQueue).toHaveLength(0);
    });

    it('is a no-op at index 0', () => {
        const before = s();
        s().undoAction();
        expect(s().currentIndex).toBe(0);
        expect(s().keepQueue).toBe(before.keepQueue);
    });
});

describe('useMediaStore queues and sorting', () => {
    it('moveFromDeleteToKeep recovers items and re-derives stats', () => {
        s().deleteAsset(A);
        s().deleteAsset(B);
        s().moveFromDeleteToKeep(['a1']);
        expect(s().deleteQueue.map((a) => a.id)).toEqual(['a2']);
        expect(s().keepQueue.map((a) => a.id)).toEqual(['a1']);
        expect(s().stats).toEqual({ savedSpace: 200, deletedCount: 1, keptCount: 1 });
    });

    it('purgeDeleted removes assets and keeps the index valid', () => {
        s().deleteAsset(A);
        s().deleteAsset(B);
        s().purgeDeleted(['a1']);
        expect(s().assets.map((a) => a.id)).toEqual(['a2', 'a3', 'a4']);
        expect(s().currentIndex).toBe(1);
        expect(s().deleteQueue.map((a) => a.id)).toEqual(['a2']);
        expect(s().stats.deletedCount).toBe(1);
    });

    it('applySorting only sorts the not yet reviewed part', () => {
        s().keepAsset(A);
        s().applySorting('size-desc');
        expect(s().assets.map((a) => a.id)).toEqual(['a1', 'a4', 'a3', 'a2']);
        s().applySorting('size-asc');
        expect(s().assets.map((a) => a.id)).toEqual(['a1', 'a2', 'a3', 'a4']);
    });

    it('updateAssetInfo updates the deck and queues, ignoring null values', () => {
        s().deleteAsset(A);
        s().updateAssetInfo('a1', { fileSize: '1000', localUri: null });
        expect(s().assets[0].fileSize).toBe(1000);
        expect(s().assets[0].localUri).toBeUndefined();
        expect(s().deleteQueue[0].fileSize).toBe(1000);
        expect(s().stats.savedSpace).toBe(1000);
    });
});

describe('useMediaStore setAssets reconcile', () => {
    it('keeps reviewed assets in front and never offers decided assets again', () => {
        s().keepAsset(A);
        s().deleteAsset(B);
        s().setAssets([A, B, C, D, mk('a5')]);
        expect(s().assets.map((a) => a.id)).toEqual(['a1', 'a2', 'a3', 'a4', 'a5']);
        expect(s().currentIndex).toBe(2);
    });

    it('does not offer decided assets again when the fresh list is different', () => {
        s().keepAsset(A);
        s().setAssets([A, C, D]);
        expect(s().assets.map((a) => a.id)).toEqual(['a1', 'a3', 'a4']);
        expect(s().currentIndex).toBe(1);
    });

    it('handles undefined input', () => {
        s().setAssets(undefined);
        expect(s().assets).toEqual([]);
    });
});

describe('useMediaStore resetSession', () => {
    it('keeps unreviewed assets and clears queues and stats', () => {
        s().keepAsset(A);
        s().deleteAsset(B);
        s().resetSession();
        expect(s().assets.map((a) => a.id)).toEqual(['a3', 'a4']);
        expect(s().currentIndex).toBe(0);
        expect(s().keepQueue).toEqual([]);
        expect(s().deleteQueue).toEqual([]);
        expect(s().stats).toEqual({ savedSpace: 0, deletedCount: 0, keptCount: 0 });
    });
});

describe('useMediaStore persistence', () => {
    const opts = () => useMediaStore.persist.getOptions();

    it('partialize stores slim queues and reviewed ids only', () => {
        s().keepAsset({ ...A, extra: 'x'.repeat(50), exif: { a: 1 } });
        s().deleteAsset(B);
        const saved = opts().partialize(s());
        expect(Object.keys(saved).sort()).toEqual(['deleteQueue', 'keepQueue', 'reviewedIds']);
        expect(saved.reviewedIds).toEqual(['a1', 'a2']);
        expect(saved.keepQueue[0].extra).toBeUndefined();
        expect(saved.keepQueue[0].exif).toBeUndefined();
        expect(saved.keepQueue[0].id).toBe('a1');
    });

    it('merge rebuilds the reviewed deck head and stats from persisted data', () => {
        const persisted = { keepQueue: [A], deleteQueue: [B], reviewedIds: ['a1', 'a2'] };
        const merged = opts().merge(persisted, s());
        expect(merged.assets.map((a) => a.id)).toEqual(['a1', 'a2']);
        expect(merged.currentIndex).toBe(2);
        expect(merged.stats).toEqual({ savedSpace: 200, deletedCount: 1, keptCount: 1 });
    });

    it('merge tolerates empty or corrupt persisted state', () => {
        expect(opts().merge(undefined, s()).currentIndex).toBe(0);
        const merged = opts().merge({ keepQueue: 'bad', deleteQueue: null, reviewedIds: ['zz'] }, s());
        expect(merged.keepQueue).toEqual([]);
        expect(merged.deleteQueue).toEqual([]);
        expect(merged.assets).toEqual([]);
    });
});
