import type {
    SQSBatchResponse,
    SQSEvent,
    SQSRecord,
} from 'aws-lambda';

interface QueueRecord<TMessage = unknown> {
    data: TMessage;
    messageId: string;
    rawRecord: SQSRecord;
}

type QueueHandler<TMessage = unknown> = (
    record: QueueRecord<TMessage>,
) => Promise<void> | void;

const parseQueueMessage = <TMessage = unknown>(body: string): TMessage => {
    try {
        return JSON.parse(body) as TMessage;
    } catch {
        return body as TMessage;
    }
};

export const sqsHandler =
    <TMessage = unknown>(handler: QueueHandler<TMessage>) =>
        async (event: SQSEvent): Promise<SQSBatchResponse> => {
            const batchItemFailures: SQSBatchResponse['batchItemFailures'] = [];

            for (const record of event.Records) {
                try {
                    await handler({
                        data: parseQueueMessage<TMessage>(record.body),
                        messageId: record.messageId,
                        rawRecord: record,
                    });
                } catch (error) {
                    console.error('failed to process sqs message', {
                        error,
                        messageId: record.messageId,
                    });

                    batchItemFailures.push({
                        itemIdentifier: record.messageId,
                    });
                }
            }

            return {
                batchItemFailures,
            };
        };
