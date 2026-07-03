import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
    DeleteCommand,
    DeleteCommandInput,
    DeleteCommandOutput,
    DynamoDBDocumentClient,
    GetCommand,
    GetCommandInput,
    GetCommandOutput,
    PutCommand,
    PutCommandInput,
    PutCommandOutput,
    QueryCommand,
    QueryCommandInput,
    QueryCommandOutput,
    ScanCommand,
    ScanCommandInput,
    ScanCommandOutput,
    UpdateCommand,
    UpdateCommandInput,
    UpdateCommandOutput,
} from '@aws-sdk/lib-dynamodb';
import dynoexpr from '@tuplo/dynoexpr';
import type { IDynoexprArgs } from '@tuplo/dynoexpr';
import {
    getAwsAccountId,
    getAwsClientConfig,
    getAwsRegion,
    isDev,
} from '@lib/aws-client-config';
import { assertLocalHasIamPermission } from '@lib/serverless-local';
import type {
    DynamoExpressionOptions,
    DynamoItem,
    DynamoKey,
} from '@lib/types/dynamodb.type';
import { IamAction } from '@lib/types/sls.type';

export type {
    DynamoExpressionOptions,
    DynamoItem,
    DynamoKey,
} from '@lib/types/dynamodb.type';

export const dynamoClient = new DynamoDBClient(getAwsClientConfig(process.env.DYNAMODB_ENDPOINT));

export const dynamoDocumentClient = DynamoDBDocumentClient.from(dynamoClient, {
    marshallOptions: {
        removeUndefinedValues: true,
    },
});

const withExpressions = <TInput extends object>(input: TInput): TInput =>
    dynoexpr<TInput>(input as TInput & IDynoexprArgs);

type DynamoCommandAccess = {
    action: IamAction;
    resource: string;
};

type DynamoDocumentCommand = object & {
    input?: unknown;
};

const getDynamoResource = (
    tableName: string,
    indexName?: string,
): string => {
    const tableArn = `arn:aws:dynamodb:${getAwsRegion()}:${getAwsAccountId()}:table/${tableName}`;

    return indexName
        ? `${tableArn}/index/${indexName}`
        : tableArn;
};

const getDynamoCommandAccess = (
    action: IamAction,
    tableName: string,
    indexName?: unknown,
): DynamoCommandAccess => ({
    action,
    resource: getDynamoResource(
        tableName,
        typeof indexName === 'string' ? indexName : undefined,
    ),
});

const assertLocalCanSendDynamoCommand = async (
    access?: DynamoCommandAccess,
): Promise<void> => {
    if (!isDev) {
        return;
    }

    if (!access) {
        throw new Error('Cannot assert local IAM permission for DynamoDB command');
    }

    await assertLocalHasIamPermission(access.action, access.resource);
};

export const getItem = async <TItem = DynamoItem>(
    tableName: string,
    key: DynamoKey,
    options: DynamoExpressionOptions<GetCommandInput> = {},
): Promise<TItem | undefined> =>
    getDB(tableName).get<TItem>(key, options);

export const putItem = async <TItem extends object>(
    tableName: string,
    item: TItem,
    options: DynamoExpressionOptions<PutCommandInput> = {},
): Promise<PutCommandOutput> =>
    getDB(tableName).put(item, options);

export const updateItem = async <TItem = DynamoItem>(
    tableName: string,
    key: DynamoKey,
    options: DynamoExpressionOptions<UpdateCommandInput>,
): Promise<TItem | undefined> =>
    getDB(tableName).update<TItem>(key, options);

export const deleteItem = async <TItem = DynamoItem>(
    tableName: string,
    key: DynamoKey,
    options: DynamoExpressionOptions<DeleteCommandInput> = {},
): Promise<TItem | undefined> =>
    getDB(tableName).delete<TItem>(key, options);

export const queryItems = async <TItem = DynamoItem>(
    tableName: string,
    options: DynamoExpressionOptions<QueryCommandInput>,
): Promise<TItem[]> =>
    getDB(tableName).query<TItem>(options);

