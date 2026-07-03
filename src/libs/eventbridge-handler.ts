import type {
    Context,
    EventBridgeEvent,
} from 'aws-lambda';
import log, { logBeforeTimeout } from '@lib/logger';
import type { EventBridgeHandler } from '@lib/types/eventbridge-handler.type';

export type { EventBridgeRecord } from '@lib/interfaces/eventbridge-handler.interface';
export type { EventBridgeHandler } from '@lib/types/eventbridge-handler.type';

export const eventBridgeHandler =
    <TDetailType extends string = string, TDetail = unknown, TResult = void>(
        handler: EventBridgeHandler<TDetailType, TDetail, TResult>,
    ) =>
        async (event: EventBridgeEvent<TDetailType, TDetail>, context: Context): Promise<TResult> => {
            const cleanup = logBeforeTimeout(event, context);

            try {
                return await handler({
                    data: event.detail,
                    detailType: event['detail-type'],
                    eventId: event.id,
                    rawEvent: event,
                    source: event.source,
                });
            } catch (error) {
                log.error('failed to process eventbridge event', {
                    detailType: event['detail-type'],
                    error,
                    eventId: event.id,
                    source: event.source,
                });

                throw error;
            } finally {
                cleanup();
            }
        };
