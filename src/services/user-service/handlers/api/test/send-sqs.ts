import status from 'http-status-codes';
import { lambdaHandler } from '@lib/lambda-handler.lib';
import {
    getSQS,
    QueueMessage,
} from '@lib/sqs.lib';

type SendSqsTestRequest = {
    message?: string;
    payload?: Record<string, unknown>;
    queueName?: string;
    queueUrl?: string;
};

interface SendSqsTestResponse {
    messageId?: string;
    messageIds: string[];
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
    const responses = await getSQS(queue).publishEvents('user-service', 'test.sqs.message', [payload]);
    const messageIds = responses.reduce<string[]>((result, response) => {
        for (const item of response.Successful ?? []) {
            if (item.MessageId) {
                result.push(item.MessageId);
            }
        }

        return result;
    }, []);

    return {
        statusCode: status.OK,
        body: {
            messageId: messageIds[0],
            messageIds,
            queue,
            payload,
        },
    };
});
