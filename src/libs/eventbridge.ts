import {
    EventBridgeClient,
    PutEventsCommand,
    PutEventsCommandOutput,
    PutEventsRequestEntry,
} from '@aws-sdk/client-eventbridge';
import type { EventBridgeEvent } from 'aws-lambda';
import {
    getAwsAccountId,
    getAwsClientConfig,
    getAwsRegion,
    isDev,
} from '@lib/aws-client-config';
import {
    assertLocalHasIamPermission,
    getServiceRoot,
    getLocalServerlessConfig,
    invokeLocalFunction,
} from '@lib/serverless-local';
import log from '@lib/logger';
import type {
    EventBridgeRequestEntry,
    PutEventBridgeEventOptions,
    PutEventBridgeEventsOptions,
} from '@lib/interfaces/eventbridge.interface';
import type {
    EventBridgeDetail,
    EventBridgeEventMessage,
} from '@lib/types/eventbridge.type';
import { IamAction } from '@lib/types/sls.type';

export const eventBridgeClient = new EventBridgeClient(
    getAwsClientConfig(process.env.EVENTBRIDGE_ENDPOINT),
);

export type {
    EventBridgeJsonRequest,
    EventBridgeRequestEntry,
    PutEventBridgeEventOptions,
    PutEventBridgeEventsOptions,
} from '@lib/interfaces/eventbridge.interface';
export type {
    EventBridgeDetail,
    EventBridgeEventMessage,
} from '@lib/types/eventbridge.type';

const isDryRun = (): boolean =>
    ['1', 'true'].includes((process.env.DRY_RUN ?? '').toLowerCase());

export const getEventBridgeArn = (eventBusName: string): string => {
    if (eventBusName.startsWith('arn:')) {
        return eventBusName;
    }

    return `arn:aws:events:${getAwsRegion()}:${getAwsAccountId()}:event-bus/${eventBusName}`;
};

const getEventBridgeName = (eventBusNameOrArn: string): string =>
    eventBusNameOrArn.startsWith('arn:')
        ? eventBusNameOrArn.split('/').pop() ?? eventBusNameOrArn
        : eventBusNameOrArn;

type LocalEventBridgeConfig = {
    eventBus?: string;
    pattern?: {
        'detail-type'?: unknown;
        source?: unknown;
    };
};

type LocalFunctionEvent = {
    eventBridge?: LocalEventBridgeConfig;
};

const getLocalHandlerMap = (): Record<string, string[]> =>
    (process.env.LOCAL_EVENTBRIDGE_EVENT_HANDLERS ?? '')
        .split(',')
        .map((entry) => entry.trim())
        .filter(Boolean)
        .reduce<Record<string, string[]>>((result, entry) => {
            const [eventKey, handler] = entry.split('=');

            if (eventKey && handler) {
                const key = eventKey.trim();
                const handlers = result[key] ?? [];

                handlers.push(handler.trim());
                result[key] = handlers;
            }

            return result;
        }, {});

const toStringArray = (value: unknown): string[] => {
    if (value === undefined) {
        return [];
    }

    const values = Array.isArray(value)
        ? value
        : [value];

    return values.filter((item): item is string => typeof item === 'string');
};

const eventPatternMatchesValue = (
    pattern: unknown,
    value: string,
): boolean => {
    const values = toStringArray(pattern);

    return values.length === 0 || values.includes(value);
};

const eventBridgeConfigMatches = (
    config: LocalEventBridgeConfig,
    eventBusName: string,
    source: string,
    detailType: string,
): boolean => {
    const configEventBus = config.eventBus;

    return (!configEventBus || getEventBridgeName(configEventBus) === getEventBridgeName(eventBusName))
        && eventPatternMatchesValue(config.pattern?.source, source)
        && eventPatternMatchesValue(config.pattern?.['detail-type'], detailType);
};

const getLocalEventBridgeListeners = async (
    eventBusName: string,
    source: string,
    detailType: string,
    localHandler?: string,
): Promise<string[]> => {
    const handlers = getLocalHandlerMap();
    const busName = getEventBridgeName(eventBusName);
    const mappedHandlers = [
        ...(handlers[`${busName}:${source}:${detailType}`] ?? []),
        ...(handlers[`${source}:${detailType}`] ?? []),
        ...(handlers[detailType] ?? []),
    ];
    const config = await getLocalServerlessConfig(getServiceRoot());
    const discoveredHandlers = Object.entries(config.functions ?? {})
        .filter(([, functionConfig]) =>
            (functionConfig.events ?? []).some((event): boolean => {
                const localEvent = event as LocalFunctionEvent;
                const eventBridge = localEvent.eventBridge;

                return eventBridge
                    ? eventBridgeConfigMatches(eventBridge, eventBusName, source, detailType)
                    : false;
            }))
        .map(([functionName]) => functionName);

    return Array.from(new Set([
        ...(localHandler ? [localHandler] : []),
        ...mappedHandlers,
        ...discoveredHandlers,
    ]));
};

const assertLocalCanPutEvents = async (eventBusName: string): Promise<void> => {
    if (!isDev) {
        return;
    }

    await assertLocalHasIamPermission(
        IamAction.EVENTBRIDGE_PUT_EVENTS,
        getEventBridgeArn(eventBusName),
    );
};

const toEventDetail = <TDetail extends EventBridgeDetail>(detail: TDetail): string =>
    JSON.stringify(detail);

const parseEventDetail = <TDetail = unknown>(detail: string): TDetail => {
    try {
        return JSON.parse(detail) as TDetail;
    } catch {
        return detail as TDetail;
    }
};

