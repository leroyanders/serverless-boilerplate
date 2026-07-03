export type EventBridgeDetail = string | number | boolean | null | object;

export type EventBridgeEventMessage<TPayload = unknown> = {
    data: TPayload;
    name: string;
    source: string;
};
