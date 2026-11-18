jest.mock('expo-notifications', () => ({
    setNotificationHandler: jest.fn(),
    getPermissionsAsync: jest.fn(),
    requestPermissionsAsync: jest.fn(),
    setNotificationChannelAsync: jest.fn(() => Promise.resolve()),
    cancelAllScheduledNotificationsAsync: jest.fn(() => Promise.resolve()),
    scheduleNotificationAsync: jest.fn(() => Promise.resolve('id')),
    AndroidImportance: { HIGH: 4 },
    AndroidNotificationPriority: { HIGH: 'high' },
    SchedulableTriggerInputTypes: { DATE: 'date' },
}));

import * as Notifications from 'expo-notifications';
import {
    scheduleNotifications,
    registerForPushNotificationsAsync,
} from '../src/services/NotificationService';

const granted = () => Notifications.getPermissionsAsync.mockResolvedValue({ status: 'granted' });
const calls = () => Notifications.scheduleNotificationAsync.mock.calls.map(([arg]) => arg);

beforeEach(() => {
    jest.clearAllMocks();
    Notifications.cancelAllScheduledNotificationsAsync.mockImplementation(() => Promise.resolve());
    Notifications.scheduleNotificationAsync.mockImplementation(() => Promise.resolve('id'));
    granted();
});

afterEach(() => jest.useRealTimers());

describe('scheduleNotifications', () => {
    it('cancels everything and schedules nothing when disabled', async () => {
        await scheduleNotifications(false, 'daily', 'en', 19, 0, [1]);
        expect(Notifications.cancelAllScheduledNotificationsAsync).toHaveBeenCalledTimes(1);
        expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
    });

    it('schedules nothing without permission', async () => {
        Notifications.getPermissionsAsync.mockResolvedValue({ status: 'denied' });
        await scheduleNotifications(true, 'daily', 'en', 19, 0, [1]);
        expect(Notifications.cancelAllScheduledNotificationsAsync).toHaveBeenCalled();
        expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
    });

    it('daily: schedules a 14 day window of date triggers at the chosen time', async () => {
        jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate'] }).setSystemTime(new Date('2026-03-10T08:00:00'));
        await scheduleNotifications(true, 'daily', 'en', 19, 30, [1]);
        const all = calls();
        expect(all).toHaveLength(14);
        all.forEach((c) => {
            expect(c.trigger.type).toBe('date');
            expect(c.trigger.channelId).toBe('default');
            expect(c.trigger.date.getHours()).toBe(19);
            expect(c.trigger.date.getMinutes()).toBe(30);
        });
        const first = all[0].trigger.date;
        const last = all[13].trigger.date;
        expect(Math.round((last - first) / 86400000)).toBe(13);
    });

    it('daily: skips today when the time has already passed', async () => {
        jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate'] }).setSystemTime(new Date('2026-03-10T20:00:00'));
        await scheduleNotifications(true, 'daily', 'en', 19, 0, [1]);
        const all = calls();
        expect(all).toHaveLength(13);
        expect(all[0].trigger.date.getDate()).toBe(11);
    });

    it('daily: never repeats a message back to back', async () => {
        await scheduleNotifications(true, 'daily', 'en', 3, 0, [1]);
        const bodies = calls().map((c) => c.content.body);
        for (let i = 1; i < bodies.length; i += 1) expect(bodies[i]).not.toBe(bodies[i - 1]);
        expect(new Set(bodies).size).toBeGreaterThan(1);
    });

    it('uses the language title and falls back to English', async () => {
        await scheduleNotifications(true, 'daily', 'tr', 3, 0, [1]);
        expect(calls()[0].content.title).toBe('Keepr Temizlik Vakti!');
        jest.clearAllMocks();
        granted();
        await scheduleNotifications(true, 'daily', 'zz', 3, 0, [1]);
        expect(calls()[0].content.title).toBe('Keepr Cleanup Time!');
    });

    it('weekly: only selected weekdays (1=Sunday ... 7=Saturday) inside a 56 day window', async () => {
        // 2026-03-10 is a Tuesday. Sunday=1 and Wednesday=4 are selected.
        jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate'] }).setSystemTime(new Date('2026-03-10T08:00:00'));
        await scheduleNotifications(true, 'weekly', 'en', 19, 0, [1, 4]);
        const dates = calls().map((c) => c.trigger.date);
        expect(dates).toHaveLength(16);
        dates.forEach((d) => expect([0, 3]).toContain(d.getDay()));
        const span = (dates[dates.length - 1] - dates[0]) / 86400000;
        expect(span).toBeLessThanOrEqual(56);
        expect(dates[0].getDay()).toBe(3);
        expect(dates[0].getDate()).toBe(11);
    });

    it('serializes overlapping calls (no interleaving of cancel and schedule)', async () => {
        const order = [];
        Notifications.cancelAllScheduledNotificationsAsync.mockImplementation(async () => { order.push('cancel'); });
        Notifications.scheduleNotificationAsync.mockImplementation(async () => { order.push('schedule'); return 'id'; });
        await Promise.all([
            scheduleNotifications(true, 'daily', 'en', 3, 0, [1]),
            scheduleNotifications(true, 'daily', 'en', 3, 0, [1]),
        ]);
        const secondCancel = order.lastIndexOf('cancel');
        const before = order.slice(0, secondCancel);
        expect(before.filter((x) => x === 'cancel')).toHaveLength(1);
        expect(before.filter((x) => x === 'schedule').length).toBeGreaterThan(0);
    });

    it('keeps working after a failed run', async () => {
        Notifications.cancelAllScheduledNotificationsAsync.mockRejectedValueOnce(new Error('fail'));
        await expect(scheduleNotifications(true, 'daily', 'en', 3, 0, [1])).rejects.toThrow('fail');
        await expect(scheduleNotifications(true, 'daily', 'en', 3, 0, [1])).resolves.toBeUndefined();
        expect(Notifications.scheduleNotificationAsync).toHaveBeenCalled();
    });
});

describe('registerForPushNotificationsAsync', () => {
    it('returns granted without prompting when already granted', async () => {
        await expect(registerForPushNotificationsAsync()).resolves.toBe('granted');
        expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();
    });

    it('prompts and returns the resulting status', async () => {
        Notifications.getPermissionsAsync.mockResolvedValue({ status: 'undetermined' });
        Notifications.requestPermissionsAsync.mockResolvedValue({ status: 'denied' });
        await expect(registerForPushNotificationsAsync()).resolves.toBe('denied');
    });

    it('returns null instead of throwing on errors', async () => {
        const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
        Notifications.getPermissionsAsync.mockRejectedValue(new Error('boom'));
        await expect(registerForPushNotificationsAsync()).resolves.toBeNull();
        warn.mockRestore();
    });
});
