import type { TopicMessage } from '@lib/types/sns.type';

export interface PublishSnsTestResponse {
    messageId?: string;
    messageIds: string[];
    topic: string;
    payload: TopicMessage;
}
