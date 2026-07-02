import { snsHandler } from '@lib/sns-handler.lib';

interface HandledTopicRecord {
    message: unknown;
    messageId: string;
    subject?: string;
    topicArn: string;
}

interface UserTopicEvent {
    event: string;
    message: string;
}

export const handler = snsHandler<UserTopicEvent, HandledTopicRecord>(({ data, messageId, subject, topicArn }) => {
    console.info('received sns message', {
        message: data,
        messageId,
        subject,
        topicArn,
    });

    const record: HandledTopicRecord = {
        message: data,
        messageId,
        subject,
        topicArn,
    };

    return record;
});
