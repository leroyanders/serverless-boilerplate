import {
    SendMessageBatchCommand,
    SendMessageBatchCommandOutput,
    SendMessageBatchRequestEntry,
    SendMessageCommand,
    SendMessageCommandOutput,
    SQSClient,
} from '@aws-sdk/client-sqs';
import { createHash } from 'crypto';
import type { SQSEvent } from 'aws-lambda';
import {
    getAwsAccountId,
    getAwsClientConfig,
    getLocalAwsEndpoint,
    getAwsRegion,
    isDev,
} from '@lib/aws-client-config';
import {
    assertLocalHasIamPermission,
    invokeLocalFunction,
} from '@lib/serverless-local';
import log from '@lib/logger';
import type {
    SendQueueMessageOptions,
} from '@lib/interfaces/sqs.interface';
import type {
    PublishQueueEventsOptions,
    QueueEventMessage,
    QueueMessage,
} from '@lib/types/sqs.type';

export const sqsClient = new SQSClient(getAwsClientConfig(process.env.SQS_ENDPOINT));

export type {
    SendQueueMessageOptions,
} from '@lib/interfaces/sqs.interface';
export type {
    PublishQueueEventsOptions,
    QueueEventMessage,
    QueueMessage,
} from '@lib/types/sqs.type';

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

const toMessageBody = <TMessage extends QueueMessage>(message: TMessage): string =>
    typeof message === 'string'
        ? message
        : JSON.stringify(message);

const trimTrailingSlash = (value: string): string =>
    value.replace(/\/+$/, '');

const md5 = (value: string): string =>
    createHash('md5').update(value).digest('hex');

const pascalCase = (value: string): string =>
    value
        .split(/[^a-zA-Z0-9]/)
        .filter(Boolean)
        .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
        .join('');

const getSqsEndpoint = (): string =>
    process.env.SQS_ENDPOINT ?? getLocalAwsEndpoint();

const getStage = (): string =>
    process.env.STAGE ?? 'dev';

const getQueueName = (queueUrlOrName: string): string =>
    queueUrlOrName.startsWith('http')
        ? queueUrlOrName.split('/').filter(Boolean).pop() ?? queueUrlOrName
        : queueUrlOrName;

export const getQueueUrl = (queueUrlOrName: string): string => {
    if (queueUrlOrName.startsWith('http') || !isDev) {
        return queueUrlOrName;
    }

    return `${trimTrailingSlash(getSqsEndpoint())}/${getAwsAccountId()}/${queueUrlOrName}`;
};

export const getQueueArn = (queueUrlOrName: string): string =>
    `arn:aws:sqs:${getAwsRegion()}:${getAwsAccountId()}:${getQueueName(queueUrlOrName)}`;

const getConstructedQueueUrl = (
    name: string,
    fifo: boolean,
): string => {
    if (name.startsWith('http') || isDev) {
        return getQueueUrl(name);
    }

    return `https://sqs.${process.env.REGION ?? getAwsRegion()}.amazonaws.com/${
        process.env.AWS_ID ?? getAwsAccountId()
    }/${pascalCase(name)}Queue-${getStage()}${fifo ? '.fifo' : ''}`;
};

const getSendQueueUrl = (
    name: string,
    fifo: boolean,
    constructUrl: boolean,
): string =>
    constructUrl
        ? getConstructedQueueUrl(name, fifo)
        : name;

const getLocalHandlerMap = (): Record<string, string> =>
    (process.env.LOCAL_SQS_EVENT_HANDLERS ?? '')
        .split(',')
        .map((entry) => entry.trim())
        .filter(Boolean)
        .reduce<Record<string, string>>((result, entry) => {
            const [queue, handler] = entry.split('=');

            if (queue && handler) {
                result[queue.trim()] = handler.trim();
            }

            return result;
        }, {});

const getLocalQueueHandler = (
    queueUrlOrName: string,
    localHandler?: string,
): string | undefined =>
    localHandler ?? getLocalHandlerMap()[getQueueName(queueUrlOrName)];

const assertLocalCanSendQueueMessage = async (
    action: 'sqs:SendMessage' | 'sqs:SendMessageBatch',
    queueUrlOrName: string,
): Promise<void> => {
    if (!isDev) {
        return;
    }

    await assertLocalHasIamPermission(action, getQueueArn(queueUrlOrName));
};

