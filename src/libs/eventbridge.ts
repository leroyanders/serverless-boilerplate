import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
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
    hasServerlessConfig,
    invokeLocalFunctionInServiceRoot,
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

type LocalEventBridgeListener = {
    functionName: string;
    serviceName: string;
    serviceRoot: string;
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

const getRepoRoot = (serviceRoot: string): string => {
    const candidates = [
        process.env.INIT_CWD,
        path.resolve(serviceRoot, '../../..'),
        process.cwd(),
    ].filter((root): root is string => Boolean(root));

    return candidates.find((root) => existsSync(path.resolve(root, 'src/services')))
        ?? path.resolve(serviceRoot, '../../..');
};

const toServiceRoot = (repoRoot: string, serviceRoot: string): string =>
    path.isAbsolute(serviceRoot)
        ? serviceRoot
        : path.resolve(repoRoot, serviceRoot);

const getConfiguredEventBridgeServiceRoots = (
    currentServiceRoot: string,
    repoRoot: string,
): string[] =>
    (process.env.LOCAL_EVENTBRIDGE_SERVICE_ROOTS ?? '')
        .split(',')
        .map((serviceRoot) => serviceRoot.trim())
        .filter(Boolean)
        .map((serviceRoot) => toServiceRoot(repoRoot, serviceRoot))
        .filter((serviceRoot) => serviceRoot === currentServiceRoot || hasServerlessConfig(serviceRoot));

const discoverEventBridgeServiceRoots = (
    currentServiceRoot: string,
    repoRoot: string,
): string[] => {
    const servicesRoot = path.resolve(repoRoot, 'src/services');

    if (!existsSync(servicesRoot)) {
        return [currentServiceRoot];
    }

    const discoveredServiceRoots = readdirSync(servicesRoot, {
        withFileTypes: true,
    })
        .filter((entry) => entry.isDirectory())
        .map((entry) => path.resolve(servicesRoot, entry.name))
        .filter(hasServerlessConfig);

    return [currentServiceRoot, ...discoveredServiceRoots];
};

const getLocalEventBridgeServiceRoots = (currentServiceRoot: string): string[] => {
    const repoRoot = getRepoRoot(currentServiceRoot);
    const configuredServiceRoots = getConfiguredEventBridgeServiceRoots(currentServiceRoot, repoRoot);
    const serviceRoots = configuredServiceRoots.length
        ? [currentServiceRoot, ...configuredServiceRoots]
        : discoverEventBridgeServiceRoots(currentServiceRoot, repoRoot);

    return Array.from(new Set(serviceRoots));
};

const getLocalEventBridgeListeners = async (
    eventBusName: string,
    source: string,
    detailType: string,
    localHandler?: string,
): Promise<LocalEventBridgeListener[]> => {
    const handlers = getLocalHandlerMap();
    const busName = getEventBridgeName(eventBusName);
    const currentServiceRoot = getServiceRoot();
    const currentServiceName = path.basename(currentServiceRoot);
    const mappedListeners = [
        ...(localHandler ? [localHandler] : []),
        ...(handlers[`${busName}:${source}:${detailType}`] ?? []),
        ...(handlers[`${source}:${detailType}`] ?? []),
        ...(handlers[detailType] ?? []),
    ].map((functionName): LocalEventBridgeListener => ({
        functionName,
        serviceName: currentServiceName,
        serviceRoot: currentServiceRoot,
    }));
    const serviceRoots = getLocalEventBridgeServiceRoots(currentServiceRoot);
    const discoveredListenerGroups = await Promise.all(serviceRoots.map(async (serviceRoot) => {
        const config = await getLocalServerlessConfig(serviceRoot);
        const serviceName = config.service ?? path.basename(serviceRoot);

        return Object.entries(config.functions ?? {})
            .filter(([, functionConfig]) =>
                (functionConfig.events ?? []).some((event): boolean => {
                    const localEvent = event as LocalFunctionEvent;
                    const eventBridge = localEvent.eventBridge;

                    return eventBridge
                        ? eventBridgeConfigMatches(eventBridge, eventBusName, source, detailType)
                        : false;
                }))
            .map(([functionName]): LocalEventBridgeListener => ({
                functionName,
                serviceName,
                serviceRoot,
            }));
    }));
    const discoveredListeners = discoveredListenerGroups.reduce<LocalEventBridgeListener[]>(
        (result, listeners) => result.concat(listeners),
        [],
    );
    const uniqueListeners = new Map<string, LocalEventBridgeListener>();

    for (const listener of [...mappedListeners, ...discoveredListeners]) {
        uniqueListeners.set(`${listener.serviceRoot}:${listener.functionName}`, listener);
    }

    return Array.from(uniqueListeners.values());
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

    for (const listener of handlers) {
        const output = await invokeLocalFunctionInServiceRoot(
            listener.functionName,
            event,
            listener.serviceRoot,
        );

        log.info('locally dispatched eventbridge event', {
            detailType,
            eventBus: getEventBridgeName(eventBus),
            handler: listener.functionName,
            output,
            service: listener.serviceName,
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
