import type { SQSRecord } from 'aws-lambda';

export interface QueueRecord<TMessage = unknown> {
    data: TMessage;
    messageId: string;
    rawRecord: SQSRecord;
}
