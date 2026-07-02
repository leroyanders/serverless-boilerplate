import type { QueueRecord } from '@lib/interfaces/sqs-handler.interface';

export type QueueHandler<TMessage = unknown> = (
    record: QueueRecord<TMessage>,
) => Promise<void> | void;
