import {
    DEFAULT_LOCAL_USER_ID,
    USER_LOGIN_SK,
    USERS_TABLE_DEFAULT,
} from '../../../__sls/const';
import { lambdaHandler } from '@lib/lambda-handler';
import { invokeCalculate } from '../../../../calculate-service/handlers/invokers/calculate.invoker';
import { getDB } from '@lib/dynamodb';
import KSUID = require('ksuid');

import type { LoginResponse } from '../../../interfaces/login-response.interface';
import type { LoginUserItem } from '../../../interfaces/login-user-item.interface';
import type { LoginRequest } from '../../../types';

import status from 'http-status-codes';

export const handler = lambdaHandler<LoginRequest, LoginResponse>(async ({ data, ctx }) => {
    const pk = KSUID.randomSync().string;
    const sum = await invokeCalculate({
        a: 10,
        b: 25,
    });

    const tableName = process.env.USERS_TABLE_NAME ?? USERS_TABLE_DEFAULT;
    const userId = ctx.userId
        ?? (typeof data.userId === 'string' ? data.userId : undefined)
        ?? DEFAULT_LOCAL_USER_ID;
    const item: LoginUserItem = {
        pk,
        sk: USER_LOGIN_SK,
        userId,
        lastLoginAt: new Date().toISOString(),
        data,
        sum,
    };

    const db = getDB(tableName);
    await db.put(item);
    const user = await db.get<LoginUserItem>({
        pk,
        sk: USER_LOGIN_SK,
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
