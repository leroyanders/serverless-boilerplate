import { snsHandler } from '@lib/sns-handler';
import type { HandledTopicRecord } from '../../../interfaces/handled-topic-record.interface';
import type { UserTopicEvent } from '../../../interfaces/user-topic-event.interface';

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
