import type {
    SNSEvent,
    SNSEventRecord,
} from 'aws-lambda';

interface TopicRecord<TMessage = unknown> {
    data: TMessage;
    messageId: string;
    rawRecord: SNSEventRecord;
    subject?: string;
    topicArn: string;
}

type TopicHandler<TMessage = unknown, TResult = void> = (
    record: TopicRecord<TMessage>,
) => Promise<TResult> | TResult;

const parseTopicMessage = <TMessage = unknown>(message: string): TMessage => {
    try {
        return JSON.parse(message) as TMessage;
    } catch {
        return message as TMessage;
    }
};

export const snsHandler =
    <TMessage = unknown, TResult = void>(handler: TopicHandler<TMessage, TResult>) =>
        async (event: SNSEvent): Promise<TResult[]> =>
            Promise.all(event.Records.map((record) =>
                handler({
                    data: parseTopicMessage<TMessage>(record.Sns.Message),
                    messageId: record.Sns.MessageId,
                    rawRecord: record,
                    subject: record.Sns.Subject,
                    topicArn: record.Sns.TopicArn,
                }),
            ));
