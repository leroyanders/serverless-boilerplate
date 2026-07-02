import type { SendQueueMessageOptions } from '@lib/interfaces/sqs.interface';

export type QueueMessage = string | number | boolean | null | object;

export type QueueEventMessage<TEvent> = {
    data: TEvent;
    name: string;
    source: string;
};

export type PublishQueueEventsOptions = SendQueueMessageOptions;

export type SendQueueJsonRequest<TPayload extends QueueMessage = QueueMessage> = {
    payload: TPayload;
    queue: string;
};
