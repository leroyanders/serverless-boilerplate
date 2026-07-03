import {
    USER_EVENTS_EVENT_BUS_DEFAULT,
    USER_EVENTS_EVENT_BUS_RESOURCE,
} from './const';
import * as SLS from '../../../sls.defaults';

export const USER_EVENTS_EVENT_BUS = process.env.USER_EVENTS_EVENT_BUS_NAME ?? USER_EVENTS_EVENT_BUS_DEFAULT;

export const userEventsEventBus = SLS.eventBridge({
    name: USER_EVENTS_EVENT_BUS,
    resourceName: USER_EVENTS_EVENT_BUS_RESOURCE,
});
