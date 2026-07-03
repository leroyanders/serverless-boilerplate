import log from '@lib/logger';
import { sqsHandler } from '@lib/sqs-handler';
import type { UserQueueEvent } from '../../../interfaces/user-queue-event.interface';

export const handler = sqsHandler<UserQueueEvent>(({ data, messageId }) => {
    log.info('received sqs message', {
        body: data,
        messageId,
    });
});
