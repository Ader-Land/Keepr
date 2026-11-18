/**
 * Small async helpers shared by the gallery hook and the keep-list screen.
 */

/** Rejects with Error(label) when `promise` does not settle within `ms`. */
export const withTimeout = (promise, ms, label = 'TIMEOUT') => {
    let timer;
    const timeout = new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(label)), ms);
    });
    return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
};

/**
 * Creates a limiter that runs at most `max` async tasks at the same time.
 * Usage: const limit = createLimiter(4); await limit(() => doWork());
 */
export const createLimiter = (max) => {
    let active = 0;
    const queue = [];

    const next = () => {
        if (active >= max || queue.length === 0) return;
        active += 1;
        const { task, resolve, reject } = queue.shift();
        task()
            .then(resolve, reject)
            .finally(() => {
                active -= 1;
                next();
            });
    };

    return (task) =>
        new Promise((resolve, reject) => {
            queue.push({ task, resolve, reject });
            next();
        });
};
