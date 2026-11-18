import { withTimeout, createLimiter } from '../src/utils/async';

describe('withTimeout', () => {
    afterEach(() => jest.useRealTimers());

    it('resolves with the promise value when fast enough', async () => {
        await expect(withTimeout(Promise.resolve(42), 50)).resolves.toBe(42);
    });

    it('rejects with the label after the timeout', async () => {
        jest.useFakeTimers();
        const p = withTimeout(new Promise(() => {}), 100, 'SLOW');
        const assertion = expect(p).rejects.toThrow('SLOW');
        jest.advanceTimersByTime(101);
        await assertion;
    });

    it('propagates the original rejection', async () => {
        await expect(withTimeout(Promise.reject(new Error('boom')), 50)).rejects.toThrow('boom');
    });

    it('clears its timer once settled', async () => {
        jest.useFakeTimers();
        await withTimeout(Promise.resolve(1), 1000);
        expect(jest.getTimerCount()).toBe(0);
    });
});

describe('createLimiter', () => {
    it('never runs more than max tasks at once and returns all results', async () => {
        const limit = createLimiter(2);
        let active = 0;
        let peak = 0;
        const task = (n) => async () => {
            active += 1;
            peak = Math.max(peak, active);
            await new Promise((r) => setTimeout(r, 5));
            active -= 1;
            return n;
        };
        const results = await Promise.all([1, 2, 3, 4, 5, 6].map((n) => limit(task(n))));
        expect(results).toEqual([1, 2, 3, 4, 5, 6]);
        expect(peak).toBe(2);
    });

    it('keeps working after a task fails', async () => {
        const limit = createLimiter(1);
        await expect(limit(() => Promise.reject(new Error('x')))).rejects.toThrow('x');
        await expect(limit(() => Promise.resolve('ok'))).resolves.toBe('ok');
    });
});
