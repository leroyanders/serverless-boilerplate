import {
    MessageAttributeValue,
    SendMessageCommand,
    SendMessageCommandOutput,
    SQSClient,
} from '@aws-sdk/client-sqs';
import type { SQSEvent } from 'aws-lambda';
import {
    getAwsAccountId,
    getAwsClientConfig,
    getLocalAwsEndpoint,
    getAwsRegion,
    isDev,
} from '@lib/aws-client-config.lib';
import { invokeLocalFunction } from '@lib/serverless-local.lib';

export const sqsClient = new SQSClient(getAwsClientConfig(process.env.SQS_ENDPOINT));

export type QueueMessage = string | number | boolean | null | object;

export interface SendQueueMessageOptions {
    delaySeconds?: number;
    localHandler?: string;
    messageAttributes?: Record<string, MessageAttributeValue>;
    messageDeduplicationId?: string;
    messageGroupId?: string;
    skipLocalDispatch?: boolean;
}

const toMessageBody = <TMessage extends QueueMessage>(message: TMessage): string =>
    typeof message === 'string'
        ? message
        : JSON.stringify(message);

const trimTrailingSlash = (value: string): string =>
    value.replace(/\/+$/, '');

const getSqsEndpoint = (): string =>
    process.env.SQS_ENDPOINT ?? getLocalAwsEndpoint();

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

const createQueueEvent = (
    queueUrlOrName: string,
    body: string,
    response: SendMessageCommandOutput,
): SQSEvent => {
    const now = Date.now().toString();

    return {
        Records: [
            {
                messageId: response.MessageId ?? `local-sqs-${now}`,
                receiptHandle: 'local-receipt-handle',
                body,
                attributes: {
                    ApproximateReceiveCount: '1',
                    SentTimestamp: now,
                    SenderId: 'localstack',
                    ApproximateFirstReceiveTimestamp: now,
                },
                messageAttributes: {},
                md5OfBody: response.MD5OfMessageBody ?? '',
                eventSource: 'aws:sqs',
                eventSourceARN: getQueueArn(queueUrlOrName),
                awsRegion: getAwsRegion(),
            },
        ],
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

    console.info('locally dispatched sqs message', {
        handler,
        output,
        queue: getQueueName(queueUrlOrName),
    });
};

export const sendQueueMessage = async <TMessage extends QueueMessage>(
    queueUrlOrName: string,
    message: TMessage,
    options: SendQueueMessageOptions = {},
): Promise<SendMessageCommandOutput> => {
    const body = toMessageBody(message);
    const command = new SendMessageCommand({
        QueueUrl: getQueueUrl(queueUrlOrName),
        MessageBody: body,
        DelaySeconds: options.delaySeconds,
        MessageAttributes: options.messageAttributes,
        MessageDeduplicationId: options.messageDeduplicationId,
        MessageGroupId: options.messageGroupId,
    });

    const response = await sqsClient.send(command);
    await dispatchLocalQueueMessage(queueUrlOrName, body, response, options);

    return response;
};
