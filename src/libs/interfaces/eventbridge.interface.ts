import type { PutEventsRequestEntry } from '@aws-sdk/client-eventbridge';

export interface PutEventBridgeEventOptions {
    localHandler?: string;
    resources?: string[];
    skipLocalDispatch?: boolean;
    time?: Date;
    traceHeader?: string;
}

export interface PutEventBridgeEventsOptions {
    localHandler?: string;
    skipLocalDispatch?: boolean;
}

export interface EventBridgeJsonRequest<TPayload = unknown> {
    eventBus: string;
    source: string;
    detailType: string;
    payload: TPayload;
}

export type EventBridgeRequestEntry<TPayload = unknown> =
    Omit<PutEventsRequestEntry, 'Detail' | 'DetailType' | 'EventBusName' | 'Source'> & {
        detail: TPayload;
        detailType: string;
        eventBus: string;
        source: string;
    };
