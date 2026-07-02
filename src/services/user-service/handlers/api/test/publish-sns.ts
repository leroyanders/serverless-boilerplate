import status from 'http-status-codes';
import {
    DEFAULT_LOCAL_USER_ID,
    SERVERLESS_SERVICE_NAME,
    TEST_SNS_DEFAULT_MESSAGE,
    TEST_SNS_DEFAULT_SUBJECT,
    TEST_SNS_EVENT_NAME,
    USER_EVENTS_TOPIC_DEFAULT,
} from '@constants/service.const';
import { lambdaHandler } from '@lib/lambda-handler.lib';
import {
    getSNS,
    TopicMessage,
} from '@lib/sns.lib';

type PublishSnsTestRequest = {
    message?: string;
    payload?: Record<string, unknown>;
    subject?: string;
    topicArn?: string;
    topicName?: string;
};

interface PublishSnsTestResponse {
    messageId?: string;
    messageIds: string[];
    topic: string;
    payload: TopicMessage;
}

const getPayload = (
    data: PublishSnsTestRequest,
    userId?: string,
): TopicMessage =>
    data.payload ?? {
        event: TEST_SNS_EVENT_NAME,
        message: data.message ?? TEST_SNS_DEFAULT_MESSAGE,
        userId: userId ?? DEFAULT_LOCAL_USER_ID,
        createdAt: new Date().toISOString(),
    };

const getTopic = (data: PublishSnsTestRequest): string =>
    data.topicArn
        ?? data.topicName
        ?? process.env.USER_EVENTS_TOPIC_ARN
        ?? process.env.USER_EVENTS_TOPIC_NAME
        ?? USER_EVENTS_TOPIC_DEFAULT;

export const handler = lambdaHandler<PublishSnsTestRequest, PublishSnsTestResponse>(async ({ data, ctx }) => {
    const topic = getTopic(data);
    const payload = getPayload(data, ctx.userId);
    const responses = await getSNS(topic).publishEvents(SERVERLESS_SERVICE_NAME, TEST_SNS_EVENT_NAME, [payload], {
        subject: data.subject ?? TEST_SNS_DEFAULT_SUBJECT,
    });

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
            topic,
            payload,
        },
    };
});
