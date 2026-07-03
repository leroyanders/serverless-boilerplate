import type {
    APIGatewayAuthorizerResult,
    APIGatewayRequestAuthorizerEvent,
    Callback,
    Context,
} from 'aws-lambda';
import {
    QUEUE_SNS_HTTP_PATH,
    QUEUE_SQS_HTTP_PATH,
    ROOT_HTTP_PATH,
} from './__sls/const';
import { AuthPolicy } from '@lib/auth-policy';
import { authorizer } from '@lib/authorizer';
import log, { logBeforeTimeout } from '@lib/logger';

type RequestAuthorizerCallbackHandler = (
    event: APIGatewayRequestAuthorizerEvent,
    context: Context,
    callback: Callback<APIGatewayAuthorizerResult>,
) => Promise<void>;

export const handler: RequestAuthorizerCallbackHandler = async (event, context, callback) => {
    const cleanup = logBeforeTimeout(event, context);

    try {
        const authResponse = await authorizer(event, (policy) => {
            policy.allowMethod(AuthPolicy.HttpVerb.GET, ROOT_HTTP_PATH);
            policy.allowMethod(AuthPolicy.HttpVerb.POST, QUEUE_SQS_HTTP_PATH);
            policy.allowMethod(AuthPolicy.HttpVerb.POST, QUEUE_SNS_HTTP_PATH);
        });
        log.debug('response', authResponse);

        if (typeof authResponse == 'string') {
            callback(authResponse);
        } else {
            callback(null, authResponse);
        }
    } catch (e) {
        log.error('TRY-CATCH', e);
        throw e;
    } finally {
        cleanup();
    }
};