const createQueueRecord = (
    queueUrlOrName: string,
    body: string,
    messageId?: string,
    md5OfBody?: string,
): SQSEvent['Records'][number] => {
    const now = Date.now().toString();

    return {
        messageId: messageId ?? `local-sqs-${now}`,
        receiptHandle: 'local-receipt-handle',
        body,
        attributes: {
            ApproximateReceiveCount: '1',
            SentTimestamp: now,
            SenderId: 'localstack',
            ApproximateFirstReceiveTimestamp: now,
        },
        messageAttributes: {},
        md5OfBody: md5OfBody ?? '',
        eventSource: 'aws:sqs',
        eventSourceARN: getQueueArn(queueUrlOrName),
        awsRegion: getAwsRegion(),
    };
};

const createQueueEvent = (
    queueUrlOrName: string,
    body: string,
    response: SendMessageCommandOutput,
): SQSEvent => ({
    Records: [
        createQueueRecord(queueUrlOrName, body, response.MessageId, response.MD5OfMessageBody),
    ],
});

const createQueueBatchEvent = (
    queueUrlOrName: string,
    entries: SendMessageBatchRequestEntry[],
    response: SendMessageBatchCommandOutput,
): SQSEvent => {
    const successful = new Map((response.Successful ?? []).map((item) => [item.Id, item]));

    return {
        Records: entries
            .filter(({ Id }) => successful.has(Id))
            .map((entry) => {
                const result = successful.get(entry.Id);

                return createQueueRecord(
                    queueUrlOrName,
                    entry.MessageBody ?? '',
                    result?.MessageId,
                    result?.MD5OfMessageBody,
                );
            }),
    };
};

const dispatchLocalQueueMessage = async (
    queueUrlOrName: string,
    body: string,
    response: SendMessageCommandOutput,
    options: SendQueueMessageOptions,
): Promise<void> => {
    if (!isDev || options.skipLocalDispatch) {
        return;
    }

    const handler = getLocalQueueHandler(queueUrlOrName, options.localHandler);
    if (!handler) {
        return;
    }

    const output = await invokeLocalFunction(handler, createQueueEvent(queueUrlOrName, body, response));

    log.info('locally dispatched sqs message', {
        handler,
        output,
        queue: getQueueName(queueUrlOrName),
    });
};

const dispatchLocalQueueBatch = async (
    queueUrlOrName: string,
    entries: SendMessageBatchRequestEntry[],
    response: SendMessageBatchCommandOutput,
    options: PublishQueueEventsOptions,
): Promise<void> => {
    if (!isDev || options.skipLocalDispatch) {
        return;
    }

    const handler = getLocalQueueHandler(queueUrlOrName, options.localHandler);
    if (!handler) {
        return;
    }

    const output = await invokeLocalFunction(handler, createQueueBatchEvent(queueUrlOrName, entries, response));

    log.info('locally dispatched sqs events', {
        handler,
        output,
        queue: getQueueName(queueUrlOrName),
        records: entries.length,
    });
};

export const sendQueueMessage = async <TMessage extends QueueMessage>(
    queueUrlOrName: string,
    message: TMessage,
    options: SendQueueMessageOptions = {},
): Promise<SendMessageCommandOutput | undefined> => {
    const body = toMessageBody(message);
    const command = new SendMessageCommand({
        QueueUrl: getQueueUrl(queueUrlOrName),
        MessageBody: body,
        DelaySeconds: options.delaySeconds,
        MessageAttributes: options.messageAttributes,
        MessageDeduplicationId: options.messageDeduplicationId,
        MessageGroupId: options.messageGroupId,
    });

    if (isDryRun()) {
        return undefined;
    }

    await assertLocalCanSendQueueMessage('sqs:SendMessage', queueUrlOrName);

    const response = await sqsClient.send(command);
    await dispatchLocalQueueMessage(queueUrlOrName, body, response, options);

    return response;
};

export const sendMessage = async <TMessage extends QueueMessage = string>(
    name: string,
    data: TMessage,
    MessageGroupId?: string,
    fifo: boolean = false,
    constructUrl: boolean = true,
): Promise<SendMessageCommandOutput | undefined> => {
    const body = toMessageBody(data);
    const queueUrl = getSendQueueUrl(name, fifo, constructUrl);
    const command = new SendMessageCommand({
        QueueUrl: queueUrl,
        MessageBody: body,
        MessageGroupId,
        ...(fifo
            ? {
                MessageDeduplicationId: md5(JSON.stringify(data)),
            }
            : {}),
        ...((!process.env.IS_LOCAL && process.env._X_AMZN_TRACE_ID && {
            MessageSystemAttributes: {
                AWSTraceHeader: {
                    DataType: 'String',
                    StringValue: process.env._X_AMZN_TRACE_ID,
                },
            },
        })
            || {}),
    });

    log.debug('queueing message to', name);
    log.debug('url', queueUrl);
    log.debug('p', command.input);

    if (isDryRun()) {
        return undefined;
    }

    await assertLocalCanSendQueueMessage('sqs:SendMessage', name);

    const response = await sqsClient.send(command);
    log.debug('r', response);
    await dispatchLocalQueueMessage(name, body, response, {});

    return response;
};

