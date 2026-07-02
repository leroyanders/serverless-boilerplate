import { lambdaHandler } from '@lib/lambda-handler.lib';
import { invokeSum } from '../../invokers/sum.invoker';
import status from 'http-status-codes';

export const handler = lambdaHandler(async ({ data, ctx }) => {
    const sum = await invokeSum({
        a: 10,
        b: 25,
    });

    return {
        statusCode: status.OK,
        body: JSON.stringify({
            data,
            userId: ctx.userId,
            sum,
        }),
    };
});