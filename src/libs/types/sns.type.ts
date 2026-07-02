import type { PublishTopicMessageOptions } from '@lib/interfaces/sns.interface';

export type TopicMessage = string | number | boolean | null | object;

export type TopicEventMessage<TEvent> = {
    data: TEvent;
    name: string;
    source: string;
};

export type PublishTopicEventsOptions = PublishTopicMessageOptions;

export type PublishTopicJsonRequest<TPayload extends TopicMessage = TopicMessage> = {
    payload: TPayload;
    topic: string;
};
