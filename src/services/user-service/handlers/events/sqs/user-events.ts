import { sqsHandler } from '@lib/sqs-handler';
import type { UserQueueEvent } from '../../../interfaces/user-queue-event.interface';

export const handler = sqsHandler<UserQueueEvent>(({ data, messageId }) => {
    console.info('received sqs message', {
        body: data,
        messageId,
    });
});
