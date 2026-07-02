import type { SNSEventRecord } from 'aws-lambda';

export interface TopicRecord<TMessage = unknown> {
    data: TMessage;
    messageId: string;
    rawRecord: SNSEventRecord;
    subject?: string;
    topicArn: string;
}