const createLocalEvent = <TDetailType extends string, TDetail>(
    eventBusName: string,
    source: string,
    detailType: TDetailType,
    detail: TDetail,
    eventId?: string,
    options: PutEventBridgeEventOptions = {},
): EventBridgeEvent<TDetailType, TDetail> => ({
    account: getAwsAccountId(),
    detail,
    'detail-type': detailType,
    id: eventId ?? `local-eventbridge-${Date.now()}`,
    region: getAwsRegion(),
    resources: options.resources ?? [getEventBridgeArn(eventBusName)],
    source,
    time: (options.time ?? new Date()).toISOString(),
    version: '0',
});

const createLocalPutEventsResponse = (
    entries: PutEventsRequestEntry[],
): PutEventsCommandOutput => ({
    $metadata: {
        attempts: 1,
        httpStatusCode: 200,
        requestId: `local-eventbridge-${Date.now()}`,
        totalRetryDelay: 0,
    },
    Entries: entries.map((entry, index) => ({
        EventId: `local-eventbridge-${index}-${Date.now()}`,
    })),
    FailedEntryCount: 0,
});

const dispatchLocalEventBridgeEvent = async (
    entry: PutEventsRequestEntry,
    eventId: string | undefined,
    options: PutEventBridgeEventOptions,
): Promise<void> => {
    if (!isDev || options.skipLocalDispatch) {
        return;
    }

    const eventBus = entry.EventBusName;
    const source = entry.Source;
    const detailType = entry.DetailType;

    if (!eventBus || !source || !detailType || !entry.Detail) {
        return;
    }

    const handlers = await getLocalEventBridgeListeners(
        eventBus,
        source,
        detailType,
        options.localHandler,
    );

    if (handlers.length === 0) {
        return;
    }

    const event = createLocalEvent(
        eventBus,
        source,
        detailType,
        parseEventDetail(entry.Detail),
        eventId,
        options,
    );

    for (const handler of handlers) {
        const output = await invokeLocalFunction(handler, event);

        log.info('locally dispatched eventbridge event', {
            detailType,
            eventBus: getEventBridgeName(eventBus),
            handler,
            output,
            source,
        });
    }
};

const dispatchLocalEventBridgeEvents = async (
    entries: PutEventsRequestEntry[],
    response: PutEventsCommandOutput,
    options: PutEventBridgeEventsOptions,
): Promise<void> => {
    for (let index = 0; index < entries.length; index += 1) {
        const result = response.Entries?.[index];

        if (result?.ErrorCode) {
            continue;
        }

        await dispatchLocalEventBridgeEvent(entries[index], result?.EventId, options);
    }
};

const sendPutEvents = async (
    entries: PutEventsRequestEntry[],
): Promise<PutEventsCommandOutput> => {
    if (isDev) {
        return createLocalPutEventsResponse(entries);
    }

    return eventBridgeClient.send(new PutEventsCommand({
        Entries: entries,
    }));
};

export const putEventBridgeEvent = async <TDetail extends EventBridgeDetail>(
    eventBus: string,
    source: string,
    detailType: string,
    detail: TDetail,
    options: PutEventBridgeEventOptions = {},
): Promise<PutEventsCommandOutput | undefined> => {
    const entry: PutEventsRequestEntry = {
        Detail: toEventDetail(detail),
        DetailType: detailType,
        EventBusName: eventBus,
        Resources: options.resources,
        Source: source,
        Time: options.time,
        TraceHeader: options.traceHeader,
    };

    log.debug('put eventbridge event', {
        detailType,
        eventBus: getEventBridgeName(eventBus),
        source,
    });

    if (isDryRun()) {
        return undefined;
    }

    await assertLocalCanPutEvents(eventBus);

    const response = await sendPutEvents([entry]);
    await dispatchLocalEventBridgeEvents([entry], response, options);

    return response;
};

export const putEventBridgeEvents = async <TDetail extends EventBridgeDetail>(
    events: EventBridgeRequestEntry<TDetail>[],
    options: PutEventBridgeEventsOptions = {},
): Promise<PutEventsCommandOutput | undefined> => {
    const entries = events.map((event): PutEventsRequestEntry => ({
        Detail: toEventDetail(event.detail),
        DetailType: event.detailType,
        EventBusName: event.eventBus,
        Resources: event.Resources,
        Source: event.source,
        Time: event.Time,
        TraceHeader: event.TraceHeader,
    }));

    if (isDryRun()) {
        return undefined;
    }

    for (const event of events) {
        await assertLocalCanPutEvents(event.eventBus);
    }

    const response = await sendPutEvents(entries);
    await dispatchLocalEventBridgeEvents(entries, response, options);

    return response;
};

export const publishEventBridgeEvents = async <TDetail extends EventBridgeDetail>(
    eventBus: string,
    source: string,
    name: string,
    data: TDetail[],
    options: PutEventBridgeEventsOptions = {},
): Promise<PutEventsCommandOutput | undefined> =>
    putEventBridgeEvents(
        data.map((event) => ({
            detail: {
                data: event,
                name,
                source,
            } satisfies EventBridgeEventMessage<TDetail>,
            detailType: name,
            eventBus,
            source,
        })),
        options,
    );

export const getEventBridge = (eventBus: string) => ({
    publish: <TDetail extends EventBridgeDetail>(
        source: string,
        detailType: string,
        detail: TDetail,
        options: PutEventBridgeEventOptions = {},
    ): Promise<PutEventsCommandOutput | undefined> =>
        putEventBridgeEvent(eventBus, source, detailType, detail, options),

    publishEvents: <TDetail extends EventBridgeDetail>(
        source: string,
        name: string,
        data: TDetail[],
        options: PutEventBridgeEventsOptions = {},
    ): Promise<PutEventsCommandOutput | undefined> =>
        publishEventBridgeEvents(eventBus, source, name, data, options),
});
