import status from 'http-status-codes';
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
        event: 'test.sns.message',
        message: data.message ?? 'hello from sns test lambda',
        userId: userId ?? 'local-user-id',
        createdAt: new Date().toISOString(),
    };

const getTopic = (data: PublishSnsTestRequest): string =>
    data.topicArn
        ?? data.topicName
        ?? process.env.USER_EVENTS_TOPIC_ARN
        ?? process.env.USER_EVENTS_TOPIC_NAME
        ?? 'user-events';

export const handler = lambdaHandler<PublishSnsTestRequest, PublishSnsTestResponse>(async ({ data, ctx }) => {
    const topic = getTopic(data);
    const payload = getPayload(data, ctx.userId);
    const responses = await getSNS(topic).publishEvents('user-service', 'test.sns.message', [payload], {
        subject: data.subject ?? 'local sns test',
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
