import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
    DeleteCommand,
    DeleteCommandInput,
    DeleteCommandOutput,
    DynamoDBDocumentClient,
    GetCommand,
    GetCommandInput,
    NativeAttributeValue,
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
import dynoexpr, { IDynoexprArgs } from '@tuplo/dynoexpr';
import { getAwsClientConfig } from '@lib/aws-client-config.lib';

export type DynamoItem = Record<string, NativeAttributeValue>;
export type DynamoKey = Record<string, NativeAttributeValue>;
export type DynamoExpressionOptions<TOptions extends object> =
    Omit<TOptions, 'TableName' | 'Key' | 'Item'> & IDynoexprArgs;

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
): Promise<TItem | undefined> => {
    const response = await dynamoDocumentClient.send(new GetCommand(withExpressions<GetCommandInput>({
        ...options,
        TableName: tableName,
        Key: key,
    })));

    return response.Item as TItem | undefined;
};

export const putItem = async <TItem extends object>(
    tableName: string,
    item: TItem,
    options: DynamoExpressionOptions<PutCommandInput> = {},
): Promise<PutCommandOutput> =>
    dynamoDocumentClient.send(new PutCommand(withExpressions<PutCommandInput>({
        ...options,
        TableName: tableName,
        Item: item as DynamoItem,
    })));

export const updateItem = async <TItem = DynamoItem>(
    tableName: string,
    key: DynamoKey,
    options: DynamoExpressionOptions<UpdateCommandInput>,
): Promise<TItem | undefined> => {
    const response = await dynamoDocumentClient.send(new UpdateCommand(withExpressions<UpdateCommandInput>({
        ...options,
        TableName: tableName,
        Key: key,
    })));

    return response.Attributes as TItem | undefined;
};

export const deleteItem = async <TItem = DynamoItem>(
    tableName: string,
    key: DynamoKey,
    options: DynamoExpressionOptions<DeleteCommandInput> = {},
): Promise<TItem | undefined> => {
    const response: DeleteCommandOutput = await dynamoDocumentClient.send(new DeleteCommand(withExpressions<DeleteCommandInput>({
        ...options,
        TableName: tableName,
        Key: key,
    })));

    return response.Attributes as TItem | undefined;
};

export const queryItems = async <TItem = DynamoItem>(
    tableName: string,
    options: DynamoExpressionOptions<QueryCommandInput>,
): Promise<TItem[]> => {
    const response = await dynamoDocumentClient.send(new QueryCommand(withExpressions<QueryCommandInput>({
        ...options,
        TableName: tableName,
    })));

    return (response.Items ?? []) as TItem[];
};

export const scanItems = async <TItem = DynamoItem>(
    tableName: string,
    options: DynamoExpressionOptions<ScanCommandInput> = {},
): Promise<TItem[]> => {
    const response = await dynamoDocumentClient.send(new ScanCommand(withExpressions<ScanCommandInput>({
        ...options,
        TableName: tableName,
    })));

    return (response.Items ?? []) as TItem[];
};

export const sendDynamoCommand = <TOutput>(
    command: Parameters<typeof dynamoDocumentClient.send>[0],
): Promise<TOutput> =>
    dynamoDocumentClient.send(command) as Promise<TOutput>;
