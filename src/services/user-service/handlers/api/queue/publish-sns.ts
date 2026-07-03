import status from 'http-status-codes';
import { lambdaHandler } from '@lib/lambda-handler';
import { publishSNS } from '@lib/sns';
import type { PublishSnsTestResponse } from '../../../interfaces/publish-sns-test-response.interface';
import type { PublishSnsTestRequest } from '../../../types';

export const handler = lambdaHandler<PublishSnsTestRequest, PublishSnsTestResponse>(async ({ data }) => {
    const response = await publishSNS(data.topic, data.payload);

    return {
        statusCode: status.OK,
        body: {
            messageId: response?.MessageId,
            messageIds: response?.MessageId ? [response.MessageId] : [],
            topic: data.topic,
            payload: data.payload,
        },
    };
});
