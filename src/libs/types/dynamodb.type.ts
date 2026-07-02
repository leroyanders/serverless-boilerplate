import type { NativeAttributeValue } from '@aws-sdk/lib-dynamodb';
import type { IDynoexprArgs } from '@tuplo/dynoexpr';

export type DynamoItem = Record<string, NativeAttributeValue>;
export type DynamoKey = Record<string, NativeAttributeValue>;
export type DynamoExpressionOptions<TOptions extends object> =
    Omit<TOptions, 'TableName' | 'Key' | 'Item'> & IDynoexprArgs;
