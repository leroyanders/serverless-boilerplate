import type { MessageAttributeValue } from '@aws-sdk/client-sns';

export interface PublishTopicMessageOptions {
    localHandler?: string;
    messageAttributes?: Record<string, MessageAttributeValue>;
    messageDeduplicationId?: string;
    messageGroupId?: string;
    skipLocalDispatch?: boolean;
    subject?: string;
}
