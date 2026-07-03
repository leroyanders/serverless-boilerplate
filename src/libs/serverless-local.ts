import path from 'node:path';
import { existsSync } from 'node:fs';
import { execa } from 'execa';
import {
    IamAction,
    IamEffect,
} from '@lib/types/sls.type';

type LocalIamRoleStatement = {
    Effect?: IamEffect;
    Action?: unknown;
    Resource?: unknown;
};

type ServerlessPrintConfig = {
    functions?: Record<string, {
        events?: unknown[];
    }>;
    provider?: {
        iam?: {
            role?: {
                statements?: LocalIamRoleStatement[];
            };
        };
    };
    service?: string;
};

const roleStatementsCache = new Map<string, LocalIamRoleStatement[]>();
const serverlessConfigCache = new Map<string, ServerlessPrintConfig>();

export const getServiceRoot = (): string =>
    process.env.PWD || process.cwd();

export const hasServerlessConfig = (serviceRoot: string): boolean =>
    [
        'serverless.ts',
        'serverless.js',
        'serverless.yml',
        'serverless.yaml',
    ].some((fileName) => existsSync(path.resolve(serviceRoot, fileName)));

const resolveServiceRoot = (
    currentServiceRoot: string,
    serviceName?: string,
): string => {
    if (!serviceName) {
        return currentServiceRoot;
    }

    const candidates = [
        path.resolve(currentServiceRoot, serviceName),
        path.resolve(currentServiceRoot, '..', serviceName),
        path.resolve(currentServiceRoot, '..', `${serviceName}-service`),
        path.resolve(currentServiceRoot, '../../..', 'src/services', serviceName),
        path.resolve(
            currentServiceRoot,
            '../../..',
            'src/services',
            `${serviceName}-service`,
        ),
    ];

    return candidates.find(hasServerlessConfig) ?? currentServiceRoot;
};

const resolveSlsBin = (serviceRoot: string): string => {
    const candidates = [
        process.env.INIT_CWD,
        serviceRoot,
        path.resolve(serviceRoot, '../../..'),
    ]
        .filter((root): root is string => Boolean(root))
        .map((root) => path.resolve(root, 'node_modules', '.bin', 'sls'));

    return candidates.find(existsSync) ?? 'sls';
};

const toStringArray = (value: unknown): string[] => {
    if (value === undefined) {
        return [];
    }

    const values = Array.isArray(value)
        ? value
        : [value];

    return values.filter((item): item is string => typeof item === 'string');
};

const escapeRegExp = (value: string): string =>
    value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const matchesPattern = (
    pattern: string,
    value: string,
): boolean =>
    pattern === '*'
        || pattern === value
        || new RegExp(`^${pattern.split('*').map(escapeRegExp).join('.*')}$`).test(value);

const statementMatches = (
    statement: LocalIamRoleStatement,
    effect: IamEffect,
    action: IamAction,
    resource: string,
): boolean =>
    statement.Effect === effect
        && toStringArray(statement.Action).some((statementAction) =>
            matchesPattern(statementAction.toLowerCase(), action.toLowerCase()))
        && toStringArray(statement.Resource).some((statementResource) =>
            matchesPattern(statementResource, resource));

const getRegion = (): string =>
    process.env.AWS_REGION ?? process.env.AWS_DEFAULT_REGION ?? 'eu-central-1';

const getAccountId = (): string =>
    process.env.AWS_ACCOUNT_ID ?? '000000000000';

const makeLambdaArn = (functionName: string): string =>
    `arn:aws:lambda:${getRegion()}:${getAccountId()}:function:${functionName}`;

const toDeployedFunctionName = (
    serviceName: string,
    functionName: string,
): string =>
    serviceName.endsWith('-service')
        ? serviceName
        : `${serviceName}-${functionName}`;

export const getLocalServerlessConfig = async (
    serviceRoot: string,
): Promise<ServerlessPrintConfig> => {
    const cachedConfig = serverlessConfigCache.get(serviceRoot);

    if (cachedConfig) {
        return cachedConfig;
    }

    const { stdout } = await execa(resolveSlsBin(serviceRoot), [
        'print',
        '--format',
        'json',
    ], {
        cwd: serviceRoot,
        env: {
            ...process.env,
            PWD: serviceRoot,
        },
    });

    const config = JSON.parse(stdout) as ServerlessPrintConfig;

    serverlessConfigCache.set(serviceRoot, config);

    return config;
};

const getLocalIamRoleStatements = async (
    serviceRoot: string,
): Promise<LocalIamRoleStatement[]> => {
    const cachedStatements = roleStatementsCache.get(serviceRoot);

    if (cachedStatements) {
        return cachedStatements;
    }

    const config = await getLocalServerlessConfig(serviceRoot);
    const statements = config.provider?.iam?.role?.statements ?? [];

    roleStatementsCache.set(serviceRoot, statements);

    return statements;
};

export const assertLocalHasIamPermission = async (
    action: IamAction,
    resource: string,
): Promise<void> => {
    const serviceRoot = getServiceRoot();
    const statements = await getLocalIamRoleStatements(serviceRoot);

    if (statements.some((statement) =>
        statementMatches(statement, IamEffect.DENY, action, resource))) {
        throw new Error(`Local IAM permission denied: ${action} for ${resource}`);
    }

    if (!statements.some((statement) =>
        statementMatches(statement, IamEffect.ALLOW, action, resource))) {
        throw new Error(`Missing local IAM permission: ${action} for ${resource}`);
    }
};

export const assertLocalCanInvokeFunction = async (
    functionName: string,
): Promise<void> =>
    assertLocalHasIamPermission(
        IamAction.LAMBDA_INVOKE_FUNCTION,
        makeLambdaArn(functionName),
    );

export const invokeLocalFunction = async (
    functionName: string,
    event: unknown,
    serviceName?: string,
): Promise<string> => {
    const currentServiceRoot = getServiceRoot();
    const serviceRoot = resolveServiceRoot(currentServiceRoot, serviceName);

    if (serviceName) {
        await assertLocalCanInvokeFunction(
            toDeployedFunctionName(serviceName, functionName),
        );
    }

    return invokeLocalFunctionInServiceRoot(functionName, event, serviceRoot);
};

export const invokeLocalFunctionInServiceRoot = async (
    functionName: string,
    event: unknown,
    serviceRoot: string,
): Promise<string> => {
    const { stdout } = await execa(resolveSlsBin(serviceRoot), [
        'invoke',
        'local',
        '-f',
        functionName,
        '--data',
        JSON.stringify(event),
    ], {
        cwd: serviceRoot,
        env: {
            ...process.env,
            PWD: serviceRoot,
        },
    });

    return stdout;
};
