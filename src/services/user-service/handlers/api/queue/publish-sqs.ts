import status from 'http-status-codes';
import { lambdaHandler } from '@lib/lambda-handler';
import { sendMessage } from '@lib/sqs';
import type { SendSqsTestResponse } from '../../../interfaces/send-sqs-test-response.interface';
import type { SendSqsTestRequest } from '../../../types';

export const handler = lambdaHandler<SendSqsTestRequest, SendSqsTestResponse>(async ({ data }) => {
    const response = await sendMessage(data.queue, data.payload);

    return {
        statusCode: status.OK,
        body: {
            messageId: response?.MessageId,
            messageIds: response?.MessageId ? [response.MessageId] : [],
            queue: data.queue,
            payload: data.payload,
        },
    };
});
