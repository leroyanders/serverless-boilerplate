import { sqsHandler } from '@lib/sqs-handler.lib';

interface UserQueueEvent {
    event: string;
    message: string;
}

export const handler = sqsHandler<UserQueueEvent>(({ data, messageId }) => {
    console.info('received sqs message', {
        body: data,
        messageId,
    });
});
