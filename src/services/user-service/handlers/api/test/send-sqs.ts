import status from 'http-status-codes';
import {
    DEFAULT_LOCAL_USER_ID,
    SERVERLESS_SERVICE_NAME,
    TEST_SQS_DEFAULT_MESSAGE,
    TEST_SQS_EVENT_NAME,
    USER_EVENTS_QUEUE_DEFAULT,
} from '@constants/service.const';
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
        event: TEST_SQS_EVENT_NAME,
        message: data.message ?? TEST_SQS_DEFAULT_MESSAGE,
        userId: userId ?? DEFAULT_LOCAL_USER_ID,
        createdAt: new Date().toISOString(),
    };

const getQueue = (data: SendSqsTestRequest): string =>
    data.queueUrl
        ?? data.queueName
        ?? process.env.USER_EVENTS_QUEUE_URL
        ?? process.env.USER_EVENTS_QUEUE_NAME
        ?? USER_EVENTS_QUEUE_DEFAULT;

export const handler = lambdaHandler<SendSqsTestRequest, SendSqsTestResponse>(async ({ data, ctx }) => {
    const queue = getQueue(data);
    const payload = getPayload(data, ctx.userId);
    const responses = await getSQS(queue).publishEvents(SERVERLESS_SERVICE_NAME, TEST_SQS_EVENT_NAME, [payload]);
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
