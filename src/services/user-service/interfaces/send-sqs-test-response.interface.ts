import type { QueueMessage } from '@lib/types/sqs.type';

export interface SendSqsTestResponse {
    messageId?: string;
    messageIds: string[];
    queue: string;
    payload: QueueMessage;
}
