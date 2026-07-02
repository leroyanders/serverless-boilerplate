import { lambdaHandler } from '@lib/lambda-handler.lib';
import { invokeSum } from '../../invokers/sum.invoker';
import status from 'http-status-codes';
import type { SumResolverReturnType } from '../../../types';

type LoginRequest = Record<string, unknown>;

interface LoginResponse {
    data: LoginRequest;
    userId?: string;
    sum: SumResolverReturnType;
}

export const handler = lambdaHandler<LoginRequest, LoginResponse>(async ({ data, ctx }) => {
    const sum = await invokeSum({
        a: 10,
        b: 25,
    });

    return {
        statusCode: status.OK,
        body: {
            data,
            userId: ctx.userId,
            sum,
        },
    };
});
