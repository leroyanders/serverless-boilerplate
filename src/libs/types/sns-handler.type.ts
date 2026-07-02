import type { TopicRecord } from '@lib/interfaces/sns-handler.interface';

export type TopicHandler<TMessage = unknown, TResult = void> = (
    record: TopicRecord<TMessage>,
) => Promise<TResult> | TResult;
