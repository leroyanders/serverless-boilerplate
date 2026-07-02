import path from 'node:path';
import { InvokeCommand, LambdaClient } from '@aws-sdk/client-lambda';
import { execa } from 'execa';

const lambdaClient = new LambdaClient({
    region: process.env.AWS_REGION,
});

const isDev = process.env.NODE_ENV === 'dev';
const projectRoot = process.env.INIT_CWD || process.env.PWD || process.cwd();
const slsBin = path.resolve(
    projectRoot,
    'node_modules',
    '.bin',
    'sls',
);

const toResolverName = (functionName: string): string =>
    functionName.endsWith('Resolver')
        ? functionName
        : `${functionName}Resolver`;

export const invokeFunction = async <TResult, TParams = void>(
    stack: string,
    functionName: string,
    params: TParams,
): Promise<TResult> => {
    const resolverName = toResolverName(functionName);

    if (isDev) {
        const { stdout } = await execa(slsBin, [
            'invoke',
            'local',
            '-f',
            resolverName,
            '--data',
            JSON.stringify(params),
        ], {
            cwd: projectRoot,
        });

        return JSON.parse(stdout) as TResult;
    }

    const command = new InvokeCommand({
        FunctionName: `${stack}-${resolverName}`,
        InvocationType: 'RequestResponse',
        Payload: Buffer.from(JSON.stringify(params)),
    });

    const response = await lambdaClient.send(command);
    const rawPayload = response.Payload
        ? Buffer.from(response.Payload).toString('utf-8')
        : undefined;

    if (!rawPayload) {
        return undefined as TResult;
    }

    const payload = JSON.parse(rawPayload);
    if (payload.errorMessage) {
        throw new Error(payload.errorMessage);
    }

    return payload as TResult;
};