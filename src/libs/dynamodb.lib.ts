import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
    DeleteCommand,
    DeleteCommandInput,
    DeleteCommandOutput,
    DynamoDBDocumentClient,
    GetCommand,
    GetCommandInput,
    PutCommand,
    PutCommandInput,
    PutCommandOutput,
    QueryCommand,
    QueryCommandInput,
    ScanCommand,
    ScanCommandInput,
    UpdateCommand,
    UpdateCommandInput,
} from '@aws-sdk/lib-dynamodb';
import dynoexpr from '@tuplo/dynoexpr';
import type { IDynoexprArgs } from '@tuplo/dynoexpr';
import { getAwsClientConfig } from '@lib/aws-client-config.lib';
import type {
    DynamoExpressionOptions,
    DynamoItem,
    DynamoKey,
} from '@lib/types/dynamodb.type';

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

export const sendDynamoCommand = <TOutput>(
    command: Parameters<typeof dynamoDocumentClient.send>[0],
): Promise<TOutput> =>
    dynamoDocumentClient.send(command) as Promise<TOutput>;

export const getDB = (tableName: string) => ({
    get: async <TItem = DynamoItem>(
        key: DynamoKey,
        options: DynamoExpressionOptions<GetCommandInput> = {},
    ): Promise<TItem | undefined> => {
        const response = await dynamoDocumentClient.send(new GetCommand(withExpressions<GetCommandInput>({
            ...options,
            TableName: tableName,
            Key: key,
        })));

        return response.Item as TItem | undefined;
    },

    put: async <TItem extends object>(
        item: TItem,
        options: DynamoExpressionOptions<PutCommandInput> = {},
    ): Promise<PutCommandOutput> =>
        dynamoDocumentClient.send(new PutCommand(withExpressions<PutCommandInput>({
            ...options,
            TableName: tableName,
            Item: item as DynamoItem,
        }))),

    update: async <TItem = DynamoItem>(
        key: DynamoKey,
        options: DynamoExpressionOptions<UpdateCommandInput>,
    ): Promise<TItem | undefined> => {
        const response = await dynamoDocumentClient.send(new UpdateCommand(withExpressions<UpdateCommandInput>({
            ...options,
            TableName: tableName,
            Key: key,
        })));

        return response.Attributes as TItem | undefined;
    },

    delete: async <TItem = DynamoItem>(
        key: DynamoKey,
        options: DynamoExpressionOptions<DeleteCommandInput> = {},
    ): Promise<TItem | undefined> => {
        const response: DeleteCommandOutput = await dynamoDocumentClient.send(new DeleteCommand(withExpressions<DeleteCommandInput>({
            ...options,
            TableName: tableName,
            Key: key,
        })));

        return response.Attributes as TItem | undefined;
    },

    query: async <TItem = DynamoItem>(
        options: DynamoExpressionOptions<QueryCommandInput>,
    ): Promise<TItem[]> => {
        const response = await dynamoDocumentClient.send(new QueryCommand(withExpressions<QueryCommandInput>({
            ...options,
            TableName: tableName,
        })));

        return (response.Items ?? []) as TItem[];
    },

    scan: async <TItem = DynamoItem>(
        options: DynamoExpressionOptions<ScanCommandInput> = {},
    ): Promise<TItem[]> => {
        const response = await dynamoDocumentClient.send(new ScanCommand(withExpressions<ScanCommandInput>({
            ...options,
            TableName: tableName,
        })));

        return (response.Items ?? []) as TItem[];
    },

    send: sendDynamoCommand,
});
