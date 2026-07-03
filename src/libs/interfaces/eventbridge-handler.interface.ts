import type { EventBridgeEvent } from 'aws-lambda';

export interface EventBridgeRecord<TDetailType extends string = string, TDetail = unknown> {
    data: TDetail;
    detailType: TDetailType;
    eventId: string;
    rawEvent: EventBridgeEvent<TDetailType, TDetail>;
    source: string;
}
