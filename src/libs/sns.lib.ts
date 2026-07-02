import {
    MessageAttributeValue,
    PublishCommand,
    PublishCommandOutput,
    SNSClient,
} from '@aws-sdk/client-sns';
import type { SNSEvent } from 'aws-lambda';
import {
    getAwsAccountId,
    getAwsClientConfig,
    getAwsRegion,
    isDev,
} from '@lib/aws-client-config.lib';
import { invokeLocalFunction } from '@lib/serverless-local.lib';

export const snsClient = new SNSClient(getAwsClientConfig(process.env.SNS_ENDPOINT));

export type TopicMessage = string | number | boolean | null | object;

export interface PublishTopicMessageOptions {
    localHandler?: string;
    messageAttributes?: Record<string, MessageAttributeValue>;
    messageDeduplicationId?: string;
    messageGroupId?: string;
    skipLocalDispatch?: boolean;
    subject?: string;
}

const toTopicMessage = <TMessage extends TopicMessage>(message: TMessage): string =>
    typeof message === 'string'
        ? message
        : JSON.stringify(message);

export const getTopicArn = (topicArnOrName: string): string => {
    if (topicArnOrName.startsWith('arn:') || !isDev) {
        return topicArnOrName;
    }

    return `arn:aws:sns:${getAwsRegion()}:${getAwsAccountId()}:${topicArnOrName}`;
};

const getTopicName = (topicArnOrName: string): string =>
    topicArnOrName.startsWith('arn:')
        ? topicArnOrName.split(':').pop() ?? topicArnOrName
        : topicArnOrName;

const getLocalHandlerMap = (): Record<string, string> =>
    (process.env.LOCAL_SNS_EVENT_HANDLERS ?? '')
        .split(',')
        .map((entry) => entry.trim())
        .filter(Boolean)
        .reduce<Record<string, string>>((result, entry) => {
            const [topic, handler] = entry.split('=');

            if (topic && handler) {
                result[topic.trim()] = handler.trim();
            }

            return result;
        }, {});

const getLocalTopicHandler = (
    topicArnOrName: string,
    localHandler?: string,
): string | undefined =>
    localHandler ?? getLocalHandlerMap()[getTopicName(topicArnOrName)];

const createTopicEvent = (
    topicArnOrName: string,
    message: string,
    response: PublishCommandOutput,
    options: PublishTopicMessageOptions,
): SNSEvent => ({
    Records: [
        {
            EventSource: 'aws:sns',
            EventSubscriptionArn: `${getTopicArn(topicArnOrName)}:local-subscription`,
            EventVersion: '1.0',
            Sns: {
                Message: message,
                MessageAttributes: {},
                MessageId: response.MessageId ?? `local-sns-${Date.now()}`,
                Signature: 'local-signature',
                SignatureVersion: '1',
                SigningCertUrl: 'http://localhost:4566/local-cert',
                Subject: options.subject,
                Timestamp: new Date().toISOString(),
                TopicArn: getTopicArn(topicArnOrName),
                Type: 'Notification',
                UnsubscribeUrl: 'http://localhost:4566/unsubscribe',
            },
        },
    ],
});

const dispatchLocalTopicMessage = async (
    topicArnOrName: string,
    message: string,
    response: PublishCommandOutput,
    options: PublishTopicMessageOptions,
): Promise<void> => {
    if (!isDev || options.skipLocalDispatch) {
        return;
    }

    const handler = getLocalTopicHandler(topicArnOrName, options.localHandler);
    if (!handler) {
        return;
    }

    const output = await invokeLocalFunction(handler, createTopicEvent(topicArnOrName, message, response, options));

    console.info('locally dispatched sns message', {
        handler,
        output,
        topic: getTopicName(topicArnOrName),
    });
};

export const publishTopicMessage = async <TMessage extends TopicMessage>(
    topicArnOrName: string,
    message: TMessage,
    options: PublishTopicMessageOptions = {},
): Promise<PublishCommandOutput> => {
    const topicMessage = toTopicMessage(message);
    const command = new PublishCommand({
        TopicArn: getTopicArn(topicArnOrName),
        Message: topicMessage,
        MessageAttributes: options.messageAttributes,
        MessageDeduplicationId: options.messageDeduplicationId,
        MessageGroupId: options.messageGroupId,
        Subject: options.subject,
    });

    const response = await snsClient.send(command);
    await dispatchLocalTopicMessage(topicArnOrName, topicMessage, response, options);

    return response;
};
