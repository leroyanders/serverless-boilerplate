import path from 'node:path';
import { existsSync } from 'node:fs';
import { execa } from 'execa';

const getServiceRoot = (): string =>
    process.env.PWD || process.cwd();

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

export const invokeLocalFunction = async (
    functionName: string,
    event: unknown,
): Promise<string> => {
    const serviceRoot = getServiceRoot();
    const { stdout } = await execa(resolveSlsBin(serviceRoot), [
        'invoke',
        'local',
        '-f',
        functionName,
        '--data',
        JSON.stringify(event),
    ], {
        cwd: serviceRoot,
    });

    return stdout;
};
