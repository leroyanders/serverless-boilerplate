import type { EventBridgeRecord } from '@lib/interfaces/eventbridge-handler.interface';

export type EventBridgeHandler<
    TDetailType extends string = string,
    TDetail = unknown,
    TResult = void,
> = (record: EventBridgeRecord<TDetailType, TDetail>) => TResult | Promise<TResult>;
