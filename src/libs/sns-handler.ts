import type {
    SNSEvent,
} from 'aws-lambda';
import type { TopicHandler } from '@lib/types/sns-handler.type';

export type { TopicRecord } from '@lib/interfaces/sns-handler.interface';
export type { TopicHandler } from '@lib/types/sns-handler.type';

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