export const scanItems = async <TItem = DynamoItem>(
    tableName: string,
    options: DynamoExpressionOptions<ScanCommandInput> = {},
): Promise<TItem[]> =>
    getDB(tableName).scan<TItem>(options);

export const sendDynamoCommand = async <TOutput>(
    command: DynamoDocumentCommand,
    access?: DynamoCommandAccess,
): Promise<TOutput> => {
    await assertLocalCanSendDynamoCommand(access);

    return dynamoDocumentClient.send(
        command as Parameters<typeof dynamoDocumentClient.send>[0],
    ) as Promise<TOutput>;
};

export const getDB = (tableName: string) => ({
    get: async <TItem = DynamoItem>(
        key: DynamoKey,
        options: DynamoExpressionOptions<GetCommandInput> = {},
    ): Promise<TItem | undefined> => {
        const response = await sendDynamoCommand<GetCommandOutput>(
            new GetCommand(withExpressions<GetCommandInput>({
                ...options,
                TableName: tableName,
                Key: key,
            })),
            getDynamoCommandAccess(IamAction.DYNAMODB_GET_ITEM, tableName),
        );

        return response.Item as TItem | undefined;
    },

    put: async <TItem extends object>(
        item: TItem,
        options: DynamoExpressionOptions<PutCommandInput> = {},
    ): Promise<PutCommandOutput> =>
        sendDynamoCommand<PutCommandOutput>(
            new PutCommand(withExpressions<PutCommandInput>({
                ...options,
                TableName: tableName,
                Item: item as DynamoItem,
            })),
            getDynamoCommandAccess(IamAction.DYNAMODB_PUT_ITEM, tableName),
        ),

    update: async <TItem = DynamoItem>(
        key: DynamoKey,
        options: DynamoExpressionOptions<UpdateCommandInput>,
    ): Promise<TItem | undefined> => {
        const response = await sendDynamoCommand<UpdateCommandOutput>(
            new UpdateCommand(withExpressions<UpdateCommandInput>({
                ...options,
                TableName: tableName,
                Key: key,
            })),
            getDynamoCommandAccess(IamAction.DYNAMODB_UPDATE_ITEM, tableName),
        );

        return response.Attributes as TItem | undefined;
    },

    delete: async <TItem = DynamoItem>(
        key: DynamoKey,
        options: DynamoExpressionOptions<DeleteCommandInput> = {},
    ): Promise<TItem | undefined> => {
        const response = await sendDynamoCommand<DeleteCommandOutput>(
            new DeleteCommand(withExpressions<DeleteCommandInput>({
                ...options,
                TableName: tableName,
                Key: key,
            })),
            getDynamoCommandAccess(IamAction.DYNAMODB_DELETE_ITEM, tableName),
        );

        return response.Attributes as TItem | undefined;
    },

    query: async <TItem = DynamoItem>(
        options: DynamoExpressionOptions<QueryCommandInput>,
    ): Promise<TItem[]> => {
        const response = await sendDynamoCommand<QueryCommandOutput>(
            new QueryCommand(withExpressions<QueryCommandInput>({
                ...options,
                TableName: tableName,
            })),
            getDynamoCommandAccess(IamAction.DYNAMODB_QUERY, tableName, options.IndexName),
        );

        return (response.Items ?? []) as TItem[];
    },

    scan: async <TItem = DynamoItem>(
        options: DynamoExpressionOptions<ScanCommandInput> = {},
    ): Promise<TItem[]> => {
        const response = await sendDynamoCommand<ScanCommandOutput>(
            new ScanCommand(withExpressions<ScanCommandInput>({
                ...options,
                TableName: tableName,
            })),
            getDynamoCommandAccess(IamAction.DYNAMODB_SCAN, tableName, options.IndexName),
        );

        return (response.Items ?? []) as TItem[];
    },

    send: sendDynamoCommand,
});
