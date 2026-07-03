import { config } from 'dotenv';

config({
    path: '../../../.env',
    override: true,
    quiet: true,
});

import Aws from 'serverless/aws';
import type {
    CloudFormationResource,
    CloudFormationResources,
    CreateDDBConfig,
    CreateSNSConfig,
    CreateSQSConfig,
    DynamoGsi,
    DynamoKey,
    IamRoleStatement,
    IamRoleStatementGroup,
} from '@lib/types/sls.type';

export type {
    IamRoleStatement,
    IamRoleStatementGroup,
} from '@lib/types/sls.type';
export {
    DynamoKeyType,
    IamAction,
    IamEffect,
} from '@lib/types/sls.type';

export const frameworkVersion = '3';

export const servicePackage = {
    individually: true,
    excludeDevDependencies: true,
} as Aws.Package;

export const custom = {
    dotenv: {
        path: '../.env',
        logging: false,
        variableExpansion: false,
        required: {
            file: true,
        },
    },
    esbuild: {
        bundle: true,
        minify: true,
        platform: 'node',
        tsconfig: '../../../tsconfig.json',
    },
} as Aws.Custom;

export const provider = {
    name: 'aws',
    runtime: 'nodejs20.x',
    region: process.env.AWS_REGION ?? process.env.AWS_DEFAULT_REGION ?? 'eu-central-1',
    stage: process.env.STAGE ?? 'dev',
    apiGateway: {
        shouldStartNameWithService: true,
    },
} as Aws.Provider;

export const plugins = [
    'serverless-dotenv-plugin',
    'serverless-esbuild',
];

export const serverless = {
    frameworkVersion,
    package: servicePackage,
    custom,
    provider,
    plugins,
};

const getRegion = (): string =>
    process.env.AWS_REGION ?? process.env.AWS_DEFAULT_REGION ?? '${aws:region}';

const getAccountId = (): string =>
    process.env.AWS_ACCOUNT_ID ?? '${aws:accountId}';

const getStage = (): string =>
    process.env.STAGE ?? 'dev';

const toResourceName = (name: string, suffix: string): string =>
    `${name
        .split(/[^a-zA-Z0-9]/)
        .filter(Boolean)
        .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
        .join('')}${suffix}`;

const getAttributeDefinitions = (
    key: DynamoKey[],
    gsi: DynamoGsi[] = [],
) => {
    const attributes = [...key, ...gsi.flatMap((index) => index.KeySchema)];
    const uniqueNames = new Set<string>();

    return attributes
        .filter(({ AttributeName }) => {
            if (uniqueNames.has(AttributeName)) {
                return false;
            }

            uniqueNames.add(AttributeName);
            return true;
        })
        .map(({ AttributeName }) => ({
            AttributeName,
            AttributeType: 'S',
        }));
};

export const createDDB = ({
    name,
    key,
    gsi = [],
    resourceName,
}: CreateDDBConfig): CloudFormationResources => ({
    [resourceName ?? toResourceName(name, 'Table')]: {
        Type: 'AWS::DynamoDB::Table',
        Properties: {
            TableName: name,
            BillingMode: 'PAY_PER_REQUEST',
            AttributeDefinitions: getAttributeDefinitions(key, gsi),
            KeySchema: key,
            ...(gsi.length
                ? {
                    GlobalSecondaryIndexes: gsi.map((index) => ({
                        ...index,
                        Projection: index.Projection ?? {
                            ProjectionType: 'ALL',
                        },
                    })),
                }
                : {}),
        },
    },
});

export const ddb = createDDB;

export const createSQS = ({
    name,
    resourceName,
    visibilityTimeout,
}: CreateSQSConfig): CloudFormationResources => ({
    [resourceName ?? toResourceName(name, 'Queue')]: {
        Type: 'AWS::SQS::Queue',
        Properties: {
            QueueName: name,
            ...(visibilityTimeout
                ? { VisibilityTimeout: visibilityTimeout }
                : {}),
        },
    },
});

export const queue = ({
    name,
    resourceName,
    visibilityTimeout,
}: CreateSQSConfig) => {
    const qid = resourceName ?? toResourceName(name, 'Queue');

    return {
        arn: makeSQSArn(name),
        def: createSQS({
            name,
            resourceName: qid,
            visibilityTimeout,
        }),
        name,
        qid,
    };
};

export const createSNS = ({
    name,
    resourceName,
}: CreateSNSConfig): CloudFormationResources => ({
    [resourceName ?? toResourceName(name, 'Topic')]: {
        Type: 'AWS::SNS::Topic',
        Properties: {
            TopicName: name,
        },
    },
});

export const topic = ({
    name,
    resourceName,
}: CreateSNSConfig) => {
    const tid = resourceName ?? toResourceName(name, 'Topic');

    return {
        arn: makeSNSArn(name),
        def: createSNS({
            name,
            resourceName: tid,
        }),
        name,
        tid,
    };
};

export const genApiEndpoint = (service: string): CloudFormationResource => ({
    Type: 'AWS::SSM::Parameter',
    Properties: {
        Name: `/${getStage()}/${service}/domain`,
        Type: 'String',
        Value: {
            'Fn::Join': [
                '',
                [
                    'https://',
                    { Ref: 'ApiGatewayRestApi' },
                    '.execute-api.',
                    { Ref: 'AWS::Region' },
                    '.',
                    { Ref: 'AWS::URLSuffix' },
                    `/${getStage()}`,
                ],
            ],
        },
    },
});

export const makeDBArn = (
    tableName: string,
    resourcePath?: string,
): string => {
    const tableArn = `arn:aws:dynamodb:${getRegion()}:${getAccountId()}:table/${tableName}`;

    return resourcePath
        ? `${tableArn}/${resourcePath}`
        : tableArn;
};

export const makeSQSArn = (queueName: string): string =>
    `arn:aws:sqs:${getRegion()}:${getAccountId()}:${queueName}`;

export const makeSNSArn = (topicName: string): string =>
    `arn:aws:sns:${getRegion()}:${getAccountId()}:${topicName}`;

export const makeLambdaArn = (functionName: string): string =>
    `arn:aws:lambda:${getRegion()}:${getAccountId()}:function:${functionName}`;

const isIamRoleStatement = (
    value: IamRoleStatement | IamRoleStatementGroup,
): value is IamRoleStatement =>
    'Effect' in value;

export const createIamRoleStatements = (
    roles: IamRoleStatementGroup,
): IamRoleStatement[] =>
    Object.values(roles).flatMap((value) =>
        isIamRoleStatement(value)
            ? [value]
            : createIamRoleStatements(value),
    );
