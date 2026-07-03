import log from '@lib/logger';
import { eventBridgeHandler } from '@lib/eventbridge-handler';
import {
    USER_EVENTS_EVENT_DETAIL_TYPE,
} from '../../../__sls/const';
import type { UserEventBridgeEvent } from '../../../interfaces/user-eventbridge-event.interface';

export const handler = eventBridgeHandler<
    typeof USER_EVENTS_EVENT_DETAIL_TYPE,
    UserEventBridgeEvent
>(({ data, detailType, eventId, source }) => {
    log.info('received eventbridge event', {
        detailType,
        eventId,
        message: data,
        source,
    });
});
