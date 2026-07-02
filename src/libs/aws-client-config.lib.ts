import path from 'node:path';
import { existsSync } from 'node:fs';
import { config } from 'dotenv';

const loadEnv = (): void => {
    const candidates = [
        process.env.INIT_CWD,
        process.cwd(),
        path.resolve(process.cwd(), '../../..'),
    ]
        .filter((root): root is string => Boolean(root))
        .map((root) => path.resolve(root, '.env'));

    const envPath = candidates.find(existsSync);
    if (envPath) {
        config({
            path: envPath,
            override: true,
            quiet: true,
        });
    }
};

loadEnv();

export const isDev = process.env.NODE_ENV === 'dev';

const LOCAL_AWS_ENDPOINT = 'http://localhost:4566';
const LOCAL_AWS_ACCOUNT_ID = '000000000000';

export const getAwsRegion = (): string =>
    process.env.AWS_REGION
        ?? process.env.AWS_DEFAULT_REGION
        ?? 'eu-central-1';

export const getAwsAccountId = (): string =>
    process.env.AWS_ACCOUNT_ID
        ?? LOCAL_AWS_ACCOUNT_ID;

export const getAwsClientConfig = (endpoint?: string) => ({
    region: getAwsRegion(),
    endpoint: isDev
        ? endpoint ?? process.env.LOCAL_AWS_ENDPOINT ?? LOCAL_AWS_ENDPOINT
        : endpoint,
    credentials: isDev
        ? {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? 'test',
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? 'test',
        }
        : undefined,
});

export const getLocalAwsEndpoint = (): string =>
    process.env.LOCAL_AWS_ENDPOINT ?? LOCAL_AWS_ENDPOINT;
