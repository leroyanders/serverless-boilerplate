import log from '@lib/logger';
import { eventBridgeHandler } from '@lib/eventbridge-handler';
import { invokeCalculate } from '../../../../calculate-service/handlers/invokers/calculate.invoker';
import {
    USER_EVENTS_EVENT_DETAIL_TYPE,
} from '../../../__sls/const';
import type { HandledEventBridgeRecord } from '../../../interfaces/handled-eventbridge-record.interface';
import type { UserEventBridgeEvent } from '../../../interfaces/user-eventbridge-event.interface';

const LISTENER = 'user-events-audit';
const DEFAULT_CALCULATION = {
    a: 10,
    b: 20,
};

export const handler = eventBridgeHandler<
    typeof USER_EVENTS_EVENT_DETAIL_TYPE,
    UserEventBridgeEvent,
    HandledEventBridgeRecord
>(async ({ data, detailType, eventId, source }) => {
    const calculation = await invokeCalculate(data.calculation ?? DEFAULT_CALCULATION);
    const result = {
        calculation,
        detailType,
        eventId,
        listener: LISTENER,
        source,
    };

    log.info('received eventbridge audit event', {
        ...result,
        message: data,
    });

    return result;
});
