jest.mock('@react-native-async-storage/async-storage', () =>
    require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('expo-localization', () => ({
    getLocales: () => [{ languageCode: 'xx' }],
}));

import useSettingsStore from '../src/store/useSettingsStore';

const s = () => useSettingsStore.getState();
const initialState = useSettingsStore.getState();

beforeEach(() => {
    jest.useRealTimers();
    useSettingsStore.setState(initialState, true);
});

describe('useSettingsStore defaults', () => {
    it('defaults to system theme, English for unsupported locales, notifications off', () => {
        expect(s().theme).toBe('system');
        expect(s().language).toBe('en');
        expect(s().notificationsEnabled).toBe(false);
        expect(s().keepList).toEqual([]);
    });
});

describe('keepList', () => {
    it('adds without duplicates, adds many, removes and clears', () => {
        s().addToKeepList('a');
        s().addToKeepList('a');
        expect(s().keepList).toEqual(['a']);
        s().addManyToKeepList(['a', 'b', 'c']);
        expect([...s().keepList].sort()).toEqual(['a', 'b', 'c']);
        s().removeFromKeepList('b');
        expect([...s().keepList].sort()).toEqual(['a', 'c']);
        s().clearKeepList();
        expect(s().keepList).toEqual([]);
    });
});

describe('toggles', () => {
    it('toggleMediaType never leaves zero types selected', () => {
        s().toggleMediaType('video');
        expect(s().mediaTypes).toEqual(['photo']);
        s().toggleMediaType('photo');
        expect(s().mediaTypes).toEqual(['photo']);
        s().toggleMediaType('video');
        expect([...s().mediaTypes].sort()).toEqual(['photo', 'video']);
    });

    it('toggleWeekday keeps at least one day and keeps the list sorted', () => {
        s().toggleWeekday(1);
        expect(s().notificationWeekdays).toEqual([1]);
        s().toggleWeekday(5);
        s().toggleWeekday(3);
        expect(s().notificationWeekdays).toEqual([1, 3, 5]);
        s().toggleWeekday(1);
        expect(s().notificationWeekdays).toEqual([3, 5]);
    });

    it('toggleAlbum adds and removes', () => {
        s().toggleAlbum('x');
        expect(s().selectedAlbums).toEqual(['x']);
        s().toggleAlbum('x');
        expect(s().selectedAlbums).toEqual([]);
    });
});

describe('updateLifetimeStats', () => {
    const session = { savedSpace: 10, deletedCount: 2, keptCount: 3 };

    afterEach(() => jest.useRealTimers());

    it('accumulates totals and starts a streak', () => {
        jest.useFakeTimers().setSystemTime(new Date('2026-03-10T12:00:00'));
        s().updateLifetimeStats(session);
        s().updateLifetimeStats(session);
        const stats = s().lifetimeStats;
        expect(stats.totalSavedSpace).toBe(20);
        expect(stats.totalDeletedCount).toBe(4);
        expect(stats.totalKeptCount).toBe(6);
        expect(stats.sessionsCompleted).toBe(2);
        expect(stats.streakDays).toBe(1);
    });

    it('extends the streak on consecutive days and resets after a gap', () => {
        jest.useFakeTimers().setSystemTime(new Date('2026-03-10T12:00:00'));
        s().updateLifetimeStats(session);
        jest.setSystemTime(new Date('2026-03-11T12:00:00'));
        s().updateLifetimeStats(session);
        expect(s().lifetimeStats.streakDays).toBe(2);
        jest.setSystemTime(new Date('2026-03-14T12:00:00'));
        s().updateLifetimeStats(session);
        expect(s().lifetimeStats.streakDays).toBe(1);
    });

    it('is idempotent for the same session id', () => {
        s().updateLifetimeStats(session, 'sess-1');
        s().updateLifetimeStats(session, 'sess-1');
        expect(s().lifetimeStats.sessionsCompleted).toBe(1);
        s().updateLifetimeStats(session, 'sess-2');
        expect(s().lifetimeStats.sessionsCompleted).toBe(2);
    });
});
