import { lambdaHandler } from '@lib/lambda-handler.lib';
import { invokeSum } from '../../invokers/sum.invoker';
import status from 'http-status-codes';
import type { SumResolverReturnType } from '../../../types';
import { getItem, putItem } from '@lib/dynamodb.lib';

type LoginRequest = Record<string, unknown>;

interface LoginResponse {
    data: LoginRequest;
    userId?: string;
    sum: SumResolverReturnType;
    user: LoginUserItem | undefined;
    tableName: string;
}

interface LoginUserItem {
    pk: string;
    userId: string;
    lastLoginAt: string;
    data: LoginRequest;
    sum: SumResolverReturnType;
}

export const handler = lambdaHandler<LoginRequest, LoginResponse>(async ({ data, ctx }) => {
    const sum = await invokeSum({
        a: 10,
        b: 25,
    });

    const tableName = process.env.USERS_TABLE_NAME ?? 'users';
    const userId = ctx.userId
        ?? (typeof data.userId === 'string' ? data.userId : undefined)
        ?? 'local-user-id';

    const item: LoginUserItem = {
        pk: userId,
        userId,
        lastLoginAt: new Date().toISOString(),
        data,
        sum,
    };

    await putItem(tableName, item);
    const user = await getItem<LoginUserItem>(tableName, {
        pk: userId,
    });

    return {
        statusCode: status.OK,
        body: {
            data,
            userId,
            sum,
            user,
            tableName,
        },
    };
});
