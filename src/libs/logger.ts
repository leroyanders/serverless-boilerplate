import type { Context } from 'aws-lambda';

const log = {
    debug: (...args: unknown[]): void => {
        console.debug(...args);
    },
    error: (...args: unknown[]): void => {
        console.error(...args);
    },
    info: (...args: unknown[]): void => {
        console.info(...args);
    },
};

export const logBeforeTimeout = (
    event: unknown,
    context: Context,
): (() => void) => {
    const timeout = Math.max(context.getRemainingTimeInMillis() - 1000, 0);
    const timer = setTimeout(() => {
        log.error('lambda execution is close to timeout', {
            event,
            remainingTimeInMillis: context.getRemainingTimeInMillis(),
        });
    }, timeout);

    return () => clearTimeout(timer);
};

export default log;
