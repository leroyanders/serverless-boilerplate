export interface HandledTopicRecord {
    message: unknown;
    messageId: string;
    subject?: string;
    topicArn: string;
}
