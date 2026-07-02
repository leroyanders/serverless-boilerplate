import status from 'http-status-codes';
import { lambdaHandler } from '@lib/lambda-handler.lib';
import {
    QueueMessage,
    sendQueueMessage,
} from '@lib/sqs.lib';

type SendSqsTestRequest = {
    message?: string;
    payload?: Record<string, unknown>;
    queueName?: string;
    queueUrl?: string;
};

interface SendSqsTestResponse {
    messageId?: string;
    queue: string;
    payload: QueueMessage;
}

const getPayload = (
    data: SendSqsTestRequest,
    userId?: string,
): QueueMessage =>
    data.payload ?? {
        event: 'test.sqs.message',
        message: data.message ?? 'hello from sqs test lambda',
        userId: userId ?? 'local-user-id',
        createdAt: new Date().toISOString(),
    };

const getQueue = (data: SendSqsTestRequest): string =>
    data.queueUrl
        ?? data.queueName
        ?? process.env.USER_EVENTS_QUEUE_URL
        ?? process.env.USER_EVENTS_QUEUE_NAME
        ?? 'user-events';

export const handler = lambdaHandler<SendSqsTestRequest, SendSqsTestResponse>(async ({ data, ctx }) => {
    const queue = getQueue(data);
    const payload = getPayload(data, ctx.userId);
    const response = await sendQueueMessage(queue, payload);

    return {
        statusCode: status.OK,
        body: {
            messageId: response.MessageId,
            queue,
            payload,
        },
    };
});
