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
import { getAwsClientConfig } from '@lib/aws-client-config.lib';

export type DynamoItem = Record<string, NativeAttributeValue>;
export type DynamoKey = Record<string, NativeAttributeValue>;

export const dynamoClient = new DynamoDBClient(getAwsClientConfig(process.env.DYNAMODB_ENDPOINT));

export const dynamoDocumentClient = DynamoDBDocumentClient.from(dynamoClient, {
    marshallOptions: {
        removeUndefinedValues: true,
    },
});

export const getItem = async <TItem = DynamoItem>(
    tableName: string,
    key: DynamoKey,
    options: Omit<GetCommandInput, 'TableName' | 'Key'> = {},
): Promise<TItem | undefined> => {
    const response = await dynamoDocumentClient.send(new GetCommand({
        ...options,
        TableName: tableName,
        Key: key,
    }));

    return response.Item as TItem | undefined;
};

export const putItem = async <TItem extends object>(
    tableName: string,
    item: TItem,
    options: Omit<PutCommandInput, 'TableName' | 'Item'> = {},
): Promise<PutCommandOutput> =>
    dynamoDocumentClient.send(new PutCommand({
        ...options,
        TableName: tableName,
        Item: item as DynamoItem,
    }));

export const updateItem = async <TItem = DynamoItem>(
    tableName: string,
    key: DynamoKey,
    options: Omit<UpdateCommandInput, 'TableName' | 'Key'>,
): Promise<TItem | undefined> => {
    const response = await dynamoDocumentClient.send(new UpdateCommand({
        ...options,
        TableName: tableName,
        Key: key,
    }));

    return response.Attributes as TItem | undefined;
};

export const deleteItem = async <TItem = DynamoItem>(
    tableName: string,
    key: DynamoKey,
    options: Omit<DeleteCommandInput, 'TableName' | 'Key'> = {},
): Promise<TItem | undefined> => {
    const response: DeleteCommandOutput = await dynamoDocumentClient.send(new DeleteCommand({
        ...options,
        TableName: tableName,
        Key: key,
    }));

    return response.Attributes as TItem | undefined;
};

export const queryItems = async <TItem = DynamoItem>(
    tableName: string,
    options: Omit<QueryCommandInput, 'TableName'>,
): Promise<TItem[]> => {
    const response = await dynamoDocumentClient.send(new QueryCommand({
        ...options,
        TableName: tableName,
    }));

    return (response.Items ?? []) as TItem[];
};

export const scanItems = async <TItem = DynamoItem>(
    tableName: string,
    options: Omit<ScanCommandInput, 'TableName'> = {},
): Promise<TItem[]> => {
    const response = await dynamoDocumentClient.send(new ScanCommand({
        ...options,
        TableName: tableName,
    }));

    return (response.Items ?? []) as TItem[];
};

export const sendDynamoCommand = <TOutput>(
    command: Parameters<typeof dynamoDocumentClient.send>[0],
): Promise<TOutput> =>
    dynamoDocumentClient.send(command) as Promise<TOutput>;