export const publishQueueEvents = async <EventType>(
    queueUrlOrName: string,
    source: string,
    name: string,
    data: EventType[],
    options: PublishQueueEventsOptions = {},
): Promise<SendMessageBatchCommandOutput[]> => {
    const responses: SendMessageBatchCommandOutput[] = [];
    const batches = chunkItems(data, BATCH_SIZE);

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex += 1) {
        const batch = batches[batchIndex];
        const entries = batch.map((event: EventType, index: number): SendMessageBatchRequestEntry => {
            const entryIndex = (batchIndex * BATCH_SIZE) + index;

            return {
                Id: `event-${entryIndex}`,
                MessageBody: toMessageBody<QueueEventMessage<EventType>>({
                    data: event,
                    name,
                    source,
                }),
                DelaySeconds: options.delaySeconds,
                MessageAttributes: options.messageAttributes,
                MessageDeduplicationId: options.messageDeduplicationId
                    ? `${options.messageDeduplicationId}-${entryIndex}`
                    : undefined,
                MessageGroupId: options.messageGroupId,
            };
        });

        log.debug('publish sqs events', {
            entries,
            name,
            queue: getQueueName(queueUrlOrName),
            source,
        });

        if (isDryRun()) {
            continue;
        }

        await assertLocalCanSendQueueMessage('sqs:SendMessageBatch', queueUrlOrName);

        const response = await sqsClient.send(new SendMessageBatchCommand({
            Entries: entries,
            QueueUrl: getQueueUrl(queueUrlOrName),
        }));

        await dispatchLocalQueueBatch(queueUrlOrName, entries, response, options);
        responses.push(response);
    }

    return responses;
};

export const sendBatchMessage = async <TMessage extends QueueMessage>(
    name: string,
    data: TMessage[],
    MessageGroupId?: string,
    fifo: boolean = false,
    constructUrl: boolean = true,
): Promise<SendMessageBatchCommandOutput[]> => {
    log.debug('queueing batch to', { name, MessageGroupId });
    log.debug('sendBatchMessage::data', data);

    const entries = data.map((message, index): SendMessageBatchRequestEntry => ({
        Id: `b${index.toString()}`,
        MessageBody: toMessageBody(message),
        MessageGroupId,
        ...(fifo
            ? {
                MessageDeduplicationId: md5(JSON.stringify(message)),
            }
            : {}),
        ...((!process.env.IS_LOCAL && process.env._X_AMZN_TRACE_ID && {
            MessageSystemAttributes: {
                AWSTraceHeader: {
                    DataType: 'String',
                    StringValue: process.env._X_AMZN_TRACE_ID,
                },
            },
        })
            || {}),
    }));
    const queueUrl = getSendQueueUrl(name, fifo, constructUrl);
    const responses: SendMessageBatchCommandOutput[] = [];

    log.debug('url', queueUrl);

    if (isDryRun()) {
        return responses;
    }

    await assertLocalCanSendQueueMessage('sqs:SendMessageBatch', name);

    do {
        const batch = entries.splice(0, BATCH_SIZE);
        const response = await sqsClient.send(new SendMessageBatchCommand({
            Entries: batch,
            QueueUrl: queueUrl,
        }));

        log.debug('r', response);
        await dispatchLocalQueueBatch(name, batch, response, {});
        responses.push(response);
    } while (entries.length);

    return responses;
};

export const getSQS = (queueUrlOrName: string) => ({
    publishEvents: <EventType>(
        source: string,
        name: string,
        data: EventType[],
        options: PublishQueueEventsOptions = {},
    ): Promise<SendMessageBatchCommandOutput[]> =>
        publishQueueEvents(queueUrlOrName, source, name, data, options),

    send: <TMessage extends QueueMessage>(
        message: TMessage,
        options: SendQueueMessageOptions = {},
    ): Promise<SendMessageCommandOutput | undefined> =>
        sendQueueMessage(queueUrlOrName, message, options),
});
