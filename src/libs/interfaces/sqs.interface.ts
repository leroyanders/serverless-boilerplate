import type { MessageAttributeValue } from '@aws-sdk/client-sqs';

export interface SendQueueMessageOptions {
    delaySeconds?: number;
    localHandler?: string;
    messageAttributes?: Record<string, MessageAttributeValue>;
    messageDeduplicationId?: string;
    messageGroupId?: string;
    skipLocalDispatch?: boolean;
}
