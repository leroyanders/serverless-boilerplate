import {
    MessageAttributeValue,
    PublishBatchCommand,
    PublishBatchCommandOutput,
    PublishBatchRequestEntry,
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
export type TopicEventMessage<TEvent> = {
    data: TEvent;
    name: string;
    source: string;
};

export interface PublishTopicMessageOptions {
    localHandler?: string;
    messageAttributes?: Record<string, MessageAttributeValue>;
    messageDeduplicationId?: string;
    messageGroupId?: string;
    skipLocalDispatch?: boolean;
    subject?: string;
}

export type PublishTopicEventsOptions = PublishTopicMessageOptions;

const BATCH_SIZE = 10;

const isDryRun = (): boolean =>
    ['1', 'true'].includes((process.env.DRY_RUN ?? '').toLowerCase());

const chunkItems = <TItem>(items: TItem[], size: number): TItem[][] => {
    const result: TItem[][] = [];

    for (let index = 0; index < items.length; index += size) {
        result.push(items.slice(index, index + size));
    }

    return result;
};

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

const createTopicRecord = (
    topicArnOrName: string,
    message: string,
    messageId: string | undefined,
    options: PublishTopicMessageOptions,
): SNSEvent['Records'][number] => ({
    EventSource: 'aws:sns',
    EventSubscriptionArn: `${getTopicArn(topicArnOrName)}:local-subscription`,
    EventVersion: '1.0',
    Sns: {
        Message: message,
        MessageAttributes: {},
        MessageId: messageId ?? `local-sns-${Date.now()}`,
        Signature: 'local-signature',
        SignatureVersion: '1',
        SigningCertUrl: 'http://localhost:4566/local-cert',
        Subject: options.subject,
        Timestamp: new Date().toISOString(),
        TopicArn: getTopicArn(topicArnOrName),
        Type: 'Notification',
        UnsubscribeUrl: 'http://localhost:4566/unsubscribe',
    },
});

const createTopicEvent = (
    topicArnOrName: string,
    message: string,
    response: PublishCommandOutput,
    options: PublishTopicMessageOptions,
): SNSEvent => ({
    Records: [
        createTopicRecord(topicArnOrName, message, response.MessageId, options),
    ],
});

const createTopicBatchEvent = (
    topicArnOrName: string,
    entries: PublishBatchRequestEntry[],
    response: PublishBatchCommandOutput,
    options: PublishTopicEventsOptions,
): SNSEvent => {
    const successful = new Map((response.Successful ?? []).map((item) => [item.Id, item]));

    return {
        Records: entries
            .filter(({ Id }) => successful.has(Id))
            .map((entry) => {
                const result = successful.get(entry.Id);

                return createTopicRecord(
                    topicArnOrName,
                    entry.Message ?? '',
                    result?.MessageId,
                    {
                        ...options,
                        subject: entry.Subject ?? options.subject,
                    },
                );
            }),
    };
};

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

const dispatchLocalTopicBatch = async (
    topicArnOrName: string,
    entries: PublishBatchRequestEntry[],
    response: PublishBatchCommandOutput,
    options: PublishTopicEventsOptions,
): Promise<void> => {
    if (!isDev || options.skipLocalDispatch) {
        return;
    }

    const handler = getLocalTopicHandler(topicArnOrName, options.localHandler);
    if (!handler) {
        return;
    }

    const output = await invokeLocalFunction(handler, createTopicBatchEvent(topicArnOrName, entries, response, options));

    console.info('locally dispatched sns events', {
        handler,
        output,
        records: entries.length,
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

export const publishTopicEvents = async <EventType>(
    topicArnOrName: string,
    source: string,
    name: string,
    data: EventType[],
    options: PublishTopicEventsOptions = {},
): Promise<PublishBatchCommandOutput[]> => {
    const responses: PublishBatchCommandOutput[] = [];
    const batches = chunkItems(data, BATCH_SIZE);

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex += 1) {
        const batch = batches[batchIndex];
        const entries = batch.map((event: EventType, index: number): PublishBatchRequestEntry => {
            const entryIndex = (batchIndex * BATCH_SIZE) + index;

            return {
                Id: `event-${entryIndex}`,
                Message: toTopicMessage<TopicEventMessage<EventType>>({
                    data: event,
                    name,
                    source,
                }),
                MessageAttributes: options.messageAttributes,
                MessageDeduplicationId: options.messageDeduplicationId
                    ? `${options.messageDeduplicationId}-${entryIndex}`
                    : undefined,
                MessageGroupId: options.messageGroupId,
                Subject: options.subject,
            };
        });

        console.debug('publish sns events', {
            entries,
            name,
            source,
            topic: getTopicName(topicArnOrName),
        });

        if (isDryRun()) {
            continue;
        }

        const response = await snsClient.send(new PublishBatchCommand({
            PublishBatchRequestEntries: entries,
            TopicArn: getTopicArn(topicArnOrName),
        }));

        await dispatchLocalTopicBatch(topicArnOrName, entries, response, options);
        responses.push(response);
    }

    return responses;
};

export const getSNS = (topicArnOrName: string) => ({
    publish: <TMessage extends TopicMessage>(
        message: TMessage,
        options: PublishTopicMessageOptions = {},
    ): Promise<PublishCommandOutput> =>
        publishTopicMessage(topicArnOrName, message, options),

    publishEvents: <EventType>(
        source: string,
        name: string,
        data: EventType[],
        options: PublishTopicEventsOptions = {},
    ): Promise<PublishBatchCommandOutput[]> =>
        publishTopicEvents(topicArnOrName, source, name, data, options),
});
