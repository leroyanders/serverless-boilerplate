import type { EventBridgeDetail } from '@lib/types/eventbridge.type';

export interface PublishEbhTestResponse {
    eventBus: string;
    eventId?: string;
    eventIds: string[];
    detailType: string;
    payload: EventBridgeDetail;
    source: string;
}
